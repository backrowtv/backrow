"use server";

/**
 * Member Query Actions
 *
 * Server actions for fetching club member data with computed stats.
 */

import { createClient } from "@/lib/supabase/server";
import type { Database } from "@/types/database";
import type { FestivalResults } from "@/types/festival-results";
import type { ClubSettings } from "@/types/club-settings";
import { resolveClub } from "@/lib/clubs/resolveClub";
import { getPendingRequests, type JoinRequest } from "@/app/actions/clubs";

type ClubMember = Database["public"]["Tables"]["club_members"]["Row"];
type User = Database["public"]["Tables"]["users"]["Row"];

export interface MemberWithStats extends ClubMember {
  users: User | null;
  user_stats: { last_active: string | null } | null;
  stats: {
    points: number;
    festivals: number;
    lastActive: string | null;
  };
}

export interface MembersPageData {
  clubId: string;
  clubSlug: string;
  clubName: string;
  clubPrivacy: string;
  clubSettings: ClubSettings;
  members: MemberWithStats[];
  currentUserId: string | null;
  currentUserRole: string | null;
  isAdmin: boolean;
  isProducer: boolean;
  joinRequests: JoinRequest[];
  requestsCount: number;
}

/**
 * Fetch all data needed for the members page
 */
export async function getMembersPageData(
  identifier: string
): Promise<{ data: MembersPageData | null; error: string | null }> {
  const supabase = await createClient();

  // Get current user
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { data: null, error: "Not authenticated" };
  }

  // Resolve club by slug or ID
  const clubResolution = await resolveClub(supabase, identifier);
  if (!clubResolution) {
    return { data: null, error: "Club not found" };
  }

  const clubId = clubResolution.id;
  const clubSlug = clubResolution.slug || clubId;

  // Fetch club data and membership in parallel
  const [clubResult, membershipResult] = await Promise.all([
    supabase.from("clubs").select("name, privacy, settings").eq("id", clubId).single(),
    supabase
      .from("club_members")
      .select("role")
      .eq("club_id", clubId)
      .eq("user_id", user.id)
      .maybeSingle(),
  ]);

  const club = clubResult.data;
  const membership = membershipResult.data;

  if (!club) {
    return { data: null, error: "Club not found" };
  }

  const clubName = club.name;
  const clubPrivacy = club.privacy || "private";
  const clubSettings = (club.settings as ClubSettings) || {};
  const currentUserRole = membership?.role || null;
  const isAdmin = currentUserRole === "producer" || currentUserRole === "director";
  const isProducer = currentUserRole === "producer";

  // Fetch members with user info
  const { data: membersData, error: membersError } = await supabase
    .from("club_members")
    .select(
      `
      *,
      users:user_id (
        id,
        email,
        display_name,
        avatar_url,
        username,
        avatar_icon,
        avatar_color_index,
        avatar_border_color_index
      )
    `
    )
    .eq("club_id", clubId)
    .order("role", { ascending: false })
    .order("joined_at", { ascending: true });

  if (membersError) {
    return { data: null, error: membersError.message };
  }

  // Get user IDs for fetching user_stats
  const userIds = (membersData || []).map((m) => m.user_id);

  // Fetch user_stats for last_active (separate query since no direct FK)
  const { data: userStatsData } = await supabase
    .from("user_stats")
    .select("user_id, last_active")
    .in("user_id", userIds);

  // Create a map for quick lookup
  const userStatsMap = new Map((userStatsData || []).map((s) => [s.user_id, s.last_active]));

  // Fetch completed festivals and results in parallel for stats calculation
  const { data: festivals } = await supabase
    .from("festivals")
    .select("id")
    .eq("club_id", clubId)
    .eq("status", "completed");

  const festivalIds = festivals?.map((f) => f.id) || [];

  // Get all results at once instead of per-member (N+1 fix)
  let resultsData: Array<{ results: unknown }> = [];
  if (festivalIds.length > 0) {
    const { data: results } = await supabase
      .from("festival_results")
      .select("results")
      .in("festival_id", festivalIds);
    resultsData = results || [];
  }

  // Calculate stats for each member from the results
  const membersWithStats: MemberWithStats[] = (membersData || []).map((member) => {
    let points = 0;
    let festivalsCount = 0;

    for (const result of resultsData) {
      const resultsObj = result.results as FestivalResults | null;
      if (resultsObj?.standings && Array.isArray(resultsObj.standings)) {
        const userEntry = resultsObj.standings.find((entry) => entry.user_id === member.user_id);
        if (userEntry) {
          points += userEntry.points;
          festivalsCount++;
        }
      }
    }

    // Get last_active from the map
    const lastActive = userStatsMap.get(member.user_id) || null;

    return {
      ...member,
      user_stats: null, // Not from join anymore
      stats: {
        points,
        festivals: festivalsCount,
        lastActive,
      },
    };
  });

  // Load join requests if admin and club is public_moderated
  let joinRequests: JoinRequest[] = [];
  let requestsCount = 0;

  if (isAdmin && clubPrivacy === "public_moderated") {
    const requestsResult = await getPendingRequests(clubId);
    if (requestsResult.requests) {
      joinRequests = requestsResult.requests as JoinRequest[];
      requestsCount = requestsResult.requests.length;
    }
  }

  return {
    data: {
      clubId,
      clubSlug,
      clubName,
      clubPrivacy,
      clubSettings,
      members: membersWithStats,
      currentUserId: user.id,
      currentUserRole,
      isAdmin,
      isProducer,
      joinRequests,
      requestsCount,
    },
    error: null,
  };
}

