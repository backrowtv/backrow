"use server";

import { createClient } from "@/lib/supabase/server";
import type { MemberActivity } from "./member-activity.types";

/**
 * Get club members' watch status and ratings for a specific movie.
 * Returns all club members with their watch/rating data for the given tmdbId.
 */
export async function getMovieMemberActivity(
  clubId: string,
  tmdbId: number
): Promise<{ members: MemberActivity[] } | { error: string }> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { error: "Not authenticated" };
  }

  // Fetch club members (separate queries to avoid join/RLS issues)
  const { data: memberRows, error: membersError } = await supabase
    .from("club_members")
    .select("user_id, role")
    .eq("club_id", clubId);

  if (membersError || !memberRows || memberRows.length === 0) {
    return { error: "Failed to fetch club members" };
  }

  // Verify the requesting user is a member
  const isMember = memberRows.some((m) => m.user_id === user.id);
  if (!isMember) {
    return { error: "Not a member of this club" };
  }

  const memberUserIds = memberRows.map((m) => m.user_id);

  // Fetch user profiles, watch history, and ratings in parallel
  const [profilesResult, watchResult, ratingsResult] = await Promise.all([
    supabase
      .from("users")
      .select(
        "id, display_name, email, avatar_url, avatar_icon, avatar_color_index, avatar_border_color_index, username"
      )
      .in("id", memberUserIds),
    supabase
      .from("watch_history")
      .select("user_id, first_watched_at")
      .eq("tmdb_id", tmdbId)
      .in("user_id", memberUserIds),
    supabase
      .from("generic_ratings")
      .select("user_id, rating")
      .eq("tmdb_id", tmdbId)
      .in("user_id", memberUserIds),
  ]);

  // Build lookup maps
  const profileMap = new Map<
    string,
    typeof profilesResult.data extends (infer T)[] | null ? T : never
  >();
  profilesResult.data?.forEach((p) => {
    if (p.id) profileMap.set(p.id, p);
  });

  const watchMap = new Map<string, string>();
  watchResult.data?.forEach((w) => {
    if (w.user_id) watchMap.set(w.user_id, w.first_watched_at);
  });

  const ratingMap = new Map<string, number>();
  ratingsResult.data?.forEach((r) => {
    if (r.user_id && r.rating !== null) ratingMap.set(r.user_id, r.rating);
  });

  // Combine into member activity list
  const result: MemberActivity[] = memberRows.map((m) => {
    const profile = profileMap.get(m.user_id);
    return {
      userId: m.user_id,
      displayName: profile?.display_name || "Unknown",
      avatarUrl: profile?.avatar_url || null,
      avatarIcon: profile?.avatar_icon || null,
      avatarColorIndex: profile?.avatar_color_index ?? null,
      avatarBorderColorIndex: profile?.avatar_border_color_index ?? null,
      email: profile?.email || null,
      username: profile?.username || null,
      hasWatched: watchMap.has(m.user_id),
      watchedAt: watchMap.get(m.user_id) || null,
      rating: ratingMap.get(m.user_id) ?? null,
    };
  });

  return { members: result };
}
