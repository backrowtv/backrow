/**
 * Clubs Repository
 *
 * Encapsulates all club-related database queries.
 * Provides typed, reusable methods for accessing club data.
 */

import {
  handleQueryError,
  handleListError,
  type DbClient,
  type Club,
  type ClubWithProducer,
  type MemberWithUser,
  type QueryResult,
  type ListResult,
} from "./types";

/**
 * Get a club by its slug
 */
export async function getClubBySlug(
  db: DbClient,
  slug: string
): Promise<QueryResult<ClubWithProducer>> {
  const { data, error } = await db
    .from("clubs")
    .select("*, users:producer_id(*)")
    .eq("slug", slug)
    .maybeSingle();

  if (error) return handleQueryError(error, "getClubBySlug");

  return { data: data as ClubWithProducer | null, error: null };
}

/**
 * Get a club by its ID
 */
export async function getClubById(
  db: DbClient,
  id: string
): Promise<QueryResult<ClubWithProducer>> {
  const { data, error } = await db
    .from("clubs")
    .select("*, users:producer_id(*)")
    .eq("id", id)
    .maybeSingle();

  if (error) return handleQueryError(error, "getClubById");

  return { data: data as ClubWithProducer | null, error: null };
}

/**
 * Get all members of a club with their user data
 */
export async function getClubMembers(
  db: DbClient,
  clubId: string
): Promise<ListResult<MemberWithUser>> {
  const { data, error } = await db
    .from("club_members")
    .select("*, user:user_id(*)")
    .eq("club_id", clubId);

  if (error) return handleListError(error, "getClubMembers");

  return { data: (data || []) as MemberWithUser[], error: null };
}

/**
 * Get a user's membership in a club
 */
export async function getUserMembership(
  db: DbClient,
  clubId: string,
  userId: string
): Promise<QueryResult<MemberWithUser>> {
  const { data, error } = await db
    .from("club_members")
    .select("*, user:user_id(*)")
    .eq("club_id", clubId)
    .eq("user_id", userId)
    .maybeSingle();

  if (error) return handleQueryError(error, "getUserMembership");

  return { data: data as MemberWithUser | null, error: null };
}

/**
 * Check if a user is an admin (producer or director) of a club
 */
export async function isClubAdmin(db: DbClient, clubId: string, userId: string): Promise<boolean> {
  const { data } = await getUserMembership(db, clubId, userId);
  return data?.role === "producer" || data?.role === "director";
}

/**
 * Check if a user is the producer of a club
 */
export async function isClubProducer(
  db: DbClient,
  clubId: string,
  userId: string
): Promise<boolean> {
  const { data } = await getUserMembership(db, clubId, userId);
  return data?.role === "producer";
}

/**
 * Get clubs a user is a member of
 */
export async function getUserClubs(
  db: DbClient,
  userId: string
): Promise<ListResult<Club & { role: string }>> {
  const { data, error } = await db
    .from("club_members")
    .select("role, clubs:club_id(*)")
    .eq("user_id", userId);

  if (error) return handleListError(error, "getUserClubs");

  // Transform to flatten the structure
  const clubs = (data || [])
    .map((item) => {
      const clubData = Array.isArray(item.clubs) ? item.clubs[0] : item.clubs;
      return {
        ...(clubData as Club),
        role: item.role,
      };
    })
    .filter((club): club is Club & { role: string } => club.id !== undefined);

  return { data: clubs, error: null };
}

/**
 * Get user's favorite clubs
 */
export async function getUserFavoriteClubs(
  db: DbClient,
  userId: string
): Promise<ListResult<Club>> {
  const { data, error } = await db
    .from("favorite_clubs")
    .select("clubs:club_id(*)")
    .eq("user_id", userId);

  if (error) return handleListError(error, "getUserFavoriteClubs");

  // Transform to flatten the structure
  const clubs = (data || [])
    .map((item) => {
      return Array.isArray(item.clubs) ? item.clubs[0] : item.clubs;
    })
    .filter((club): club is Club => club !== null && club.id !== undefined);

  return { data: clubs, error: null };
}

/**
 * Search clubs by name
 */
export async function searchClubs(
  db: DbClient,
  query: string,
  options?: {
    limit?: number;
    includeArchived?: boolean;
    privacyFilter?: string[];
  }
): Promise<ListResult<Club>> {
  const { limit = 10, includeArchived = false, privacyFilter } = options || {};

  let queryBuilder = db
    .from("clubs")
    .select("*")
    .ilike("name", `%${query}%`)
    .order("name")
    .limit(limit);

  if (!includeArchived) {
    queryBuilder = queryBuilder.eq("archived", false);
  }

  if (privacyFilter && privacyFilter.length > 0) {
    queryBuilder = queryBuilder.in("privacy", privacyFilter);
  }

  const { data, error } = await queryBuilder;

  if (error) return handleListError(error, "searchClubs");

  return { data: data || [], error: null };
}

/**
 * Get public clubs for discovery
 */
export async function getPublicClubs(
  db: DbClient,
  options?: {
    limit?: number;
    offset?: number;
    featured?: boolean;
  }
): Promise<ListResult<Club>> {
  const { limit = 20, offset = 0, featured } = options || {};

  let queryBuilder = db
    .from("clubs")
    .select("*", { count: "exact" })
    .eq("archived", false)
    .in("privacy", ["public_open", "public_password", "public_request"])
    .order("created_at", { ascending: false })
    .range(offset, offset + limit - 1);

  if (featured !== undefined) {
    queryBuilder = queryBuilder.eq("featured", featured);
  }

  const { data, error, count } = await queryBuilder;

  if (error) return handleListError(error, "getPublicClubs");

  return { data: data || [], error: null, count: count || 0 };
}
