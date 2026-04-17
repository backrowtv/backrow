"use server";

import { createClient } from "@/lib/supabase/server";
import { invalidateClub } from "@/lib/cache/invalidate";
import { handleActionError } from "@/lib/errors/handler";
import { cacheMovie } from "../movies";
import { createNotificationsForUsers } from "../notifications";
import { logMemberActivity, logClubActivity } from "@/lib/activity/logger";
import { isEndlessFestivalClub } from "./data";

/**
 * Add a movie to the pool (for voting)
 * Works for ALL clubs - uses club_movie_pool table
 * For endless clubs, also creates a nomination when moved to playing
 */
export async function addMovieToPool(
  clubId: string,
  tmdbId: number,
  curatorNote?: string
): Promise<{ success: boolean; poolItemId?: string } | { error: string }> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { error: "Not authenticated" };
  }

  // Check membership
  const { data: membership } = await supabase
    .from("club_members")
    .select("role")
    .eq("club_id", clubId)
    .eq("user_id", user.id)
    .single();

  if (!membership) {
    return { error: "You must be a club member to add movies" };
  }

  try {
    // Cache the movie first
    const cacheResult = await cacheMovie(tmdbId);
    if ("error" in cacheResult) {
      return { error: `Failed to fetch movie: ${cacheResult.error}` };
    }

    // Check if movie already exists in this club's pool (including soft-deleted)
    const { data: existingPool } = await supabase
      .from("club_movie_pool")
      .select("id, deleted_at")
      .eq("club_id", clubId)
      .eq("tmdb_id", tmdbId)
      .maybeSingle();

    if (existingPool) {
      // If it's soft-deleted, restore it instead of creating a new entry
      if (existingPool.deleted_at) {
        const { error: restoreError } = await supabase
          .from("club_movie_pool")
          .update({
            deleted_at: null,
            user_id: user.id,
            pitch: curatorNote || null,
            created_at: new Date().toISOString(),
          })
          .eq("id", existingPool.id);

        if (restoreError) {
          return handleActionError(restoreError, "addMovieToPool");
        }

        // Get movie data for activity log
        const { data: movie } = await supabase
          .from("movies")
          .select("title, poster_url")
          .eq("tmdb_id", tmdbId)
          .single();

        // Log member activity (private to user)
        if (movie) {
          await logMemberActivity(
            user.id,
            "user_movie_pool_added",
            {
              movie_title: movie.title,
              tmdb_id: tmdbId,
              poster_url: movie.poster_url,
            },
            clubId
          );
        }

        // Notify all club members about the new movie in the pool
        const { data: members } = await supabase
          .from("club_members")
          .select("user_id")
          .eq("club_id", clubId)
          .neq("user_id", user.id);

        if (members && members.length > 0) {
          const { data: club } = await supabase
            .from("clubs")
            .select("slug")
            .eq("id", clubId)
            .single();

          await createNotificationsForUsers({
            userIds: members.map((m) => m.user_id),
            type: "endless_movie_added",
            title: "Movie Added to Pool",
            message: `A new movie has been added to the pool!`,
            link: `/club/${club?.slug || clubId}`,
            clubId: clubId,
          });
        }

        invalidateClub(clubId);
        return { success: true, poolItemId: existingPool.id };
      }

      return { error: "This movie is already in the pool" };
    }

    // For endless clubs, also check if it's already in the festival (playing/completed)
    const isEndless = await isEndlessFestivalClub(clubId);
    if (isEndless) {
      const { data: festival } = await supabase
        .from("festivals")
        .select("id")
        .eq("club_id", clubId)
        .eq("status", "watching")
        .maybeSingle();

      if (festival) {
        const { data: existingNom } = await supabase
          .from("nominations")
          .select("id, endless_status")
          .eq("festival_id", festival.id)
          .eq("tmdb_id", tmdbId)
          .is("deleted_at", null)
          .maybeSingle();

        if (existingNom) {
          return { error: "This movie is already in the festival" };
        }
      }
    }

    // Add to club_movie_pool table (works for ALL clubs)
    const { data: poolItem, error } = await supabase
      .from("club_movie_pool")
      .insert({
        club_id: clubId,
        user_id: user.id,
        tmdb_id: tmdbId,
        pitch: curatorNote || null,
      })
      .select("id")
      .single();

    if (error || !poolItem) {
      return handleActionError(error, "addMovieToPool");
    }

    // Get movie data for activity log
    const { data: movie } = await supabase
      .from("movies")
      .select("title, poster_url")
      .eq("tmdb_id", tmdbId)
      .single();

    // Log member activity (private to user)
    if (movie) {
      await logMemberActivity(
        user.id,
        "user_movie_pool_added",
        {
          movie_title: movie.title,
          tmdb_id: tmdbId,
          poster_url: movie.poster_url,
        },
        clubId
      );
    }

    // Notify all club members about the new movie in the pool
    const { data: members } = await supabase
      .from("club_members")
      .select("user_id")
      .eq("club_id", clubId)
      .neq("user_id", user.id);

    if (members && members.length > 0) {
      const { data: club } = await supabase.from("clubs").select("slug").eq("id", clubId).single();

      await createNotificationsForUsers({
        userIds: members.map((m) => m.user_id),
        type: "endless_movie_added",
        title: "Movie Added to Pool",
        message: `A new movie has been added to the pool!`,
        link: `/club/${club?.slug || clubId}`,
        clubId: clubId,
      });
    }

    invalidateClub(clubId);
    return { success: true, poolItemId: poolItem.id };
  } catch (error) {
    return handleActionError(error, "addMovieToPool");
  }
}

