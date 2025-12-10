"use server";

/**
 * Club Query Actions
 *
 * Cached query helpers for fetching club data.
 * Uses Next.js 16 'use cache' directive for server-side caching.
 */

import { createClient } from "@/lib/supabase/server";
import { cacheLife, cacheTag } from "next/cache";
import { type FestivalPhase } from "@/lib/phase-labels";

/**
 * Get club by slug (cached for 1 hour)
 */
export async function getClubBySlug(slug: string) {
  "use cache";
  cacheLife("hours");
  cacheTag("club", `club-${slug}`);

  const supabase = await createClient();

  const { data: club, error } = await supabase
    .from("clubs")
    .select("*, users:producer_id(*)")
    .eq("slug", slug)
    .maybeSingle();

  if (error) {
    console.error("Error fetching club by slug:", error);
    return null;
  }

  return club;
}

/**
 * Get club members (cached for 1 hour)
 */
export async function getClubMembers(clubId: string) {
  "use cache";
  cacheLife("hours");
  cacheTag("club", `club-${clubId}`, "members");

  const supabase = await createClient();

  const { data: members, error } = await supabase
    .from("club_members")
    .select("*, user:user_id(*)")
    .eq("club_id", clubId);

  if (error) {
    console.error("Error fetching club members:", error);
    return [];
  }

  return members || [];
}

/**
 * Get club by ID (cached for 1 hour)
 */
export async function getClubById(clubId: string) {
  "use cache";
  cacheLife("hours");
  cacheTag("club", `club-${clubId}`);

  const supabase = await createClient();

  const { data: club, error } = await supabase
    .from("clubs")
    .select("*, users:producer_id(*)")
    .eq("id", clubId)
    .maybeSingle();

  if (error) {
    console.error("Error fetching club by id:", error);
    return null;
  }

  return club;
}

export type UserClubsData = {
  memberClubs: UserClub[];
  followingClubs: UserClub[];
};

export type UserClub = {
  id: string;
  name: string;
  slug: string | null;
  description: string | null;
  picture_url: string | null;
  theme_color: string | null;
  settings: Record<string, unknown> | null;
  privacy: string;
  member_count: number;
  festival_count: number;
  movies_watched: number;
  user_role?: string;
  is_favorite: boolean;
  festival_phase: FestivalPhase;
  ratings_enabled: boolean;
  genres: string[] | null;
  // Avatar columns (stored as proper columns, not in settings JSON)
  avatar_icon: string | null;
  avatar_color_index: number | null;
  avatar_border_color_index: number | null;
};

/**
 * Get user's clubs with all needed data for the clubs page
 * Uses optimized queries to avoid N+1 problems
 */
