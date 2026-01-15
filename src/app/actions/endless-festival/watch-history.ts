"use server";

import { createClient } from "@/lib/supabase/server";
import { handleActionError } from "@/lib/errors/handler";
import { logMemberActivity } from "@/lib/activity/logger";
import { invalidateMovie } from "@/lib/cache/invalidate";

/**
 * Mark a movie as watched (adds to watch_history)
 *
 * If the movie is currently showing in any of the user's clubs,
 * the watch activity will appear in those clubs' activity feeds.
 */
export async function markMovieWatched(
  tmdbId: number,
  context?: { clubId?: string; clubSlug?: string; festivalId?: string }
): Promise<{ success: boolean } | { error: string }> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { error: "Not authenticated" };
  }

  // Build contexts as array (matches existing data format)
  const contextEntry: Record<string, unknown> = {
    source: "endless_festival",
    watched_at: new Date().toISOString(),
  };
  if (context?.clubId) contextEntry.club_id = context.clubId;
  if (context?.clubSlug) contextEntry.club_slug = context.clubSlug;
  if (context?.festivalId) contextEntry.festival_id = context.festivalId;

  // Upsert into watch_history
  const { error } = await supabase.from("watch_history").upsert(
    {
      user_id: user.id,
      tmdb_id: tmdbId,
      first_watched_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      contexts: [contextEntry], // Array format to match existing data
    },
    {
      onConflict: "user_id,tmdb_id",
    }
  );

  if (error) {
    return handleActionError(error, "markMovieWatched");
  }

  // Get movie title for logging
  const { data: movie } = await supabase
    .from("movies")
    .select("title")
    .eq("tmdb_id", tmdbId)
    .maybeSingle();

  // Find all clubs where this movie is currently showing and the user is a member:
  // 1. Endless festivals: movie has endless_status = 'playing'
  // 2. Competitive festivals: festival is in watch_rate phase and movie is nominated

  // Query 1: Endless festivals with movie currently playing
  const { data: endlessClubs } = await supabase
    .from("nominations")
    .select(
      `
      festival:festivals!inner(
        id,
        club_id,
        club:clubs!inner(
          id,
          slug,
          club_members!inner(user_id)
        )
      )
    `
    )
    .eq("tmdb_id", tmdbId)
    .eq("endless_status", "playing")
    .is("deleted_at", null)
    .eq("festivals.club.club_members.user_id", user.id);

  // Query 2: Competitive festivals in watch_rate phase with this movie nominated
  const { data: competitiveClubs } = await supabase
    .from("nominations")
    .select(
      `
      festival:festivals!inner(
        id,
        club_id,
        phase,
        club:clubs!inner(
          id,
          slug,
          club_members!inner(user_id)
        )
      )
    `
    )
    .eq("tmdb_id", tmdbId)
    .is("endless_status", null) // Competitive festivals have null endless_status
    .is("deleted_at", null)
    .eq("festivals.phase", "watch_rate")
    .eq("festivals.club.club_members.user_id", user.id);

  // Combine results
  const clubsShowingMovie = [...(endlessClubs || []), ...(competitiveClubs || [])];

  // Collect unique club IDs where movie is currently showing
  // Use Map with clubId as key to ensure uniqueness
  const clubsToLogActivity = new Map<string, { clubId: string; clubSlug: string }>();

  if (clubsShowingMovie) {
    for (const nom of clubsShowingMovie) {
      const festival = Array.isArray(nom.festival) ? nom.festival[0] : nom.festival;
      if (festival?.club) {
        const club = Array.isArray(festival.club) ? festival.club[0] : festival.club;
        if (club?.id && club?.slug) {
          clubsToLogActivity.set(club.id, { clubId: club.id, clubSlug: club.slug });
        }
      }
    }
  }

  // If explicit context.clubId provided and not already in the map, add it
  if (context?.clubId && !clubsToLogActivity.has(context.clubId)) {
    clubsToLogActivity.set(context.clubId, {
      clubId: context.clubId,
      clubSlug: context.clubSlug || context.clubId,
    });
  }

  // Log activity for each club where the movie is showing
  // If no clubs found and no context, log without club context (personal activity only)
  if (clubsToLogActivity.size === 0) {
    await logMemberActivity(user.id, "user_watched_movie", {
      tmdb_id: tmdbId,
      movie_title: movie?.title,
    });
  } else {
    // Log activity for each club where movie is currently showing
    const clubsArray = Array.from(clubsToLogActivity.values());
    await Promise.all(
      clubsArray.map(({ clubId, clubSlug }) =>
        logMemberActivity(
          user.id,
          "user_watched_movie",
          {
            tmdb_id: tmdbId,
            movie_title: movie?.title,
            club_id: clubId,
            club_slug: clubSlug,
          },
          clubId
        )
      )
    );
  }

  // Check badges
  try {
    const { checkRelevantBadges } = await import("../badges");
    await checkRelevantBadges(user.id, "movie_watched");
  } catch (e) {
    // Badge check is non-critical
    console.error("Badge check failed:", e);
  }

  invalidateMovie(tmdbId);

  return { success: true };
}

