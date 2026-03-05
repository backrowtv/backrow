import { createClient } from "@/lib/supabase/server";
import { Database } from "@/types/database";

type ActivityLog = Database["public"]["Tables"]["activity_log"]["Row"];
type Club = Database["public"]["Tables"]["clubs"]["Row"];

export interface ActivityUser {
  display_name: string;
  avatar_url: string | null;
  id?: string;
  social_links?: {
    avatar_icon?: string;
    avatar_color_index?: number;
    [key: string]: unknown;
  } | null;
}

export interface GroupedActivity {
  id: string;
  type: "single" | "group" | "combined";
  action_type: string | string[]; // Can be array for combined actions
  activities: ActivityLog[];
  users: ActivityUser[];
  target_name?: string;
  club_name?: string;
  club_id?: string;
  club_slug?: string;
  created_at: string;
  timeGroup?: "immediate" | "recent" | "daily";
  combinedActions?: {
    watched?: boolean;
    rated?: boolean;
    rating?: number;
  };
}

interface ActivityWithClub extends ActivityLog {
  user?: ActivityUser | null;
  club?: Club | null;
}

/**
 * Fetches and groups activity feed items for the current user.
 * Enforces privacy by ONLY showing activities from clubs the user is a member of.
 *
 * Advanced grouping strategies:
 * 1. Combine Related Actions: watch + rate from same user, same movie
 * 2. Group by Movie: multiple users rating same movie
 * 3. Time-Based Grouping: immediate (<5 min), recent (<1 hour), daily (>24 hours)
 */
export async function getGroupedActivityFeed(
  limit = 20,
  filters?: {
    types?: string[];
    clubId?: string;
  }
): Promise<GroupedActivity[]> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return [];

  // 1. Get user's club memberships
  const { data: memberships } = await supabase
    .from("club_members")
    .select("club_id")
    .eq("user_id", user.id);

  const myClubIds = memberships?.map((m) => m.club_id) || [];

  if (myClubIds.length === 0) return [];

  // Apply club filter if provided
  const clubIdsToQuery = filters?.clubId
    ? myClubIds.includes(filters.clubId)
      ? [filters.clubId]
      : []
    : myClubIds;

  if (clubIdsToQuery.length === 0) return [];

  // 2. Fetch raw activity log for these clubs with club settings
  const { data: rawActivities, error } = await supabase
    .from("activity_log")
    .select(
      `
      *,
      user:user_id(display_name, avatar_url, id, avatar_icon, avatar_color_index, avatar_border_color_index),
      club:club_id(id, name, slug, picture_url, avatar_icon, avatar_color_index, avatar_border_color_index)
    `
    )
    .in("club_id", clubIdsToQuery)
    .order("created_at", { ascending: false })
    .limit(limit * 3); // Fetch extra to account for grouping

  if (error || !rawActivities) return [];

  // Apply action type filters if provided
  let filteredActivities = rawActivities as ActivityWithClub[];
  if (filters?.types && filters.types.length > 0) {
    const filterTypes = filters.types; // Type guard
    filteredActivities = filteredActivities.filter((activity) => {
      // Map filter types to action patterns
      if (filterTypes.includes("personal") && activity.user_id === user.id) return true;
      if (filterTypes.includes("watch") && activity.action === "watched_movie") return true;
      if (filterTypes.includes("rate") && activity.action === "rated_movie") return true;
      if (filterTypes.includes("club_activity")) {
        const clubActions = [
          "festival_created",
          "festival_started",
          "festival_completed",
          "phase_changed",
          "deadline_changed",
          "theme_selected",
        ];
        if (clubActions.includes(activity.action)) return true;
      }
      if (filterTypes.includes("phase_change") && activity.action === "phase_changed") return true;
      if (filterTypes.includes("deadline_changed") && activity.action === "deadline_changed")
        return true;
      if (filterTypes.includes("user_activity") && activity.user_id !== user.id) return true;
      if (filterTypes.includes("discussions") && activity.action === "discussion_created")
        return true;
      return false;
    });
  }

  // 3. Advanced Grouping Logic
  const grouped = performAdvancedGrouping(filteredActivities, user.id);

  return grouped.slice(0, limit);
}

