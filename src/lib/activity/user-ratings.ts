import { createClient } from "@/lib/supabase/server";
import { getTmdbIdFromActivity } from "./activity-utils";
import { extractSingleRelation } from "@/types/supabase-helpers";

// Re-export for backward compatibility
export { getTmdbIdFromActivity };

// Type for nomination relation in ratings query
interface NominationWithTmdb {
  tmdb_id?: number | null;
}

/**
 * Checks if a user has rated a specific movie.
 * Checks both festival ratings (ratings table) and personal ratings (generic_ratings table).
 *
 * @param userId - The user ID to check
 * @param tmdbId - The TMDB ID of the movie
 * @returns Promise<boolean> - True if user has rated the movie
 */
export async function hasUserRatedMovie(
  userId: string,
  tmdbId: number | null | undefined
): Promise<boolean> {
  if (!tmdbId) return false;

  const supabase = await createClient();

  // Check generic_ratings (personal ratings)
  const { data: genericRating } = await supabase
    .from("generic_ratings")
    .select("user_id")
    .eq("user_id", userId)
    .eq("tmdb_id", tmdbId)
    .maybeSingle();

  if (genericRating) return true;

  // Check festival ratings (ratings table) - need to find nominations with this tmdb_id
  const { data: festivalRatings } = await supabase
    .from("ratings")
    .select(
      `
      id,
      nominations:nomination_id(
        tmdb_id
      )
    `
    )
    .eq("user_id", userId)
    .limit(100); // Reasonable limit for checking

  if (festivalRatings) {
    for (const rating of festivalRatings) {
      const nomination = extractSingleRelation(
        rating.nominations as NominationWithTmdb | NominationWithTmdb[] | null
      );
      if (nomination?.tmdb_id === tmdbId) {
        return true;
      }
    }
  }

  return false;
}

/**
 * Gets a map of tmdb_id -> boolean for whether the user has rated each movie.
 * More efficient for batch checking multiple movies.
 *
 * @param userId - The user ID to check
 * @param tmdbIds - Array of TMDB IDs to check
 * @returns Promise<Map<number, boolean>> - Map of tmdb_id to hasRated boolean
 */
export async function getUserRatedMoviesMap(
  userId: string,
  tmdbIds: (number | null | undefined)[]
): Promise<Map<number, boolean>> {
  const result = new Map<number, boolean>();
  const validTmdbIds = tmdbIds.filter((id): id is number => id !== null && id !== undefined);

  if (validTmdbIds.length === 0) return result;

  const supabase = await createClient();

  // Check generic_ratings (personal ratings)
  const { data: genericRatings } = await supabase
    .from("generic_ratings")
    .select("tmdb_id")
    .eq("user_id", userId)
    .in("tmdb_id", validTmdbIds);

  if (genericRatings) {
    genericRatings.forEach((rating) => {
      result.set(rating.tmdb_id, true);
    });
  }

  // Check festival ratings (ratings table)
  const { data: festivalRatings } = await supabase
    .from("ratings")
    .select(
      `
      nominations:nomination_id(
        tmdb_id
      )
    `
    )
    .eq("user_id", userId)
    .limit(500); // Reasonable limit

  if (festivalRatings) {
    festivalRatings.forEach((rating) => {
      const nomination = extractSingleRelation(
        rating.nominations as NominationWithTmdb | NominationWithTmdb[] | null
      );
      if (nomination?.tmdb_id && validTmdbIds.includes(nomination.tmdb_id)) {
        result.set(nomination.tmdb_id, true);
      }
    });
  }

  // Set false for any movies not found in either table
  validTmdbIds.forEach((tmdbId) => {
    if (!result.has(tmdbId)) {
      result.set(tmdbId, false);
    }
  });

  return result;
}