/**
 * Remove a movie from the pool
 * Works with club_movie_pool table for ALL clubs
 */
export async function removeFromPool(
  poolItemId: string
): Promise<{ success: boolean } | { error: string }> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { error: "Not authenticated" };
  }

  // Get the pool item
  const { data: poolItem } = await supabase
    .from("club_movie_pool")
    .select(
      `
      id,
      user_id,
      club_id,
      tmdb_id,
      movie:movies!inner(title, poster_url)
    `
    )
    .eq("id", poolItemId)
    .is("deleted_at", null)
    .single();

  if (!poolItem) {
    return { error: "Pool item not found" };
  }

  // Check if user is admin or the one who added it
  const { data: membership } = await supabase
    .from("club_members")
    .select("role")
    .eq("club_id", poolItem.club_id)
    .eq("user_id", user.id)
    .single();

  const isAdmin = membership && ["producer", "director"].includes(membership.role);
  const isOwner = poolItem.user_id === user.id;

  if (!isAdmin && !isOwner) {
    return { error: "You can only remove your own pool items" };
  }

  // Soft delete the pool item
  const { error } = await supabase
    .from("club_movie_pool")
    .update({ deleted_at: new Date().toISOString() })
    .eq("id", poolItemId);

  if (error) {
    return { error: "Failed to remove movie from pool" };
  }

  // Log member activity (private to user)
  const movie = Array.isArray(poolItem.movie) ? poolItem.movie[0] : poolItem.movie;
  if (movie) {
    await logMemberActivity(
      user.id,
      "user_movie_pool_removed",
      {
        movie_title: movie.title,
        tmdb_id: poolItem.tmdb_id,
        poster_url: movie.poster_url,
      },
      poolItem.club_id
    );
  }

  invalidateClub(poolItem.club_id);
  return { success: true };
}

/**
 * Delete a movie from endless festival completely (any status)
 * Admins can delete any movie, users can only delete their own pool nominations
 * This removes the movie entirely - no discussion thread, no history
 */
export async function deleteFromEndlessFestival(
  nominationId: string
): Promise<{ success: boolean } | { error: string }> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { error: "Not authenticated" };
  }

  // Get the nomination with all details
  const { data: nomination } = await supabase
    .from("nominations")
    .select(
      `
      id,
      user_id,
      tmdb_id,
      endless_status,
      festival:festivals!inner(
        id,
        club_id
      ),
      movie:movies!inner(title)
    `
    )
    .eq("id", nominationId)
    .is("deleted_at", null)
    .single();

  if (!nomination) {
    return { error: "Movie not found" };
  }

  const festival = Array.isArray(nomination.festival)
    ? nomination.festival[0]
    : nomination.festival;

  // Check membership and role
  const { data: membership } = await supabase
    .from("club_members")
    .select("role")
    .eq("club_id", festival.club_id)
    .eq("user_id", user.id)
    .single();

  if (!membership) {
    return { error: "You must be a club member" };
  }

  const isAdmin = ["producer", "director"].includes(membership.role);
  const isOwner = nomination.user_id === user.id;
  const isPoolItem = nomination.endless_status === "pool";

  // Permission check:
  // - Admins can delete any movie
  // - Regular users can only delete their own pool nominations
  if (!isAdmin && !(isOwner && isPoolItem)) {
    return { error: "Only admins can delete playing or completed movies" };
  }

  // Soft delete the nomination
  const { error } = await supabase
    .from("nominations")
    .update({ deleted_at: new Date().toISOString() })
    .eq("id", nominationId);

  if (error) {
    return { error: "Failed to delete movie" };
  }

  // Log activity for non-pool movies (playing/completed)
  if (nomination.endless_status !== "pool") {
    const movie = Array.isArray(nomination.movie) ? nomination.movie[0] : nomination.movie;

    await logClubActivity(festival.club_id, "endless_movie_cancelled", {
      tmdb_id: nomination.tmdb_id,
      movie_title: movie?.title,
    });
  }

  invalidateClub(festival.club_id);

  return { success: true };
}
