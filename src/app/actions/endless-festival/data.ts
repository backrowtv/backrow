"use server";

import { createClient } from "@/lib/supabase/server";
import { invalidateFestival } from "@/lib/cache/invalidate";
import { handleActionError } from "@/lib/errors/handler";
import type {
  EndlessStatus,
  DisplaySlot,
  EndlessMovie,
  EndlessFestivalData,
  PoolVoteState,
} from "./types";
import { getPoolMoviesVotes } from "./voting";

/**
 * Get movie pool data for ANY club (works for both standard and endless clubs)
 * Returns movies from the club_movie_pool table
 */
export async function getClubMoviePool(clubId: string): Promise<EndlessMovie[]> {
  const supabase = await createClient();

  const { data: poolItems, error } = await supabase
    .from("club_movie_pool")
    .select(
      `
      id,
      tmdb_id,
      pitch,
      created_at,
      user_id,
      movie:movies!inner(
        tmdb_id,
        slug,
        title,
        year,
        poster_url,
        backdrop_url,
        overview,
        runtime,
        director,
        genres,
        certification
      ),
      nominator:users(
        id,
        display_name,
        avatar_url
      )
    `
    )
    .eq("club_id", clubId)
    .is("deleted_at", null)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Error fetching club movie pool:", error);
    return [];
  }

  return (poolItems || []).map((item) => {
    const movie = Array.isArray(item.movie) ? item.movie[0] : item.movie;
    const nominator = Array.isArray(item.nominator) ? item.nominator[0] : item.nominator;

    const runtimeNum = movie.runtime
      ? typeof movie.runtime === "string"
        ? parseInt(movie.runtime, 10)
        : movie.runtime
      : null;

    return {
      id: item.id,
      tmdb_id: movie.tmdb_id,
      slug: movie.slug || null,
      title: movie.title,
      year: movie.year,
      poster_url: movie.poster_url,
      backdrop_url: movie.backdrop_url,
      overview: movie.overview,
      runtime: runtimeNum,
      director: movie.director,
      genres: movie.genres || null,
      certification: movie.certification || null,
      curator_note: item.pitch,
      endless_status: "pool" as EndlessStatus,
      display_slot: null as DisplaySlot,
      created_at: item.created_at,
      completed_at: null,
      nominator: nominator
        ? {
            id: nominator.id,
            display_name: nominator.display_name,
            avatar_url: nominator.avatar_url,
          }
        : null,
    };
  });
}

/**
 * Get all endless festival data for a club
 * Returns movies in pool (from club_movie_pool), playing, and recently played (from nominations)
 */