/**
 * Performs advanced grouping of activities:
 * 1. First pass: Combine related actions (watch + rate from same user, same movie)
 * 2. Second pass: Group by movie (multiple users, same action, same movie)
 * 3. Third pass: Time-based grouping
 */
function performAdvancedGrouping(
  activities: ActivityWithClub[],
  currentUserId: string
): GroupedActivity[] {
  if (activities.length === 0) return [];

  const grouped: GroupedActivity[] = [];

  // First pass: Combine watch + rate actions from same user, same movie (within 3 hours)
  const processed = new Set<string>();
  const combined: ActivityWithClub[][] = [];
  const THREE_HOURS_MS = 3 * 60 * 60 * 1000;

  for (let i = 0; i < activities.length; i++) {
    if (processed.has(activities[i].id)) continue;

    const activity = activities[i];
    if (!activity.created_at) continue;
    const activityTime = new Date(activity.created_at);

    // Look for related actions (watch + rate from same user, same movie)
    if (activity.action === "watched_movie" || activity.action === "rated_movie") {
      const relatedActions: ActivityWithClub[] = [activity];
      processed.add(activity.id);

      // Find related rate/watch action
      const tmdbId = (activity.details as { tmdb_id?: number })?.tmdb_id;
      const movieTitle = (activity.details as { movie_title?: string })?.movie_title;

      if (tmdbId || movieTitle) {
        for (let j = i + 1; j < activities.length; j++) {
          const other = activities[j];
          if (processed.has(other.id)) continue;

          if (!other.created_at) continue;
          const otherTime = new Date(other.created_at);
          const timeDiffBetween = Math.abs(activityTime.getTime() - otherTime.getTime());

          // Must be from same user, same movie, within 3 hours
          if (
            other.user_id === activity.user_id &&
            other.club_id === activity.club_id &&
            timeDiffBetween < THREE_HOURS_MS &&
            ((other.action === "watched_movie" && activity.action === "rated_movie") ||
              (other.action === "rated_movie" && activity.action === "watched_movie"))
          ) {
            const otherTmdbId = (other.details as { tmdb_id?: number })?.tmdb_id;
            const otherMovieTitle = (other.details as { movie_title?: string })?.movie_title;

            if (
              (tmdbId && otherTmdbId && tmdbId === otherTmdbId) ||
              (movieTitle && otherMovieTitle && movieTitle === otherMovieTitle)
            ) {
              relatedActions.push(other);
              processed.add(other.id);
              break; // Only combine one watch + one rate
            }
          }
        }
      }

      if (relatedActions.length > 1) {
        combined.push(relatedActions);
      } else {
        combined.push([activity]);
      }
    } else {
      combined.push([activity]);
      processed.add(activity.id);
    }
  }

  // Second pass: Group by movie (multiple users, same action, same movie)
  const movieGroups: Map<string, ActivityWithClub[]> = new Map();
  const singleActivities: ActivityWithClub[] = [];

  for (const group of combined) {
    const first = group[0];

    // Skip if already combined (watch + rate)
    if (
      group.length > 1 &&
      ((first.action === "watched_movie" && group.some((a) => a.action === "rated_movie")) ||
        (first.action === "rated_movie" && group.some((a) => a.action === "watched_movie")))
    ) {
      // This is a combined action, format it
      grouped.push(formatCombinedGroup(group, currentUserId));
      continue;
    }

    // Group by movie for same action type
    const tmdbId = (first.details as { tmdb_id?: number })?.tmdb_id;
    const movieTitle = (first.details as { movie_title?: string })?.movie_title;
    const action = first.action;

    // Only group rating/watching actions
    if ((action === "rated_movie" || action === "watched_movie") && (tmdbId || movieTitle)) {
      const key = `${first.club_id}-${action}-${tmdbId || movieTitle}`;
      if (!first.created_at) {
        singleActivities.push(...group);
        continue;
      }
      const firstTime = new Date(first.created_at);

      // Check if activities are within 3 hours (recent grouping)
      const existing = movieGroups.get(key);
      if (existing && existing.length > 0) {
        const lastActivity = existing[existing.length - 1];
        if (!lastActivity.created_at) {
          // If last activity has no timestamp, add to existing group anyway
          existing.push(...group);
        } else {
          const lastTime = new Date(lastActivity.created_at);
          const timeDiff = Math.abs(firstTime.getTime() - lastTime.getTime());

          if (timeDiff < THREE_HOURS_MS) {
            // Within 3 hours
            existing.push(...group);
          } else {
            // Time gap too large, create new group
            grouped.push(formatMovieGroup(existing, currentUserId));
            movieGroups.set(key, group);
          }
        }
      } else {
        movieGroups.set(key, group);
      }
    } else {
      // Single activity or non-groupable
      singleActivities.push(...group);
    }
  }

  // Flush remaining movie groups
  for (const group of movieGroups.values()) {
    grouped.push(formatMovieGroup(group, currentUserId));
  }

  // Add single activities
  for (const activity of singleActivities) {
    grouped.push(formatSingleActivity(activity, currentUserId));
  }

  // Sort by created_at (most recent first)
  grouped.sort((a, b) => {
    const timeA = new Date(a.created_at).getTime();
    const timeB = new Date(b.created_at).getTime();
    return timeB - timeA;
  });

  return grouped;
}

