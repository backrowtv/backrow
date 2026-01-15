"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { handleActionError } from "@/lib/errors/handler";
import { cacheMovie } from "../movies";
import { createNotificationsForUsers } from "../notifications";
import { logClubActivity } from "@/lib/activity/logger";
import { getOrCreateEndlessFestival } from "./helpers";
import { createPlayingMovieThread } from "../discussions/auto";
import { isEndlessFestivalClub } from "./data";
import type { DisplaySlot } from "./types";

/**
 * Add a movie directly to "Now Showing" (admin only)
 */
export async function addMovieToPlaying(
  clubId: string,
  tmdbId: number,
  curatorNote?: string,
  displaySlot?: DisplaySlot
): Promise<{ success: boolean; nominationId?: string; threadId?: string } | { error: string }> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { error: "Not authenticated" };
  }

  // Check admin status
  const { data: membership } = await supabase
    .from("club_members")
    .select("role")
    .eq("club_id", clubId)
    .eq("user_id", user.id)
    .single();

  if (!membership || !["producer", "director"].includes(membership.role)) {
    return { error: "Only admins can add movies directly to Now Showing" };
  }

  try {
    const festivalResult = await getOrCreateEndlessFestival(clubId, user.id);
    if (typeof festivalResult === "object" && "error" in festivalResult) {
      return { error: festivalResult.error };
    }
    const festivalId = festivalResult;

    // Cache the movie
    const cacheResult = await cacheMovie(tmdbId);
    if ("error" in cacheResult) {
      return { error: `Failed to fetch movie: ${cacheResult.error}` };
    }

    // Get movie details
    const { data: movie } = await supabase
      .from("movies")
      .select("title, year")
      .eq("tmdb_id", tmdbId)
      .single();

    if (!movie) {
      return { error: "Movie not found" };
    }

    // Check if movie already exists (including soft-deleted)
    const { data: existing } = await supabase
      .from("nominations")
      .select("id, endless_status, deleted_at")
      .eq("festival_id", festivalId)
      .eq("tmdb_id", tmdbId)
      .maybeSingle();

    let nominationId: string;

    if (existing) {
      // Update existing nomination to playing (restore if soft-deleted)
      const { error } = await supabase
        .from("nominations")
        .update({
          endless_status: "playing",
          display_slot: displaySlot || null,
          pitch: curatorNote || null,
          deleted_at: null, // Restore if soft-deleted
        })
        .eq("id", existing.id);

      if (error) {
        return { error: "Failed to update movie status" };
      }
      nominationId = existing.id;
    } else {
      // Create new nomination with playing status
      const { data: nomination, error } = await supabase
        .from("nominations")
        .insert({
          festival_id: festivalId,
          user_id: user.id,
          tmdb_id: tmdbId,
          pitch: curatorNote || null,
          endless_status: "playing",
          display_slot: displaySlot || null,
        })
        .select("id")
        .single();

      if (error || !nomination) {
        return handleActionError(error, "addMovieToPlaying");
      }
      nominationId = nomination.id;
    }

    // Create discussion thread if it doesn't exist
    let threadId: string | undefined;
    const threadResult = await createPlayingMovieThread({
      clubId,
      festivalId,
      tmdbId,
      movieTitle: movie.title,
      movieYear: movie.year ?? null,
      authorId: user.id,
      pitch: curatorNote,
    });
    if ("threadId" in threadResult) {
      threadId = threadResult.threadId;
    }

    // Log club activity
    await logClubActivity(clubId, "endless_movie_playing", {
      tmdb_id: tmdbId,
      movie_title: movie.title,
      display_slot: displaySlot,
    });

    // Notify all club members about the new movie in Now Playing
    const { data: members } = await supabase
      .from("club_members")
      .select("user_id")
      .eq("club_id", clubId)
      .neq("user_id", user.id); // Don't notify the admin who added it

    if (members && members.length > 0) {
      const { data: club } = await supabase.from("clubs").select("slug").eq("id", clubId).single();

      await createNotificationsForUsers({
        userIds: members.map((m) => m.user_id),
        type: "endless_movie_added",
        title: "Now Showing",
        message: `"${movie.title}" is now showing!`,
        link: `/club/${club?.slug || clubId}`,
        clubId: clubId,
        festivalId: festivalId,
      });
    }

    revalidatePath(`/club/[slug]`);
    revalidatePath("/");

    return { success: true, nominationId, threadId };
  } catch (error) {
    return handleActionError(error, "addMovieToPlaying");
  }
}

