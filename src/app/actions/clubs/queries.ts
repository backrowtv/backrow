"use server";

/**
 * Club Query Actions
 *
 * Cached query helpers for fetching club data.
 * Uses Next.js 16 'use cache' directive for server-side caching.
 */

import { createClient } from "@/lib/supabase/server";
import { cacheLife, cacheTag } from "next/cache";
import { CacheTags } from "@/lib/cache/invalidate";
import { type FestivalPhase } from "@/lib/phase-labels";

/**
 * Get club by slug (cached for 1 hour).
 * Tagged with the resolved club id so `invalidateClub(clubId)` busts it.
 */
export async function getClubBySlug(slug: string) {
  "use cache";
  cacheLife("hours");

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

  cacheTag(CacheTags.clubsIndex());
  if (!club) return null;

  cacheTag(CacheTags.club(club.id as string));
  return club;
}

/**
 * Get club members (cached for 1 hour)
 */
export async function getClubMembers(clubId: string) {
  "use cache";
  cacheLife("hours");
  cacheTag(CacheTags.club(clubId));

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
  cacheTag(CacheTags.club(clubId));

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

type ClubStatsRow = {
  club_id: string;
  member_count: number;
  festival_count: number;
  movies_watched: number;
  active_festival_phase: string | null;
};

/**
 * Get user's clubs with all needed data for the clubs page.
 * Uses the `get_user_club_stats` RPC (migration 0014) to push aggregation
 * server-side instead of pulling all nominations and counting in JS.
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

  let memberClubs: UserClub[] = [];

  if (memberClubIds.length > 0) {
    const [clubsResult, statsResult] = await Promise.all([
      supabase
        .from("clubs")
        .select(
          "id, name, slug, description, picture_url, theme_color, settings, privacy, avatar_icon, avatar_color_index, avatar_border_color_index, genres"
        )
        .in("id", memberClubIds)
        .eq("archived", false),
      supabase.rpc("get_user_club_stats", { p_user_id: user.id }),
    ]);

    const clubs = clubsResult.data || [];
    const stats = (statsResult.data ?? []) as ClubStatsRow[];
    const statsByClub = new Map(stats.map((s) => [s.club_id, s]));

    memberClubs = clubs.map((club) => {
      const settings = (club.settings as Record<string, unknown>) || {};
      const ratingsEnabled = settings.club_ratings_enabled !== false;
      const s = statsByClub.get(club.id);

      return {
        id: club.id,
        name: club.name,
        slug: club.slug,
        description: club.description,
        picture_url: club.picture_url,
        theme_color: club.theme_color,
        settings: club.settings as Record<string, unknown> | null,
        privacy: club.privacy,
        member_count: s?.member_count ?? 0,
        festival_count: s?.festival_count ?? 0,
        movies_watched: s?.movies_watched ?? 0,
        user_role: membershipMap.get(club.id),
        is_favorite: favoriteClubIds.has(club.id),
        festival_phase: (s?.active_festival_phase as FestivalPhase | null) ?? null,
        ratings_enabled: ratingsEnabled,
        genres: (club as { genres?: string[] | null }).genres ?? null,
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