export async function getEndlessFestivalData(
  clubId: string
): Promise<EndlessFestivalData | { error: string }> {
  const supabase = await createClient();

  try {
    // Get the endless festival, club settings, and pool items in parallel
    const [{ data: festival }, { data: club }, poolItems] = await Promise.all([
      supabase
        .from("festivals")
        .select("id, theme")
        .eq("club_id", clubId)
        .eq("status", "watching")
        .limit(1)
        .maybeSingle(),
      supabase.from("clubs").select("settings").eq("id", clubId).single(),
      getClubMoviePool(clubId),
    ]);

    // Fetch pool votes
    const poolVotes =
      poolItems.length > 0
        ? await getPoolMoviesVotes(poolItems.map((m) => m.id))
        : new Map<string, { count: number; userVoted: boolean }>();

    // Convert Map to plain object for serialization
    const poolVotesObj: Record<string, PoolVoteState> = Object.fromEntries(poolVotes);

    // Pool items are available even without a festival
    if (!festival) {
      return {
        festivalId: null,
        festivalName: null,
        nowPlaying: [],
        pool: poolItems,
        recentlyPlayed: [],
        poolVotes: poolVotesObj,
      };
    }

    // Get retention settings (default: 7 days)
    const settings = (club?.settings as Record<string, unknown>) || {};
    const retention = (settings.recently_watched_retention as {
      value: number;
      unit: "days" | "weeks" | "months";
    }) || { value: 7, unit: "days" };

    // Calculate retention cutoff date
    const now = new Date();
    let retentionMs: number;
    switch (retention.unit) {
      case "weeks":
        retentionMs = retention.value * 7 * 24 * 60 * 60 * 1000;
        break;
      case "months":
        retentionMs = retention.value * 30 * 24 * 60 * 60 * 1000;
        break;
      default: // days
        retentionMs = retention.value * 24 * 60 * 60 * 1000;
    }
    const retentionCutoff = new Date(now.getTime() - retentionMs);

    // Get nominations for playing and completed items (NOT pool - that comes from club_movie_pool)
    const { data: nominations, error } = await supabase
      .from("nominations")
      .select(
        `
        id,
        tmdb_id,
        pitch,
        endless_status,
        display_slot,
        created_at,
        completed_at,
        hidden_from_history,
        user_id,
        movie:movies!inner(
          tmdb_id,
          slug,
          title,
          year,
          poster_url,
          backdrop_url,
          overview,
          tagline,
          runtime,
          director,
          genres,
          certification
        ),
        nominator:users!nominations_user_id_fkey(
          id,
          display_name,
          avatar_url
        )
      `
      )
      .eq("festival_id", festival.id)
      .is("deleted_at", null)
      .in("endless_status", ["playing", "completed"]) // Only playing and completed, not pool
      .order("created_at", { ascending: false });

    if (error) {
      return handleActionError(error, "getEndlessFestivalData");
    }

    // Transform nominations into EndlessMovie objects
    const transformNomination = (nom: (typeof nominations)[0]): EndlessMovie => {
      const movie = Array.isArray(nom.movie) ? nom.movie[0] : nom.movie;
      const nominator = Array.isArray(nom.nominator) ? nom.nominator[0] : nom.nominator;

      // Parse runtime to number if it's a string
      const runtimeNum = movie.runtime
        ? typeof movie.runtime === "string"
          ? parseInt(movie.runtime, 10)
          : movie.runtime
        : null;

      return {
        id: nom.id,
        tmdb_id: movie.tmdb_id,
        slug: movie.slug || null,
        title: movie.title,
        year: movie.year,
        poster_url: movie.poster_url,
        backdrop_url: movie.backdrop_url,
        overview: movie.overview,
        runtime: runtimeNum,
        director: movie.director,
        genres: movie.genres || null,
        certification: movie.certification || null,
        curator_note: nom.pitch,
        endless_status: (nom.endless_status as EndlessStatus) || "pool",
        display_slot: nom.display_slot as DisplaySlot,
        created_at: nom.created_at,
        completed_at: nom.completed_at || null,
        nominator: nominator
          ? {
              id: nominator.id,
              display_name: nominator.display_name,
              avatar_url: nominator.avatar_url,
            }
          : null,
      };
    };

    const allNominations = nominations?.map(transformNomination) || [];

    // Separate by status
    const nowPlaying = allNominations.filter((m) => m.endless_status === "playing");

    // Filter recently played by:
    // 1. Not hidden by admin
    // 2. Within retention period (based on completed_at)
    const recentlyPlayed =
      nominations
        ?.filter((nom) => {
          if (nom.endless_status !== "completed") return false;
          if (nom.hidden_from_history) return false;

          // Check retention period
          if (nom.completed_at) {
            const completedDate = new Date(nom.completed_at);
            if (completedDate < retentionCutoff) return false;
          }

          return true;
        })
        .map(transformNomination) || [];

    return {
      festivalId: festival.id,
      festivalName: festival.theme || null,
      nowPlaying,
      pool: poolItems, // Use the club_movie_pool data
      recentlyPlayed,
      poolVotes: poolVotesObj,
    };
  } catch (error) {
    return handleActionError(error, "getEndlessFestivalData");
  }
}

/**
 * Update the endless festival name (shown as "Now Showing" header)
 */
export async function updateEndlessFestivalName(
  festivalId: string,
  name: string
): Promise<{ success: boolean } | { error: string }> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { error: "Not authenticated" };
  }

  // Get festival to check club membership
  const { data: festival } = await supabase
    .from("festivals")
    .select("club_id")
    .eq("id", festivalId)
    .single();

  if (!festival) {
    return { error: "Festival not found" };
  }

  // Check admin status
  const { data: membership } = await supabase
    .from("club_members")
    .select("role")
    .eq("club_id", festival.club_id)
    .eq("user_id", user.id)
    .single();

  if (!membership || !["producer", "director"].includes(membership.role)) {
    return { error: "Only admins can edit the festival name" };
  }

  // Update the festival theme (used as the "Now Showing" name)
  const { error } = await supabase
    .from("festivals")
    .update({ theme: name.trim() || null })
    .eq("id", festivalId);

  if (error) {
    return handleActionError(error, "updateEndlessFestivalName");
  }

  await invalidateFestival(festivalId, { clubId: festival.club_id });
  return { success: true };
}

/**
 * Check if a club uses endless festival mode
 */
export async function isEndlessFestivalClub(clubId: string): Promise<boolean> {
  const supabase = await createClient();

  const { data: club } = await supabase.from("clubs").select("settings").eq("id", clubId).single();

  if (!club) return false;

  const settings = club.settings as Record<string, unknown> | null;
  return settings?.festival_type === "endless";
}

/**
 * Get the count of movies in the pool for a club
 * Lightweight query for displaying badge count
 */
export async function getMoviePoolCount(clubId: string): Promise<number> {
  const supabase = await createClient();

  const { count, error } = await supabase
    .from("club_movie_pool")
    .select("id", { count: "exact", head: true })
    .eq("club_id", clubId)
    .is("deleted_at", null);

  if (error) {
    console.error("[getMoviePoolCount]", error);
    return 0;
  }

  return count ?? 0;
}
