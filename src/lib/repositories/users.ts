/**
 * Users Repository
 *
 * Encapsulates all user-related database queries.
 * Provides typed, reusable methods for accessing user data.
 */

import {
  handleQueryError,
  handleListError,
  type DbClient,
  type User,
  type QueryResult,
  type ListResult,
} from "./types";

/**
 * Get a user by their ID
 */
export async function getUserById(db: DbClient, id: string): Promise<QueryResult<User>> {
  const { data, error } = await db.from("users").select("*").eq("id", id).maybeSingle();

  if (error) return handleQueryError(error, "getUserById");

  return { data, error: null };
}

/**
 * Get a user by their username
 */
export async function getUserByUsername(
  db: DbClient,
  username: string
): Promise<QueryResult<User>> {
  const { data, error } = await db.from("users").select("*").eq("username", username).maybeSingle();

  if (error) return handleQueryError(error, "getUserByUsername");

  return { data, error: null };
}

/**
 * Get a user by their email
 */
export async function getUserByEmail(db: DbClient, email: string): Promise<QueryResult<User>> {
  const { data, error } = await db.from("users").select("*").eq("email", email).maybeSingle();

  if (error) return handleQueryError(error, "getUserByEmail");

  return { data, error: null };
}

/**
 * Search users by display name or username
 */
export async function searchUsers(
  db: DbClient,
  query: string,
  options?: {
    limit?: number;
    excludeIds?: string[];
  }
): Promise<ListResult<User>> {
  const { limit = 10, excludeIds } = options || {};
  const searchPattern = `%${query}%`;

  let queryBuilder = db
    .from("users")
    .select("*")
    .or(`display_name.ilike.${searchPattern},username.ilike.${searchPattern}`)
    .limit(limit);

  if (excludeIds && excludeIds.length > 0) {
    queryBuilder = queryBuilder.not("id", "in", `(${excludeIds.join(",")})`);
  }

  const { data, error } = await queryBuilder;

  if (error) return handleListError(error, "searchUsers");

  return { data: data || [], error: null };
}

/**
 * Get multiple users by their IDs
 */
export async function getUsersByIds(db: DbClient, ids: string[]): Promise<ListResult<User>> {
  if (ids.length === 0) {
    return { data: [], error: null };
  }

  const { data, error } = await db.from("users").select("*").in("id", ids);

  if (error) return handleListError(error, "getUsersByIds");

  return { data: data || [], error: null };
}

/**
 * Check if a username is available
 */
export async function isUsernameAvailable(
  db: DbClient,
  username: string,
  excludeUserId?: string
): Promise<boolean> {
  let queryBuilder = db
    .from("users")
    .select("id", { count: "exact", head: true })
    .eq("username", username);

  if (excludeUserId) {
    queryBuilder = queryBuilder.neq("id", excludeUserId);
  }

  const { count, error } = await queryBuilder;

  if (error) {
    console.error("[repo] isUsernameAvailable:", error.message);
    return false; // Assume not available on error
  }

  return count === 0;
}

/**
 * Get user's club memberships
 */
export async function getUserMemberships(db: DbClient, userId: string) {
  const { data, error } = await db
    .from("club_members")
    .select(
      `
      *,
      club:club_id(
        id,
        name,
        slug,
        avatar_url
      )
    `
    )
    .eq("user_id", userId);

  if (error) return handleListError(error, "getUserMemberships");

  return { data: data || [], error: null };
}

/**
 * Get user's activity stats
 */
export async function getUserStats(
  db: DbClient,
  userId: string
): Promise<{
  clubCount: number;
  festivalCount: number;
  movieCount: number;
  error: string | null;
}> {
  const defaultStats = { clubCount: 0, festivalCount: 0, movieCount: 0, error: null };

  // Count clubs
  const { count: clubCount, error: clubError } = await db
    .from("club_members")
    .select("*", { count: "exact", head: true })
    .eq("user_id", userId);

  if (clubError) {
    console.error("[repo] getUserStats.clubs:", clubError.message);
    return { ...defaultStats, error: clubError.message };
  }

  // Count festivals participated
  const { count: festivalCount, error: festivalError } = await db
    .from("nominations")
    .select("festival_id", { count: "exact", head: true })
    .eq("user_id", userId)
    .is("deleted_at", null);

  if (festivalError) {
    console.error("[repo] getUserStats.festivals:", festivalError.message);
    return { ...defaultStats, error: festivalError.message };
  }

  // Count movies rated
  const { count: movieCount, error: movieError } = await db
    .from("ratings")
    .select("*", { count: "exact", head: true })
    .eq("user_id", userId);

  if (movieError) {
    console.error("[repo] getUserStats.movies:", movieError.message);
    return { ...defaultStats, error: movieError.message };
  }

  return {
    clubCount: clubCount || 0,
    festivalCount: festivalCount || 0,
    movieCount: movieCount || 0,
    error: null,
  };
}
