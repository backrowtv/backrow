/**
 * Festivals Repository
 *
 * Encapsulates all festival-related database queries.
 * Provides typed, reusable methods for accessing festival data.
 */

import { escapeLike } from "@/lib/security/postgrest-escape";
import {
  handleQueryError,
  handleListError,
  type DbClient,
  type Festival,
  type FestivalWithClub,
  type NominationWithDetails,
  type QueryResult,
  type ListResult,
} from "./types";

/**
 * Get a festival by its ID
 */
export async function getFestivalById(db: DbClient, id: string): Promise<QueryResult<Festival>> {
  const { data, error } = await db
    .from("festivals")
    .select("*")
    .eq("id", id)
    .is("deleted_at", null)
    .maybeSingle();

  if (error) return handleQueryError(error, "getFestivalById");

  return { data, error: null };
}

/**
 * Get a festival by club ID and slug
 */
export async function getFestivalBySlug(
  db: DbClient,
  clubId: string,
  slug: string
): Promise<QueryResult<Festival>> {
  const { data, error } = await db
    .from("festivals")
    .select("*")
    .eq("club_id", clubId)
    .eq("slug", slug)
    .is("deleted_at", null)
    .maybeSingle();

  if (error) return handleQueryError(error, "getFestivalBySlug");

  return { data, error: null };
}

/**
 * Get all festivals for a club
 */
export async function getFestivalsByClub(
  db: DbClient,
  clubId: string,
  options?: {
    status?: string | string[];
    limit?: number;
    includeDeleted?: boolean;
  }
): Promise<ListResult<Festival>> {
  const { status, limit, includeDeleted = false } = options || {};

  let queryBuilder = db
    .from("festivals")
    .select("*")
    .eq("club_id", clubId)
    .order("start_date", { ascending: false });

  if (!includeDeleted) {
    queryBuilder = queryBuilder.is("deleted_at", null);
  }

  if (status) {
    if (Array.isArray(status)) {
      queryBuilder = queryBuilder.in("status", status);
    } else {
      queryBuilder = queryBuilder.eq("status", status);
    }
  }

  if (limit) {
    queryBuilder = queryBuilder.limit(limit);
  }

  const { data, error } = await queryBuilder;

  if (error) return handleListError(error, "getFestivalsByClub");

  return { data: data || [], error: null };
}

/**
 * Get the active (watching) festival for a club
 */
export async function getActiveFestival(
  db: DbClient,
  clubId: string
): Promise<QueryResult<Festival>> {
  const { data, error } = await db
    .from("festivals")
    .select("*")
    .eq("club_id", clubId)
    .eq("status", "watching")
    .is("deleted_at", null)
    .maybeSingle();

  if (error) return handleQueryError(error, "getActiveFestival");

  return { data, error: null };
}

/**
 * Get the current festival for a club (any active status)
 */
export async function getCurrentFestival(
  db: DbClient,
  clubId: string
): Promise<QueryResult<Festival>> {
  const { data, error } = await db
    .from("festivals")
    .select("*")
    .eq("club_id", clubId)
    .in("status", ["nominating", "voting", "watching", "rating"])
    .is("deleted_at", null)
    .order("start_date", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) return handleQueryError(error, "getCurrentFestival");

  return { data, error: null };
}

/**
 * Get nominations for a festival
 */
export async function getFestivalNominations(
  db: DbClient,
  festivalId: string,
  options?: {
    includeDeleted?: boolean;
    userId?: string;
  }
): Promise<ListResult<NominationWithDetails>> {
  const { includeDeleted = false, userId } = options || {};

  let queryBuilder = db
    .from("nominations")
    .select(
      `
      *,
      movie:movies!inner(
        tmdb_id,
        title,
        year,
        poster_url,
        runtime,
        director,
        genres
      ),
      nominator:users!nominations_user_id_fkey(
        id,
        display_name,
        avatar_url
      )
    `
    )
    .eq("festival_id", festivalId)
    .order("created_at", { ascending: false });

  if (!includeDeleted) {
    queryBuilder = queryBuilder.is("deleted_at", null);
  }

  if (userId) {
    queryBuilder = queryBuilder.eq("user_id", userId);
  }

  const { data, error } = await queryBuilder;

  if (error) return handleListError(error, "getFestivalNominations");

  return { data: (data || []) as NominationWithDetails[], error: null };
}

/**
 * Get endless festival nominations by status
 */
export async function getEndlessNominations(
  db: DbClient,
  festivalId: string,
  endlessStatus: "pool" | "playing" | "completed"
): Promise<ListResult<NominationWithDetails>> {
  const { data, error } = await db
    .from("nominations")
    .select(
      `
      *,
      movie:movies!inner(
        tmdb_id,
        title,
        year,
        poster_url,
        runtime,
        director,
        genres
      ),
      nominator:users!nominations_user_id_fkey(
        id,
        display_name,
        avatar_url
      )
    `
    )
    .eq("festival_id", festivalId)
    .eq("endless_status", endlessStatus)
    .is("deleted_at", null)
    .order("created_at", { ascending: false });

  if (error) return handleListError(error, "getEndlessNominations");

  return { data: (data || []) as NominationWithDetails[], error: null };
}

/**
 * Search festivals by theme
 */
export async function searchFestivals(
  db: DbClient,
  query: string,
  options?: {
    limit?: number;
    clubId?: string;
  }
): Promise<ListResult<FestivalWithClub>> {
  const { limit = 10, clubId } = options || {};

  let queryBuilder = db
    .from("festivals")
    .select(
      `
      *,
      clubs:club_id(
        id,
        name,
        slug
      )
    `
    )
    .ilike("theme", `%${escapeLike(query)}%`)
    .is("deleted_at", null)
    .order("start_date", { ascending: false })
    .limit(limit);

  if (clubId) {
    queryBuilder = queryBuilder.eq("club_id", clubId);
  }

  const { data, error } = await queryBuilder;

  if (error) return handleListError(error, "searchFestivals");

  return { data: (data || []) as FestivalWithClub[], error: null };
}

/**
 * Get festival results
 */
export async function getFestivalResults(db: DbClient, festivalId: string) {
  const { data, error } = await db
    .from("festival_results")
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
    .eq("festival_id", festivalId)
    .order("total_points", { ascending: false });

  if (error) {
    console.error("[repo] getFestivalResults:", error.message);
    return { data: [], error: error.message };
  }

  return { data: data || [], error: null };
}

/**
 * Get a user's nomination count for a festival
 */
export async function getUserNominationCount(
  db: DbClient,
  festivalId: string,
  userId: string
): Promise<number> {
  const { count, error } = await db
    .from("nominations")
    .select("*", { count: "exact", head: true })
    .eq("festival_id", festivalId)
    .eq("user_id", userId)
    .is("deleted_at", null);

  if (error) {
    console.error("[repo] getUserNominationCount:", error.message);
    return 0;
  }

  return count || 0;
}