export async function getUserClubs(): Promise<UserClubsData> {
  const supabase = await createClient();

  // Get current user
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return { memberClubs: [], followingClubs: [] };
  }

  // Fetch memberships and favorites in parallel (avoid waterfall)
  const [membershipsResult, favoritesResult] = await Promise.all([
    supabase.from("club_members").select("club_id, role").eq("user_id", user.id),
    supabase.from("favorite_clubs").select("club_id").eq("user_id", user.id),
  ]);

  if (membershipsResult.error) {
    console.error("Error fetching memberships:", membershipsResult.error);
    return { memberClubs: [], followingClubs: [] };
  }

  const memberships = membershipsResult.data;
  const memberClubIds = memberships?.map((m) => m.club_id) || [];
  const membershipMap = new Map(memberships?.map((m) => [m.club_id, m.role]) || []);

  const favoriteClubIds = new Set(favoritesResult.data?.map((f) => f.club_id) || []);

  // Get clubs data if user has memberships
  let memberClubs: UserClub[] = [];

  if (memberClubIds.length > 0) {
    // Fetch clubs, festivals, member counts, festival counts, and nomination counts in parallel
    const [clubsResult, festivalsResult, countsResult, allFestivalsResult, nominationsResult] =
      await Promise.all([
        supabase
          .from("clubs")
          .select(
            "id, name, slug, description, picture_url, theme_color, settings, privacy, avatar_icon, avatar_color_index, avatar_border_color_index, genres"
          )
          .in("id", memberClubIds)
          .eq("archived", false),
        supabase
          .from("festivals")
          .select("club_id, phase")
          .in("club_id", memberClubIds)
          .in("status", ["nominating", "watching"]),
        supabase.from("club_members").select("club_id").in("club_id", memberClubIds),
        // Festival counts per club
        supabase
          .from("festivals")
          .select("club_id")
          .in("club_id", memberClubIds)
          .is("deleted_at", null),
        // Nomination counts (movies watched) per club
        supabase
          .from("nominations")
          .select("tmdb_id, festival_id, festivals!inner(club_id)")
          .in("festivals.club_id", memberClubIds)
          .is("deleted_at", null),
      ]);

    const clubs = clubsResult.data || [];
    const activeFestivals = festivalsResult.data || [];
    const counts = countsResult.data || [];
    const allFestivals = allFestivalsResult.data || [];
    const allNominations = nominationsResult.data || [];

    // Build phase map (first active festival per club)
    const clubFestivalPhase = new Map<string, FestivalPhase>();
    for (const f of activeFestivals) {
      if (!clubFestivalPhase.has(f.club_id)) {
        clubFestivalPhase.set(f.club_id, f.phase as FestivalPhase);
      }
    }

    // Build member count map
    const memberCounts = new Map<string, number>();
    for (const c of counts) {
      memberCounts.set(c.club_id, (memberCounts.get(c.club_id) || 0) + 1);
    }

    // Build festival count map
    const festivalCounts = new Map<string, number>();
    for (const f of allFestivals) {
      if (f.club_id) {
        festivalCounts.set(f.club_id, (festivalCounts.get(f.club_id) || 0) + 1);
      }
    }

    // Build movies watched count map
    const moviesWatchedCounts = new Map<string, number>();
    for (const n of allNominations as unknown as Array<{ festivals?: { club_id: string } }>) {
      const clubId = n.festivals?.club_id;
      if (clubId) {
        moviesWatchedCounts.set(clubId, (moviesWatchedCounts.get(clubId) || 0) + 1);
      }
    }

    // Transform to UserClub format
    memberClubs = clubs.map((club) => {
      const settings = (club.settings as Record<string, unknown>) || {};
      const ratingsEnabled = settings.club_ratings_enabled !== false;

      return {
        id: club.id,
        name: club.name,
        slug: club.slug,
        description: club.description,
        picture_url: club.picture_url,
        theme_color: club.theme_color,
        settings: club.settings as Record<string, unknown> | null,
        privacy: club.privacy,
        member_count: memberCounts.get(club.id) || 0,
        festival_count: festivalCounts.get(club.id) || 0,
        movies_watched: moviesWatchedCounts.get(club.id) || 0,
        user_role: membershipMap.get(club.id),
        is_favorite: favoriteClubIds.has(club.id),
        festival_phase: clubFestivalPhase.get(club.id) || null,
        ratings_enabled: ratingsEnabled,
        genres: (club as { genres?: string[] | null }).genres ?? null,
        // Avatar columns - read directly from columns
        avatar_icon: (club as { avatar_icon?: string | null }).avatar_icon ?? null,
        avatar_color_index:
          (club as { avatar_color_index?: number | null }).avatar_color_index ?? null,
        avatar_border_color_index:
          (club as { avatar_border_color_index?: number | null }).avatar_border_color_index ?? null,
      };
    });

    // Sort: favorites first, then active festivals
    memberClubs.sort((a, b) => {
      if (a.is_favorite && !b.is_favorite) return -1;
      if (!a.is_favorite && b.is_favorite) return 1;
      if (a.festival_phase && !b.festival_phase) return -1;
      if (!a.festival_phase && b.festival_phase) return 1;
      return 0;
    });
  }

  // Get following clubs (favorites that user is not a member of)
  let followingClubs: UserClub[] = [];
  const nonMemberFavoriteIds = [...favoriteClubIds].filter((id) => !memberClubIds.includes(id));

  if (nonMemberFavoriteIds.length > 0) {
    const [followedResult, followCountsResult] = await Promise.all([
      supabase
        .from("clubs")
        .select(
          "id, name, slug, description, picture_url, theme_color, settings, privacy, avatar_icon, avatar_color_index, avatar_border_color_index"
        )
        .in("id", nonMemberFavoriteIds)
        .in("privacy", ["public_open", "public_password", "public_invite", "public_request"])
        .eq("archived", false),
      supabase.from("club_members").select("club_id").in("club_id", nonMemberFavoriteIds),
    ]);

    const followedClubs = followedResult.data || [];
    const followCounts = followCountsResult.data || [];

    const followMemberCounts = new Map<string, number>();
    for (const c of followCounts) {
      followMemberCounts.set(c.club_id, (followMemberCounts.get(c.club_id) || 0) + 1);
    }

    followingClubs = followedClubs.map((club) => ({
      id: club.id,
      name: club.name,
      slug: club.slug,
      description: club.description,
      picture_url: club.picture_url,
      theme_color: club.theme_color,
      settings: club.settings as Record<string, unknown> | null,
      privacy: club.privacy,
      member_count: followMemberCounts.get(club.id) || 0,
      festival_count: 0,
      movies_watched: 0,
      user_role: undefined,
      is_favorite: true,
      festival_phase: null,
      ratings_enabled: false,
      genres: (club as { genres?: string[] | null }).genres ?? null,
      // Avatar columns - read directly from columns
      avatar_icon: (club as { avatar_icon?: string | null }).avatar_icon ?? null,
      avatar_color_index:
        (club as { avatar_color_index?: number | null }).avatar_color_index ?? null,
      avatar_border_color_index:
        (club as { avatar_border_color_index?: number | null }).avatar_border_color_index ?? null,
    }));
  }

  return { memberClubs, followingClubs };
}