/**
 * Move a movie from pool to playing (for endless clubs)
 * Takes a pool item ID from club_movie_pool, creates a nomination, and removes from pool
 */
export async function moveToPlaying(
  poolItemId: string,
  displaySlot?: DisplaySlot
): Promise<{ success: boolean; nominationId?: string; threadId?: string } | { error: string }> {
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
      club_id,
      tmdb_id,
      user_id,
      pitch
    `
    )
    .eq("id", poolItemId)
    .is("deleted_at", null)
    .single();

  if (!poolItem) {
    return { error: "Pool item not found" };
  }

  // Check admin status
  const { data: membership } = await supabase
    .from("club_members")
    .select("role")
    .eq("club_id", poolItem.club_id)
    .eq("user_id", user.id)
    .single();

  if (!membership || !["producer", "director"].includes(membership.role)) {
    return { error: "Only admins can move movies to Now Showing" };
  }

  // Check if this is an endless festival club
  const isEndless = await isEndlessFestivalClub(poolItem.club_id);
  if (!isEndless) {
    return {
      error:
        "This club does not have an active endless festival. Enable endless mode in club settings first.",
    };
  }

  // Get or create the endless festival for this club
  const festivalResult = await getOrCreateEndlessFestival(poolItem.club_id, user.id);
  if (typeof festivalResult === "object" && "error" in festivalResult) {
    return { error: festivalResult.error };
  }
  const festivalId = festivalResult;

  // Get movie details
  const { data: movie } = await supabase
    .from("movies")
    .select("title, year")
    .eq("tmdb_id", poolItem.tmdb_id)
    .single();

  if (!movie) {
    return { error: "Movie not found" };
  }

  // Check if movie already exists in the festival (playing or completed)
  const { data: existingNom } = await supabase
    .from("nominations")
    .select("id, endless_status")
    .eq("festival_id", festivalId)
    .eq("tmdb_id", poolItem.tmdb_id)
    .is("deleted_at", null)
    .maybeSingle();

  let nominationId: string;

  if (existingNom) {
    // Update existing nomination to playing
    const { error } = await supabase
      .from("nominations")
      .update({
        endless_status: "playing",
        display_slot: displaySlot || null,
        pitch:
          poolItem.pitch || existingNom.endless_status === "completed" ? poolItem.pitch : undefined,
      })
      .eq("id", existingNom.id);

    if (error) {
      return { error: "Failed to update movie status" };
    }
    nominationId = existingNom.id;
  } else {
    // Create new nomination with playing status
    const { data: nomination, error } = await supabase
      .from("nominations")
      .insert({
        festival_id: festivalId,
        user_id: poolItem.user_id, // Keep the original nominator
        tmdb_id: poolItem.tmdb_id,
        pitch: poolItem.pitch || null,
        endless_status: "playing",
        display_slot: displaySlot || null,
      })
      .select("id")
      .single();

    if (error || !nomination) {
      return handleActionError(error, "moveToPlaying");
    }
    nominationId = nomination.id;
  }

  // Remove the item from the pool (soft delete)
  await supabase
    .from("club_movie_pool")
    .update({ deleted_at: new Date().toISOString() })
    .eq("id", poolItemId);

  // Create discussion thread now that movie is playing
  let threadId: string | undefined;
  const threadResult = await createPlayingMovieThread({
    clubId: poolItem.club_id,
    festivalId,
    tmdbId: poolItem.tmdb_id,
    movieTitle: movie.title,
    movieYear: movie.year ?? null,
    authorId: user.id,
    pitch: poolItem.pitch,
  });
  if ("threadId" in threadResult) {
    threadId = threadResult.threadId;
  }

  // Log club activity
  await logClubActivity(poolItem.club_id, "endless_movie_playing", {
    tmdb_id: poolItem.tmdb_id,
    movie_title: movie.title,
    display_slot: displaySlot,
  });

  // Notify all club members
  const { data: members } = await supabase
    .from("club_members")
    .select("user_id")
    .eq("club_id", poolItem.club_id)
    .neq("user_id", user.id);

  if (members && members.length > 0) {
    const { data: club } = await supabase
      .from("clubs")
      .select("slug")
      .eq("id", poolItem.club_id)
      .single();

    await createNotificationsForUsers({
      userIds: members.map((m) => m.user_id),
      type: "endless_movie_added",
      title: "Now Showing",
      message: `"${movie.title}" is now showing!`,
      link: `/club/${club?.slug || poolItem.club_id}`,
      clubId: poolItem.club_id,
      festivalId: festivalId,
    });
  }

  revalidatePath(`/club/[slug]`);
  revalidatePath("/");

  return { success: true, nominationId, threadId };
}

/**
 * Move a movie from playing to completed (recently played)
 */
export async function moveToCompleted(
  nominationId: string
): Promise<{ success: boolean } | { error: string }> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { error: "Not authenticated" };
  }

  // Get the nomination and check permissions
  const { data: nomination } = await supabase
    .from("nominations")
    .select(
      `
      id,
      tmdb_id,
      festival:festivals!inner(
        id,
        club_id
      ),
      movie:movies!inner(title)
    `
    )
    .eq("id", nominationId)
    .single();

  if (!nomination) {
    return { error: "Nomination not found" };
  }

  const festival = Array.isArray(nomination.festival)
    ? nomination.festival[0]
    : nomination.festival;
  const movie = Array.isArray(nomination.movie) ? nomination.movie[0] : nomination.movie;

  // Check admin status
  const { data: membership } = await supabase
    .from("club_members")
    .select("role")
    .eq("club_id", festival.club_id)
    .eq("user_id", user.id)
    .single();

  if (!membership || !["producer", "director"].includes(membership.role)) {
    return { error: "Only admins can conclude movies" };
  }

  const { error } = await supabase
    .from("nominations")
    .update({
      endless_status: "completed",
      display_slot: null, // Clear display slot when completed
      completed_at: new Date().toISOString(), // Track when movie was completed for retention
    })
    .eq("id", nominationId);

  if (error) {
    return { error: "Failed to conclude movie" };
  }

  // Log club activity
  await logClubActivity(festival.club_id, "endless_movie_completed", {
    tmdb_id: nomination.tmdb_id,
    movie_title: movie.title,
  });

  // Notify all club members about the completed movie
  const { data: members } = await supabase
    .from("club_members")
    .select("user_id")
    .eq("club_id", festival.club_id)
    .neq("user_id", user.id); // Don't notify the admin who completed it

  if (members && members.length > 0) {
    const { data: club } = await supabase
      .from("clubs")
      .select("slug")
      .eq("id", festival.club_id)
      .single();

    await createNotificationsForUsers({
      userIds: members.map((m) => m.user_id),
      type: "endless_movie_completed",
      title: "Movie Concluded",
      message: `"${movie.title}" has been marked as concluded!`,
      link: `/club/${club?.slug || festival.club_id}`,
      clubId: festival.club_id,
      festivalId: festival.id,
    });
  }

  revalidatePath(`/club/[slug]`);
  revalidatePath("/");

  return { success: true };
}

/**
 * Hide a movie from the Recently Watched section (admin only)
 * The movie is NOT deleted - it remains in watch history, activity feeds,
 * and club history. This only affects visibility in the Recently Watched UI.
 */
export async function hideFromRecentlyWatched(
  nominationId: string
): Promise<{ success: boolean } | { error: string }> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { error: "Not authenticated" };
  }

  // Get the nomination to check permissions
  const { data: nomination } = await supabase
    .from("nominations")
    .select(
      `
      id,
      endless_status,
      festival:festivals!inner(
        id,
        club_id
      )
    `
    )
    .eq("id", nominationId)
    .single();

  if (!nomination) {
    return { error: "Movie not found" };
  }

  // Only allow hiding completed movies (those in Recently Watched)
  if (nomination.endless_status !== "completed") {
    return { error: "Only completed movies can be hidden from Recently Watched" };
  }

  const festival = Array.isArray(nomination.festival)
    ? nomination.festival[0]
    : nomination.festival;

  // Check admin status
  const { data: membership } = await supabase
    .from("club_members")
    .select("role")
    .eq("club_id", festival.club_id)
    .eq("user_id", user.id)
    .single();

  if (!membership || !["producer", "director"].includes(membership.role)) {
    return { error: "Only admins can hide movies from Recently Watched" };
  }

  // Set the hidden flag
  const { error } = await supabase
    .from("nominations")
    .update({ hidden_from_history: true })
    .eq("id", nominationId);

  if (error) {
    return { error: "Failed to hide movie" };
  }

  revalidatePath(`/club/[slug]`);
  return { success: true };
}
