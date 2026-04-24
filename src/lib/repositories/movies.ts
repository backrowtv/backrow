/**
 * Movies Repository
 *
 * Encapsulates all movie-related database queries.
 * Provides typed, reusable methods for accessing movie and rating data.
 */

import { escapeLike } from "@/lib/security/postgrest-escape";
import {
  handleQueryError,
  handleListError,
  type DbClient,
  type Movie,
  type Rating,
  type QueryResult,
  type ListResult,
} from "./types";

/**
 * Get a movie by its TMDB ID
 */
export async function getMovieByTmdbId(db: DbClient, tmdbId: number): Promise<QueryResult<Movie>> {
  const { data, error } = await db.from("movies").select("*").eq("tmdb_id", tmdbId).maybeSingle();

  if (error) return handleQueryError(error, "getMovieByTmdbId");

  return { data, error: null };
}

/**
 * Get a movie by its slug
 */
export async function getMovieBySlug(db: DbClient, slug: string): Promise<QueryResult<Movie>> {
  const { data, error } = await db.from("movies").select("*").eq("slug", slug).maybeSingle();

  if (error) return handleQueryError(error, "getMovieBySlug");

  return { data, error: null };
}

/**
 * Search movies by title
 */
export async function searchMovies(
  db: DbClient,
  query: string,
  options?: {
    limit?: number;
    year?: number;
  }
): Promise<ListResult<Movie>> {
  const { limit = 10, year } = options || {};

  let queryBuilder = db
    .from("movies")
    .select("*")
    .ilike("title", `%${escapeLike(query)}%`)
    .order("popularity_score", { ascending: false })
    .limit(limit);

  if (year) {
    queryBuilder = queryBuilder.eq("year", year);
  }

  const { data, error } = await queryBuilder;

  if (error) return handleListError(error, "searchMovies");

  return { data: data || [], error: null };
}

/**
 * Get popular movies
 */
export async function getPopularMovies(
  db: DbClient,
  options?: {
    limit?: number;
    minScore?: number;
  }
): Promise<ListResult<Movie>> {
  const { limit = 20, minScore } = options || {};

  let queryBuilder = db
    .from("movies")
    .select("*")
    .order("popularity_score", { ascending: false })
    .limit(limit);

  if (minScore !== undefined) {
    queryBuilder = queryBuilder.gte("popularity_score", minScore);
  }

  const { data, error } = await queryBuilder;

  if (error) return handleListError(error, "getPopularMovies");

  return { data: data || [], error: null };
}

/**
 * Get multiple movies by their TMDB IDs
 */
export async function getMoviesByTmdbIds(
  db: DbClient,
  tmdbIds: number[]
): Promise<ListResult<Movie>> {
  if (tmdbIds.length === 0) {
    return { data: [], error: null };
  }

  const { data, error } = await db.from("movies").select("*").in("tmdb_id", tmdbIds);

  if (error) return handleListError(error, "getMoviesByTmdbIds");

  return { data: data || [], error: null };
}

/**
 * Get a user's rating for a nomination
 */
export async function getUserRating(
  db: DbClient,
  nominationId: string,
  userId: string
): Promise<QueryResult<Rating>> {
  const { data, error } = await db
    .from("ratings")
    .select("*")
    .eq("nomination_id", nominationId)
    .eq("user_id", userId)
    .maybeSingle();

  if (error) return handleQueryError(error, "getUserRating");

  return { data, error: null };
}

/**
 * Get all ratings for a nomination
 */
export async function getNominationRatings(
  db: DbClient,
  nominationId: string
): Promise<
  ListResult<
    Rating & { user: { id: string; display_name: string | null; avatar_url: string | null } | null }
  >
> {
  const { data, error } = await db
    .from("ratings")
    .select(
      `
      *,
      user:user_id(
        id,
        display_name,
        avatar_url
      )
    `
    )
    .eq("nomination_id", nominationId)
    .order("created_at", { ascending: false });

  if (error) return handleListError(error, "getNominationRatings");

  return { data: data || [], error: null };
}

/**
 * Get a user's watch history
 */
export async function getUserWatchHistory(
  db: DbClient,
  userId: string,
  options?: {
    limit?: number;
    offset?: number;
  }
): Promise<ListResult<Rating & { movie: Movie | null }>> {
  const { limit = 20, offset = 0 } = options || {};

  const { data, error } = await db
    .from("ratings")
    .select(
      `
      *,
      nomination:nomination_id(
        movies:tmdb_id(*)
      )
    `
    )
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .range(offset, offset + limit - 1);

  if (error) return handleListError(error, "getUserWatchHistory");

  // Transform to flatten the nested movie data
  const transformed = (data || []).map((item) => {
    const nomination = item.nomination as { movies: Movie | null } | null;
    return {
      ...item,
      movie: nomination?.movies || null,
    };
  });

  return { data: transformed, error: null };
}

/**
 * Get average rating for a movie across all festivals
 */
export async function getMovieAverageRating(
  db: DbClient,
  tmdbId: number
): Promise<{ average: number | null; count: number; error: string | null }> {
  const { data, error } = await db
    .from("ratings")
    .select(
      `
      rating,
      nomination:nomination_id!inner(
        tmdb_id
      )
    `
    )
    .eq("nomination.tmdb_id", tmdbId);

  if (error) {
    console.error("[repo] getMovieAverageRating:", error.message);
    return { average: null, count: 0, error: error.message };
  }

  if (!data || data.length === 0) {
    return { average: null, count: 0, error: null };
  }

  const ratings = data.map((r) => r.rating).filter((r): r is number => r !== null);
  const average =
    ratings.length > 0 ? ratings.reduce((sum, r) => sum + r, 0) / ratings.length : null;

  return { average, count: ratings.length, error: null };
}

/**
 * Check if a movie is in a user's watchlist
 * Note: future_nomination_list table may not be in generated types yet
 */
export async function isMovieInWatchlist(
  db: DbClient,
  userId: string,
  tmdbId: number
): Promise<boolean> {
  // Use type assertion since future_nomination_list may not be in generated types
  const { count, error } = await (
    db as unknown as { from: (table: string) => ReturnType<typeof db.from> }
  )
    .from("future_nomination_list")
    .select("*", { count: "exact", head: true })
    .eq("user_id", userId)
    .eq("tmdb_id", tmdbId);

  if (error) {
    console.error("[repo] isMovieInWatchlist:", error.message);
    return false;
  }

  return (count || 0) > 0;
}