/**
 * Unmark a movie as watched (removes from watch_history)
 * Also removes the corresponding activity from the activity feed
 */
export async function unmarkMovieWatched(
  tmdbId: number
): Promise<{ success: boolean } | { error: string }> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { error: "Not authenticated" };
  }

  // Delete from watch_history
  const { error } = await supabase
    .from("watch_history")
    .delete()
    .eq("user_id", user.id)
    .eq("tmdb_id", tmdbId);

  if (error) {
    return handleActionError(error, "unmarkMovieWatched");
  }

  // Also remove the "watched" activity from activity feed
  // This ensures accidental watches don't stay in the activity feed
  const { error: activityError } = await supabase
    .from("activity_log")
    .delete()
    .eq("user_id", user.id)
    .eq("action", "user_watched_movie")
    .eq("details->tmdb_id", tmdbId);

  if (activityError) {
    // Non-critical - log but don't fail the operation
    console.error("Error removing watch activity:", activityError);
  }

  invalidateMovie(tmdbId);

  return { success: true };
}

/**
 * Update the watch count for a movie
 */
export async function updateWatchCount(
  tmdbId: number,
  count: number
): Promise<{ success: boolean } | { error: string }> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { error: "Not authenticated" };
  }

  // Validate count
  if (count < 1) {
    return { error: "Watch count must be at least 1" };
  }

  const { error } = await supabase
    .from("watch_history")
    .update({
      watch_count: count,
      updated_at: new Date().toISOString(),
    })
    .eq("user_id", user.id)
    .eq("tmdb_id", tmdbId);

  if (error) {
    return handleActionError(error, "updateWatchCount");
  }

  invalidateMovie(tmdbId);

  return { success: true };
}

/**
 * Get watch history entry for a movie (includes watch count)
 */
export async function getWatchHistoryEntry(
  tmdbId: number
): Promise<{ data: { watch_count: number } | null } | { error: string }> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { data: null };
  }

  const { data, error } = await supabase
    .from("watch_history")
    .select("watch_count")
    .eq("user_id", user.id)
    .eq("tmdb_id", tmdbId)
    .maybeSingle();

  if (error) {
    return handleActionError(error, "getWatchHistoryEntry");
  }

  return { data };
}

/**
 * Get watched status for a list of TMDB IDs
 */
export async function getWatchedMovies(tmdbIds: number[]): Promise<Set<number>> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user || tmdbIds.length === 0) {
    return new Set();
  }

  const { data: watched } = await supabase
    .from("watch_history")
    .select("tmdb_id")
    .eq("user_id", user.id)
    .in("tmdb_id", tmdbIds);

  return new Set(watched?.map((w) => w.tmdb_id).filter((id): id is number => id !== null) || []);
}

/**
 * Get user's ratings for a list of nomination IDs
 */
export async function getUserRatingsForNominations(
  nominationIds: string[],
  festivalId: string
): Promise<Map<string, number>> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user || nominationIds.length === 0) {
    return new Map();
  }

  const { data: ratings } = await supabase
    .from("ratings")
    .select("nomination_id, rating")
    .eq("user_id", user.id)
    .eq("festival_id", festivalId)
    .in("nomination_id", nominationIds);

  const ratingMap = new Map<string, number>();
  ratings?.forEach((r) => {
    if (r.nomination_id && r.rating !== null) {
      ratingMap.set(r.nomination_id, r.rating);
    }
  });

  return ratingMap;
}

/**
 * Get user's generic (global) ratings for a list of TMDB IDs.
 * Used by endless festivals where generic_ratings is the source of truth.
 */
export async function getUserGenericRatings(tmdbIds: number[]): Promise<Map<number, number>> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user || tmdbIds.length === 0) {
    return new Map();
  }

  const { data: ratings } = await supabase
    .from("generic_ratings")
    .select("tmdb_id, rating")
    .eq("user_id", user.id)
    .in("tmdb_id", tmdbIds);

  const ratingMap = new Map<number, number>();
  ratings?.forEach((r) => {
    if (r.tmdb_id !== null && r.rating !== null) {
      ratingMap.set(r.tmdb_id, r.rating);
    }
  });

  return ratingMap;
}