function formatCombinedGroup(
  activities: ActivityWithClub[],
  _currentUserId: string
): GroupedActivity {
  const watchActivity = activities.find((a) => a.action === "watched_movie");
  const rateActivity = activities.find((a) => a.action === "rated_movie");
  const first = watchActivity || rateActivity || activities[0];

  const users = Array.from(
    new Map(
      activities.filter((a) => a.user).map((a) => [a.user!.id || a.user_id, a.user!])
    ).values()
  );

  const rating = rateActivity ? (rateActivity.details as { rating?: number })?.rating : undefined;

  return {
    id: first.id,
    type: "combined",
    action_type: ["watched_movie", "rated_movie"],
    activities: activities,
    users: users,
    target_name:
      (first.details as { movie_title?: string })?.movie_title ||
      (first.details as { target_name?: string })?.target_name,
    club_name: first.club?.name,
    club_id: first.club_id || undefined,
    created_at: first.created_at || new Date().toISOString(),
    timeGroup: getTimeGroup(first.created_at || new Date().toISOString()),
    combinedActions: {
      watched: !!watchActivity,
      rated: !!rateActivity,
      rating: rating,
    },
  };
}

function formatMovieGroup(activities: ActivityWithClub[], _currentUserId: string): GroupedActivity {
  const first = activities[0];
  const isGroup = activities.length > 1;

  const users = Array.from(
    new Map(
      activities.filter((a) => a.user).map((a) => [a.user!.id || a.user_id, a.user!])
    ).values()
  );

  return {
    id: first.id,
    type: isGroup ? "group" : "single",
    action_type: first.action,
    activities: activities,
    users: users,
    target_name:
      (first.details as { movie_title?: string })?.movie_title ||
      (first.details as { target_name?: string })?.target_name,
    club_name: first.club?.name,
    club_id: first.club_id || undefined,
    created_at: first.created_at || new Date().toISOString(),
    timeGroup: getTimeGroup(first.created_at || new Date().toISOString()),
  };
}

function formatSingleActivity(activity: ActivityWithClub, _currentUserId: string): GroupedActivity {
  const user = activity.user ? [activity.user] : [];

  return {
    id: activity.id,
    type: "single",
    action_type: activity.action,
    activities: [activity],
    users: user,
    target_name:
      (activity.details as { movie_title?: string })?.movie_title ||
      (activity.details as { target_name?: string })?.target_name,
    club_name: activity.club?.name,
    club_id: activity.club_id || undefined,
    created_at: activity.created_at || new Date().toISOString(),
    timeGroup: getTimeGroup(activity.created_at || new Date().toISOString()),
  };
}

function getTimeGroup(createdAt: string): "immediate" | "recent" | "daily" {
  const now = new Date();
  const time = new Date(createdAt);
  const diffMs = now.getTime() - time.getTime();
  const diffMins = diffMs / (1000 * 60);
  const diffHours = diffMs / (1000 * 60 * 60);

  if (diffMins < 5) return "immediate";
  if (diffHours < 1) return "recent";
  return "daily";
}
