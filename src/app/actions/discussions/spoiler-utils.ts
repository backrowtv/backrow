import { createClient } from "@/lib/supabase/server";
import type { DiscussionThread, SpoilerState } from "./types";

/**
 * Get all movie TMDB IDs from a thread (from tmdb_id field + movie tags)
 */
export function getMovieTmdbIdsFromThread(thread: DiscussionThread): number[] {
  const ids: number[] = [];

  // Legacy: tmdb_id field (for thread_type === 'movie')
  if (thread.tmdb_id && thread.thread_type === "movie") {
    ids.push(thread.tmdb_id);
  }

  // New: movie tags
  if (thread.tags) {
    for (const tag of thread.tags) {
      if (tag.tag_type === "movie" && tag.tmdb_id) {
        ids.push(tag.tmdb_id);
      }
    }
  }

  // Deduplicate
  return [...new Set(ids)];
}

/**
 * Get movie title from thread (first movie found)
 */
function getMovieTitleFromThread(thread: DiscussionThread, targetTmdbId?: number): string | null {
  // Check legacy movie field first
  if (thread.movie && (!targetTmdbId || thread.movie.tmdb_id === targetTmdbId)) {
    return thread.movie.title;
  }

  // Check tags
  if (thread.tags) {
    for (const tag of thread.tags) {
      if (tag.tag_type === "movie" && tag.movie) {
        if (!targetTmdbId || tag.tmdb_id === targetTmdbId) {
          return tag.movie.title;
        }
      }
    }
  }

  return null;
}

/**
 * Calculate spoiler state for a single thread.
 *
 * Gating is automatic and purely watch-history based:
 * - Threads with no movie tags → always open
 * - Threads the user has manually unlocked → open
 * - Threads where the user has watched ALL tagged movies → open
 * - Otherwise → gated (user hasn't watched the movie)
 */
export function calculateSpoilerState(
  thread: DiscussionThread,
  watchedTmdbIds: Set<number>,
  unlockedThreadIds: Set<string>
): SpoilerState {
  const movieIds = getMovieTmdbIdsFromThread(thread);

  // No movie tags → always open, no gate needed
  if (movieIds.length === 0) {
    return {
      isSpoilered: false,
      reason: "none",
      movieTmdbId: null,
      movieTitle: null,
      isUnlocked: false,
      hasWatched: false,
    };
  }

  // User manually unlocked this thread (override) → open
  if (unlockedThreadIds.has(thread.id)) {
    return {
      isSpoilered: false,
      reason: "none",
      movieTmdbId: null,
      movieTitle: null,
      isUnlocked: true,
      hasWatched: false,
    };
  }

  // User has watched ALL tagged movies → open
  const allWatched = movieIds.every((id) => watchedTmdbIds.has(id));
  if (allWatched) {
    return {
      isSpoilered: false,
      reason: "none",
      movieTmdbId: null,
      movieTitle: null,
      isUnlocked: false,
      hasWatched: true,
    };
  }

  // User hasn't watched all movies → gated
  const unwatchedMovieId = movieIds.find((id) => !watchedTmdbIds.has(id)) || null;
  const movieTitle = unwatchedMovieId ? getMovieTitleFromThread(thread, unwatchedMovieId) : null;

  return {
    isSpoilered: true,
    reason: "unwatched",
    movieTmdbId: unwatchedMovieId,
    movieTitle,
    isUnlocked: false,
    hasWatched: false,
  };
}

/**
 * Batch fetch watch history and unlock status for efficiency
 */
export async function batchCheckSpoilerData(
  threadIds: string[],
  movieTmdbIds: number[],
  userId: string
): Promise<{
  watchedMovies: Set<number>;
  unlockedThreads: Set<string>;
}> {
  if (threadIds.length === 0 && movieTmdbIds.length === 0) {
    return {
      watchedMovies: new Set(),
      unlockedThreads: new Set(),
    };
  }

  const supabase = await createClient();

  // Parallel queries for efficiency
  const [watchedResult, unlocksResult] = await Promise.all([
    // Get watched movies from the provided list
    movieTmdbIds.length > 0
      ? supabase
          .from("watch_history")
          .select("tmdb_id")
          .eq("user_id", userId)
          .in("tmdb_id", movieTmdbIds)
      : Promise.resolve({ data: [] }),

    // Get unlocked threads from the provided list
    threadIds.length > 0
      ? supabase
          .from("discussion_thread_unlocks")
          .select("thread_id")
          .eq("user_id", userId)
          .in("thread_id", threadIds)
      : Promise.resolve({ data: [] }),
  ]);

  return {
    watchedMovies: new Set(watchedResult.data?.map((w) => w.tmdb_id) || []),
    unlockedThreads: new Set(unlocksResult.data?.map((u) => u.thread_id) || []),
  };
}

/**
 * Get spoiler states for multiple threads (batch operation)
 */
export async function getSpoilerStatesForThreads(
  threads: DiscussionThread[],
  userId: string,
  options?: { disableGate?: boolean }
): Promise<Record<string, SpoilerState>> {
  if (threads.length === 0) {
    return {};
  }

  // Club-level opt-out: return always-open state without querying
  if (options?.disableGate) {
    const result: Record<string, SpoilerState> = {};
    for (const thread of threads) {
      result[thread.id] = {
        isSpoilered: false,
        reason: "none",
        movieTmdbId: null,
        movieTitle: null,
        isUnlocked: false,
        hasWatched: false,
      };
    }
    return result;
  }

  // Collect all thread IDs and movie TMDB IDs
  const threadIds = threads.map((t) => t.id);
  const allMovieIds: number[] = [];

  for (const thread of threads) {
    const movieIds = getMovieTmdbIdsFromThread(thread);
    allMovieIds.push(...movieIds);
  }

  // Deduplicate movie IDs
  const uniqueMovieIds = [...new Set(allMovieIds)];

  // Batch fetch spoiler data
  const { watchedMovies, unlockedThreads } = await batchCheckSpoilerData(
    threadIds,
    uniqueMovieIds,
    userId
  );

  // Calculate spoiler state for each thread
  const result: Record<string, SpoilerState> = {};

  for (const thread of threads) {
    result[thread.id] = calculateSpoilerState(thread, watchedMovies, unlockedThreads);
  }

  return result;
}

/**
 * Get spoiler state for a single thread
 */
export async function getThreadSpoilerState(
  thread: DiscussionThread,
  userId: string,
  options?: { disableGate?: boolean }
): Promise<SpoilerState> {
  if (options?.disableGate) {
    return {
      isSpoilered: false,
      reason: "none",
      movieTmdbId: null,
      movieTitle: null,
      isUnlocked: false,
      hasWatched: false,
    };
  }

  const movieIds = getMovieTmdbIdsFromThread(thread);

  const { watchedMovies, unlockedThreads } = await batchCheckSpoilerData(
    [thread.id],
    movieIds,
    userId
  );

  return calculateSpoilerState(thread, watchedMovies, unlockedThreads);
}