/**
 * Refresh members data (used after role updates or removals)
 */
export async function refreshMembersData(
  clubId: string
): Promise<{ members: MemberWithStats[]; error: string | null }> {
  const supabase = await createClient();

  // Fetch members with user info
  const { data: membersData, error: membersError } = await supabase
    .from("club_members")
    .select(
      `
      *,
      users:user_id (
        id,
        email,
        display_name,
        avatar_url,
        username,
        avatar_icon,
        avatar_color_index,
        avatar_border_color_index
      )
    `
    )
    .eq("club_id", clubId)
    .order("role", { ascending: false })
    .order("joined_at", { ascending: true });

  if (membersError) {
    return { members: [], error: membersError.message };
  }

  // Get user IDs for fetching user_stats
  const userIds = (membersData || []).map((m) => m.user_id);

  // Fetch user_stats for last_active (separate query since no direct FK)
  const { data: userStatsData } = await supabase
    .from("user_stats")
    .select("user_id, last_active")
    .in("user_id", userIds);

  // Create a map for quick lookup
  const userStatsMap = new Map((userStatsData || []).map((s) => [s.user_id, s.last_active]));

  // Fetch completed festivals
  const { data: festivals } = await supabase
    .from("festivals")
    .select("id")
    .eq("club_id", clubId)
    .eq("status", "completed");

  const festivalIds = festivals?.map((f) => f.id) || [];

  // Get all results at once
  let resultsData: Array<{ results: unknown }> = [];
  if (festivalIds.length > 0) {
    const { data: results } = await supabase
      .from("festival_results")
      .select("results")
      .in("festival_id", festivalIds);
    resultsData = results || [];
  }

  // Calculate stats for each member
  const membersWithStats: MemberWithStats[] = (membersData || []).map((member) => {
    let points = 0;
    let festivalsCount = 0;

    for (const result of resultsData) {
      const resultsObj = result.results as FestivalResults | null;
      if (resultsObj?.standings && Array.isArray(resultsObj.standings)) {
        const userEntry = resultsObj.standings.find((entry) => entry.user_id === member.user_id);
        if (userEntry) {
          points += userEntry.points;
          festivalsCount++;
        }
      }
    }

    // Get last_active from the map
    const lastActive = userStatsMap.get(member.user_id) || null;

    return {
      ...member,
      user_stats: null, // Not from join anymore
      stats: {
        points,
        festivals: festivalsCount,
        lastActive,
      },
    };
  });

  return { members: membersWithStats, error: null };
}
