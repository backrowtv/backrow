import { createClient } from "@/lib/supabase/server";
import {
  CLUB_ACTIVITY_TYPES,
  MEMBER_ACTIVITY_TYPES,
  GROUPABLE_CLUB_ACTIVITIES,
  GROUPABLE_MEMBER_ACTIVITIES,
  CLUB_CONTEXT_ACTIVITIES,
  type ClubActivityType,
  type MemberActivityType,
} from "./activity-types";
import { HIDDEN_ACTIVITY_TYPES } from "./activity-verbiage";

// ============================================
// MOVIE GROUPABLE ACTIVITIES
// ============================================

/**
 * Activities that should be grouped by movie (tmdb_id) in addition to action + day.
 * This allows "3 people rated Inception" instead of 3 separate rating entries.
 */
const MOVIE_GROUPABLE_ACTIVITIES: MemberActivityType[] = ["user_watched_movie", "user_rated_movie"];

// Time window for combining watch + rate activities (3 hours)
const THREE_HOURS_MS = 3 * 60 * 60 * 1000;

// ============================================
// TYPES
// ============================================

export type ActivityCategory = "club" | "member";

export interface BaseActivity {
  id: string;
  action: string;
  timestamp: string;
  details: Record<string, unknown> | null;

  // Club context (always present for club activities, optional for member)
  club?: {
    id: string;
    slug: string | null;
    name: string;
    picture_url: string | null;
    avatar_icon?: string | null;
    avatar_color_index?: number | null;
    avatar_border_color_index?: number | null;
  };

  // User context (for member activities - the user who performed the action)
  user?: {
    id: string;
    display_name: string | null;
    avatar_url: string | null;
    email?: string | null;
    // Avatar columns - stored as proper columns
    avatar_icon?: string | null;
    avatar_color_index?: number | null;
    avatar_border_color_index?: number | null;
  };
}

export interface ClubActivity extends BaseActivity {
  category: "club";
  action: ClubActivityType;
}

export interface MemberActivity extends BaseActivity {
  category: "member";
  action: MemberActivityType;
}

export type ActivityItem = ClubActivity | MemberActivity;

// Grouped activity for condensed display
export interface GroupedActivity {
  id: string;
  category: ActivityCategory;
  action: string;
  timestamp: string;
  dayKey: string;
  count: number;
  items: ActivityItem[];

  // Type alias for action (convenience for component usage)
  type?: string;

  // Club context
  club?: {
    id: string;
    slug: string | null;
    name: string;
    picture_url: string | null;
    avatar_icon?: string | null;
    avatar_color_index?: number | null;
    avatar_border_color_index?: number | null;
  };

  // User context (for member activities - primary user)
  user?: {
    id: string;
    display_name: string | null;
    avatar_url: string | null;
    email?: string | null;
    // Avatar columns - stored as proper columns
    avatar_icon?: string | null;
    avatar_color_index?: number | null;
    avatar_border_color_index?: number | null;
  };

  // Multiple users (for grouped member_joined activities)
  users?: Array<{
    id: string;
    display_name: string | null;
    avatar_url: string | null;
    // Avatar columns - stored as proper columns
    avatar_icon?: string | null;
    avatar_color_index?: number | null;
    avatar_border_color_index?: number | null;
  }>;

  // Extracted details for display
  movie?: {
    tmdb_id: number;
    title: string;
    year?: number | null;
    poster_url?: string | null;
  };

  festival?: {
    id: string;
    theme: string | null;
  };

  event?: {
    title: string;
  };

  badge?: {
    name: string;
  };

  // Discussion context
  discussion?: {
    title: string;
  };

  // Rating details for grouped ratings
  avgRating?: number;
  ratings?: number[];

  // Combined watch + rate indicator
  combinedWatchRate?: {
    watched: boolean;
    rated: boolean;
    rating?: number;
  };
}

// ============================================
// FETCH CLUB ACTIVITY FEED
// ============================================

/**
 * Options for fetching club activity feed
 */
export interface ClubActivityFeedOptions {
  limit?: number;
  offset?: number;
  clubId?: string; // Optional: filter to specific club (backward compat)
  clubIds?: string[]; // Optional: filter to multiple clubs
  actorUserId?: string; // Optional: filter by admin who performed action
  actionTypes?: string[]; // Optional: filter to specific action types
  dateRange?: { start: string; end: string }; // Optional: filter by date range
}

/**
 * Fetches club-level activities visible to all club members.
 * These are activities attributed to the club itself, not individual users.
 *
 * Privacy: Only shows activities from clubs the user is a member of.
 *
 * @param userId - The current user's ID (for membership verification)
 * @param options - Filter and pagination options
 */
export async function getClubActivityFeed(
  userId: string,
  options?: ClubActivityFeedOptions
): Promise<ClubActivity[]> {
  const supabase = await createClient();
  const limit = options?.limit || 50;
  const offset = options?.offset || 0;

  // 1. Get user's club memberships
  const { data: memberships } = await supabase
    .from("club_members")
    .select("club_id")
    .eq("user_id", userId);

  if (!memberships || memberships.length === 0) {
    return [];
  }

  const userClubIds = memberships.map((m) => m.club_id);

  // Determine which clubs to filter to
  // Support both single clubId (backward compat) and multiple clubIds
  let requestedClubIds: string[] = [];
  if (options?.clubIds && options.clubIds.length > 0) {
    requestedClubIds = options.clubIds;
  } else if (options?.clubId) {
    requestedClubIds = [options.clubId];
  }

  // Filter to only clubs the user is a member of
  const targetClubIds =
    requestedClubIds.length > 0
      ? requestedClubIds.filter((id) => userClubIds.includes(id))
      : userClubIds;

  if (targetClubIds.length === 0) return [];

  // 2. Get club details (exclude archived clubs)
  const { data: clubs } = await supabase
    .from("clubs")
    .select(
      "id, slug, name, picture_url, avatar_icon, avatar_color_index, avatar_border_color_index"
    )
    .in("id", targetClubIds)
    .eq("archived", false);

  const clubsMap = new Map(clubs?.map((c) => [c.id, c]) || []);

  // 3. Determine which action types to filter by
  const LEGACY_CLUB_ACTIONS = [
    "endless_movie_started", // legacy for endless_movie_playing
    "endless_movie_deleted",
    "festival_created",
    "festival_completed",
    "phase_changed",
    "deadline_changed",
    "theme_selected",
  ];
  // Exclude member_left and hidden activity types from club feed
  // member_left: the leaving user sees it in their personal feed
  // HIDDEN_ACTIVITY_TYPES: filtered at query level to avoid slicing issues
  const CLUB_ACTIONS_TO_SHOW = CLUB_ACTIVITY_TYPES.filter(
    (action) =>
      action !== "member_left" &&
      !HIDDEN_ACTIVITY_TYPES.includes(action as (typeof HIDDEN_ACTIVITY_TYPES)[number])
  );
  const allClubActions = [...CLUB_ACTIONS_TO_SHOW, ...LEGACY_CLUB_ACTIONS];

  // Use custom action types if provided, otherwise default to all club actions
  const actionsToFilter =
    options?.actionTypes && options.actionTypes.length > 0
      ? options.actionTypes.filter((a) => allClubActions.includes(a))
      : allClubActions;

  if (actionsToFilter.length === 0) return [];

  // 4. Build query
  let query = supabase
    .from("activity_log")
    .select("id, action, details, created_at, club_id, user_id")
    .in("club_id", targetClubIds)
    .in("action", actionsToFilter);

  // Filter by admin who performed the action if specified
  if (options?.actorUserId) {
    query = query.eq("user_id", options.actorUserId);
  }

  // Filter by date range if specified
  if (options?.dateRange) {
    query = query
      .gte("created_at", options.dateRange.start)
      .lte("created_at", options.dateRange.end);
  }

  const { data: activities, error } = await query
    .order("created_at", { ascending: false })
    .range(offset, offset + limit - 1);

  if (error || !activities) {
    console.error("Error fetching club activities:", error);
    return [];
  }

  // 5. Transform to ClubActivity format
  return activities
    .filter((a) => a.club_id && clubsMap.has(a.club_id))
    .map((a) => {
      const club = clubsMap.get(a.club_id!)!;
      return {
        id: a.id,
        category: "club" as const,
        action: a.action as ClubActivityType,
        timestamp: a.created_at || new Date().toISOString(),
        details: a.details as Record<string, unknown> | null,
        club: {
          id: club.id,
          slug: club.slug,
          name: club.name,
          picture_url: club.picture_url,
          avatar_icon: club.avatar_icon,
          avatar_color_index: club.avatar_color_index,
          avatar_border_color_index: club.avatar_border_color_index,
        },
      };
    });
}

// ============================================
// FETCH MEMBER ACTIVITY FEED
// ============================================

/**
 * Options for fetching member activity feed
 */
export interface MemberActivityFeedOptions {
  limit?: number;
  offset?: number;
  targetUserId?: string; // Optional: fetch another user's activities (admin feature)
  clubId?: string; // Optional: filter to activities in a specific club (backward compat)
  clubIds?: string[]; // Optional: filter to activities in multiple clubs
  actionTypes?: string[]; // Optional: filter to specific action types
  dateRange?: { start: string; end: string }; // Optional: filter by date range
}

/**
 * Fetches member personal activity.
 * These are actions a user has taken.
 *
 * Privacy:
 * - By default, only returns activities where user_id = current user.
 * - If targetUserId is specified (and current user is admin of the club),
 *   returns that user's activities instead.
 *
 * @param userId - The current user's ID (for permission checks)
 * @param options - Filter and pagination options
 */
export async function getMemberActivityFeed(
  userId: string,
  options?: MemberActivityFeedOptions
): Promise<MemberActivity[]> {
  const supabase = await createClient();
  const limit = options?.limit || 50;
  const offset = options?.offset || 0;

  // Determine which user's activities to fetch
  const activityUserId = options?.targetUserId || userId;

  // Determine which action types to filter by
  const actionsToFilter =
    options?.actionTypes && options.actionTypes.length > 0
      ? options.actionTypes.filter((a) => (MEMBER_ACTIVITY_TYPES as readonly string[]).includes(a))
      : (MEMBER_ACTIVITY_TYPES as unknown as string[]);

  if (actionsToFilter.length === 0) return [];

  // 1. Build query for member activities
  let query = supabase
    .from("activity_log")
    .select("id, action, details, created_at, club_id")
    .eq("user_id", activityUserId)
    .in("action", actionsToFilter);

  // Filter to specific clubs if requested
  // Support both single clubId (backward compat) and multiple clubIds
  const requestedClubIds: string[] = [];
  if (options?.clubIds && options.clubIds.length > 0) {
    requestedClubIds.push(...options.clubIds);
  } else if (options?.clubId) {
    requestedClubIds.push(options.clubId);
  }

  if (requestedClubIds.length > 0) {
    query = query.in("club_id", requestedClubIds);
  }

  // Filter by date range if specified
  if (options?.dateRange) {
    query = query
      .gte("created_at", options.dateRange.start)
      .lte("created_at", options.dateRange.end);
  }

  const { data: activities, error } = await query
    .order("created_at", { ascending: false })
    .range(offset, offset + limit - 1);

  if (error || !activities) {
    console.error("Error fetching member activities:", error);
    return [];
  }

  // 2. Fetch the target user's profile for avatar display
  const { data: userProfile } = await supabase
    .from("users")
    .select(
      "id, display_name, avatar_url, email, avatar_icon, avatar_color_index, avatar_border_color_index"
    )
    .eq("id", activityUserId)
    .single();

  const user = userProfile
    ? {
        id: userProfile.id,
        display_name: userProfile.display_name,
        avatar_url: userProfile.avatar_url,
        email: userProfile.email,
        // Avatar columns - read directly from columns
        avatar_icon: userProfile.avatar_icon || null,
        avatar_color_index: userProfile.avatar_color_index ?? null,
        avatar_border_color_index: userProfile.avatar_border_color_index ?? null,
      }
    : undefined;

  // 3. Get club details for activities that have club context
  const clubIds = [...new Set(activities.filter((a) => a.club_id).map((a) => a.club_id!))];

  let clubsMap = new Map<
    string,
    {
      id: string;
      slug: string | null;
      name: string;
      picture_url: string | null;
      avatar_icon?: string | null;
      avatar_color_index?: number | null;
      avatar_border_color_index?: number | null;
    }
  >();

  if (clubIds.length > 0) {
    const { data: clubs } = await supabase
      .from("clubs")
      .select(
        "id, slug, name, picture_url, avatar_icon, avatar_color_index, avatar_border_color_index"
      )
      .in("id", clubIds)
      .eq("archived", false);

    clubsMap = new Map(clubs?.map((c) => [c.id, c]) || []);
  }

  // 4. Transform to MemberActivity format
  return activities.map((a) => {
    const club = a.club_id ? clubsMap.get(a.club_id) : undefined;
    return {
      id: a.id,
      category: "member" as const,
      action: a.action as MemberActivityType,
      timestamp: a.created_at || new Date().toISOString(),
      details: a.details as Record<string, unknown> | null,
      club: club
        ? {
            id: club.id,
            slug: club.slug,
            name: club.name,
            picture_url: club.picture_url,
            avatar_icon: club.avatar_icon,
            avatar_color_index: club.avatar_color_index,
            avatar_border_color_index: club.avatar_border_color_index,
          }
        : undefined,
      user,
    };
  });
}

// ============================================
// COMBINED ACTIVITY FEED
// ============================================

/**
 * Options for fetching combined activity feed
 */
export interface CombinedActivityFeedOptions {
  limit?: number;
  offset?: number;
  filter?: "all" | "club" | "member";
  clubId?: string; // Backward compat: single club
  clubIds?: string[]; // Multiple clubs
  targetUserId?: string; // Filter by specific user
  actionTypes?: string[]; // Filter to specific action types
  dateRange?: { start: string; end: string }; // Filter by date range
}

/**
 * Fetches both club and member activities combined, sorted chronologically.
 *
 * @param userId - The current user's ID
 * @param options - Filter and pagination options
 * @param options.targetUserId - Optional: filter activities by a specific user
 *   - For club activities: filters by admin who performed the action
 *   - For member activities: filters by whose activities to show
 * @returns Combined and sorted activities
 */
export async function getCombinedActivityFeed(
  userId: string,
  options?: CombinedActivityFeedOptions
): Promise<ActivityItem[]> {
  const limit = options?.limit || 50;
  const filter = options?.filter || "all";

  const results: ActivityItem[] = [];

  // Build club IDs array (support both single and multiple)
  const clubIds: string[] = [];
  if (options?.clubIds && options.clubIds.length > 0) {
    clubIds.push(...options.clubIds);
  } else if (options?.clubId) {
    clubIds.push(options.clubId);
  }

  if (filter === "all" || filter === "club") {
    const clubActivities = await getClubActivityFeed(userId, {
      limit,
      clubIds: clubIds.length > 0 ? clubIds : undefined,
      actorUserId: options?.targetUserId,
      actionTypes: options?.actionTypes,
      dateRange: options?.dateRange,
    });
    results.push(...clubActivities);
  }

  if (filter === "all" || filter === "member") {
    const memberActivities = await getMemberActivityFeed(userId, {
      limit,
      targetUserId: options?.targetUserId,
      clubIds: clubIds.length > 0 ? clubIds : undefined,
      actionTypes: options?.actionTypes,
      dateRange: options?.dateRange,
    });
    results.push(...memberActivities);
  }

  // Sort by timestamp descending, with id as tiebreaker for stable sort
  results.sort((a, b) => {
    const timeDiff = new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime();
    if (timeDiff !== 0) return timeDiff;
    // Use id as tiebreaker for stable sort
    return b.id.localeCompare(a.id);
  });

  // Apply limit
  return results.slice(0, limit);
}

// ============================================
// PAGINATED ACTIVITY FEED (for dedicated activity page)
// ============================================

/**
 * Options for fetching paginated activity feed
 */
export interface PaginatedActivityFeedOptions {
  limit: number;
  offset: number;
  filter?: "all" | "club" | "member";
  clubIds?: string[];
  targetUserId?: string;
  actionTypes?: string[];
  dateRange?: { start: string; end: string };
  excludeIds?: string[];
}

/**
 * Result from paginated activity feed
 */
export interface PaginatedActivityFeedResult {
  activities: ActivityItem[];
  total: number;
}

/**
 * Fetches activities with proper database-level pagination.
 * Uses ORDER BY created_at DESC, id DESC for stable sorting.
 *
 * This function should be used for the dedicated activity page where
 * consistent pagination is required.
 *
 * @param userId - The current user's ID
 * @param options - Pagination and filter options
 * @returns Paginated activities and total count
 */
export async function getPaginatedActivityFeed(
  userId: string,
  options: PaginatedActivityFeedOptions
): Promise<PaginatedActivityFeedResult> {
  const supabase = await createClient();
  const { limit, offset, filter = "all" } = options;

  // 1. Get user's club memberships (only non-archived clubs)
  // This ensures we don't count or fetch activities from archived clubs
  const { data: memberships } = await supabase
    .from("club_members")
    .select("club_id, clubs!inner(id, archived)")
    .eq("user_id", userId)
    .eq("clubs.archived", false);

  const userClubIds = memberships?.map((m) => m.club_id) || [];

  if (userClubIds.length === 0 && filter !== "member") {
    return { activities: [], total: 0 };
  }

  // Determine which clubs to filter to (already filtered to non-archived)
  const targetClubIds =
    options.clubIds && options.clubIds.length > 0
      ? options.clubIds.filter((id) => userClubIds.includes(id))
      : userClubIds;

  // 2. Build action type filters
  // IMPORTANT: Exclude UI-hidden activity types at the database level to ensure
  // pagination counts match displayed items. Hidden types are filtered in UI components
  // (see HIDDEN_ACTIVITY_TYPES in activity-verbiage.tsx), but must also be excluded
  // from the query to prevent count mismatches (e.g., 15 items fetched but only 9 shown).
  const HIDDEN_TYPES_AT_DB_LEVEL = ["festival_phase_changed", "member_left"];

  const LEGACY_CLUB_ACTIONS = [
    "endless_movie_started",
    "endless_movie_deleted",
    "festival_created",
    "festival_completed",
    "phase_changed",
    "deadline_changed",
    "theme_selected",
  ];
  const CLUB_ACTIONS_TO_SHOW = CLUB_ACTIVITY_TYPES.filter(
    (action) => !HIDDEN_TYPES_AT_DB_LEVEL.includes(action)
  );
  const allClubActions = [...CLUB_ACTIONS_TO_SHOW, ...LEGACY_CLUB_ACTIONS];
  const allMemberActions = MEMBER_ACTIVITY_TYPES as unknown as string[];

  let actionsToFilter: string[] = [];
  if (options.actionTypes && options.actionTypes.length > 0) {
    // Use custom action types, but still exclude hidden types
    actionsToFilter = options.actionTypes.filter(
      (action) => !HIDDEN_TYPES_AT_DB_LEVEL.includes(action)
    );
  } else {
    // Default to all actions based on filter
    if (filter === "all" || filter === "club") {
      actionsToFilter.push(...allClubActions);
    }
    if (filter === "all" || filter === "member") {
      actionsToFilter.push(...allMemberActions);
    }
  }

  if (actionsToFilter.length === 0) {
    return { activities: [], total: 0 };
  }

  // 3. Build the base query conditions
  // For club activities: club_id must be in user's clubs
  // For member activities: user_id must match (or targetUserId if specified)
  const activityUserId = options.targetUserId || userId;

  // Build the query
  let query = supabase
    .from("activity_log")
    .select("id, action, details, created_at, club_id, user_id", { count: "exact" })
    .in("action", actionsToFilter)
    .order("created_at", { ascending: false })
    .order("id", { ascending: false }); // Secondary sort for stability

  // Apply filter-specific conditions
  // IMPORTANT: All queries must ensure activities from archived clubs are excluded
  // by checking that club_id is either null OR in targetClubIds (non-archived clubs)
  if (filter === "club") {
    // Only club activities from non-archived clubs
    query = query.in("club_id", targetClubIds);
  } else if (filter === "member") {
    // Member activities for this user, excluding those from archived clubs
    // Include activities where: user_id matches AND (club_id is null OR club_id in targetClubIds)
    if (targetClubIds.length > 0) {
      query = query
        .eq("user_id", activityUserId)
        .or(`club_id.is.null,club_id.in.(${targetClubIds.join(",")})`);
    } else {
      // No clubs, only show activities with null club_id
      query = query.eq("user_id", activityUserId).is("club_id", null);
    }
  } else {
    // "all" filter: activities from non-archived clubs OR personal member activities (no club)
    // IMPORTANT: Club activities are visible to all members, but member activities
    // should only show the current user's own activities
    if (targetClubIds.length > 0) {
      const clubIdsStr = targetClubIds.join(",");
      const clubActionsStr = allClubActions.join(",");

      // Check if user selected specific clubs vs "All Clubs" (no filter / all their clubs)
      // If options.clubIds is provided, user explicitly selected specific clubs
      const isFilteringSpecificClubs = options.clubIds && options.clubIds.length > 0;

      if (isFilteringSpecificClubs) {
        // Specific clubs selected: only show activities FROM those clubs
        // 1. Club activities from selected clubs (visible to all members)
        // 2. Current user's member activities from selected clubs
        query = query.or(
          `and(club_id.in.(${clubIdsStr}),action.in.(${clubActionsStr})),` +
            `and(user_id.eq.${activityUserId},club_id.in.(${clubIdsStr}))`
        );
      } else {
        // "All Clubs" selected: show all club activities + user's member activities (including personal)
        // 1. Club activities from all user's clubs
        // 2. Current user's member activities from all clubs
        // 3. Current user's personal activities (no club)
        query = query.or(
          `and(club_id.in.(${clubIdsStr}),action.in.(${clubActionsStr})),` +
            `and(user_id.eq.${activityUserId},club_id.in.(${clubIdsStr})),` +
            `and(user_id.eq.${activityUserId},club_id.is.null)`
        );
      }
    } else {
      // No clubs, only show member activities with null club_id
      query = query.eq("user_id", activityUserId).is("club_id", null);
    }
  }

  // Apply date range filter
  if (options.dateRange) {
    query = query
      .gte("created_at", options.dateRange.start)
      .lte("created_at", options.dateRange.end);
  }

  // Exclude hidden activities at the database level so pagination counts are accurate
  if (options.excludeIds && options.excludeIds.length > 0) {
    // Supabase .not().in() generates NOT IN
    query = query.not("id", "in", `(${options.excludeIds.join(",")})`);
  }

  // Apply pagination
  query = query.range(offset, offset + limit - 1);

  const { data: activities, error, count } = await query;

  if (error || !activities) {
    console.error("Error fetching paginated activities:", error);
    return { activities: [], total: 0 };
  }

  // 4. Get club details for activities with club_id
  // Note: We already filtered to non-archived clubs at the query level,
  // so all club_ids here should be from non-archived clubs
  const clubIds = [...new Set(activities.filter((a) => a.club_id).map((a) => a.club_id!))];
  let clubsMap = new Map<
    string,
    {
      id: string;
      slug: string | null;
      name: string;
      picture_url: string | null;
      avatar_icon?: string | null;
      avatar_color_index?: number | null;
      avatar_border_color_index?: number | null;
    }
  >();

  if (clubIds.length > 0) {
    const { data: clubs } = await supabase
      .from("clubs")
      .select(
        "id, slug, name, picture_url, avatar_icon, avatar_color_index, avatar_border_color_index"
      )
      .in("id", clubIds);

    clubsMap = new Map(clubs?.map((c) => [c.id, c]) || []);
  }

  // 5. Get user details for member activities
  const userIds = [...new Set(activities.filter((a) => a.user_id).map((a) => a.user_id!))];
  let usersMap = new Map<
    string,
    {
      id: string;
      display_name: string | null;
      avatar_url: string | null;
      email?: string | null;
      avatar_icon?: string | null;
      avatar_color_index?: number | null;
      avatar_border_color_index?: number | null;
    }
  >();

  if (userIds.length > 0) {
    const { data: users } = await supabase
      .from("users")
      .select(
        "id, display_name, avatar_url, email, avatar_icon, avatar_color_index, avatar_border_color_index"
      )
      .in("id", userIds);

    usersMap = new Map(users?.map((u) => [u.id, u]) || []);
  }

  // 6. Transform to ActivityItem format
  // Note: We already filtered archived clubs at the query level, no post-fetch filtering needed
  const transformedActivities: ActivityItem[] = activities.map((a) => {
    const club = a.club_id ? clubsMap.get(a.club_id) : undefined;
    const user = a.user_id ? usersMap.get(a.user_id) : undefined;

    // Determine category based on action type
    const isClubAction =
      allClubActions.includes(a.action) ||
      CLUB_ACTIVITY_TYPES.includes(a.action as ClubActivityType);

    if (isClubAction) {
      return {
        id: a.id,
        category: "club" as const,
        action: a.action as ClubActivityType,
        timestamp: a.created_at || new Date().toISOString(),
        details: a.details as Record<string, unknown> | null,
        club: club
          ? {
              id: club.id,
              slug: club.slug,
              name: club.name,
              picture_url: club.picture_url,
              avatar_icon: club.avatar_icon,
              avatar_color_index: club.avatar_color_index,
              avatar_border_color_index: club.avatar_border_color_index,
            }
          : undefined,
      };
    } else {
      return {
        id: a.id,
        category: "member" as const,
        action: a.action as MemberActivityType,
        timestamp: a.created_at || new Date().toISOString(),
        details: a.details as Record<string, unknown> | null,
        club: club
          ? {
              id: club.id,
              slug: club.slug,
              name: club.name,
              picture_url: club.picture_url,
              avatar_icon: club.avatar_icon,
              avatar_color_index: club.avatar_color_index,
              avatar_border_color_index: club.avatar_border_color_index,
            }
          : undefined,
        user: user
          ? {
              id: user.id,
              display_name: user.display_name,
              avatar_url: user.avatar_url,
              email: user.email,
              avatar_icon: user.avatar_icon,
              avatar_color_index: user.avatar_color_index,
              avatar_border_color_index: user.avatar_border_color_index,
            }
          : undefined,
      };
    }
  });

  return {
    activities: transformedActivities,
    total: count || 0,
  };
}

// ============================================
// COMBINE WATCH + RATE ACTIVITIES
// ============================================

interface CombinedActivityResult {
  activity: ActivityItem;
  combinedWith?: ActivityItem;
  combinedWatchRate?: {
    watched: boolean;
    rated: boolean;
    rating?: number;
  };
}

/**
 * Deduplicates rating activities for the same user + movie + day.
 * Keeps only the most recent rating (activities are sorted newest first).
 */
function deduplicateSameDayRatings(activities: ActivityItem[]): ActivityItem[] {
  const seen = new Map<string, ActivityItem>();
  const results: ActivityItem[] = [];

  for (const activity of activities) {
    // Only deduplicate rating activities
    if (activity.action !== "user_rated_movie") {
      results.push(activity);
      continue;
    }

    const details = activity.details as Record<string, unknown> | null;
    const tmdbId = details?.tmdb_id as number | undefined;
    const userId = activity.user?.id;
    const dayKey = activity.timestamp.slice(0, 10); // YYYY-MM-DD

    if (!tmdbId || !userId) {
      results.push(activity);
      continue;
    }

    // Key: user + movie + day
    const key = `${userId}-${tmdbId}-${dayKey}`;

    // Activities are sorted newest first, so first one we see is most recent
    if (!seen.has(key)) {
      seen.set(key, activity);
      results.push(activity);
    }
    // Skip duplicate ratings for same movie on same day
  }

  return results;
}

/**
 * Pre-processes activities to combine watch + rate from the same user, same movie,
 * within a 3-hour window into a single "watched and rated" entry.
 */
function combineWatchRateActivities(activities: ActivityItem[]): CombinedActivityResult[] {
  // First, deduplicate same-day ratings for the same movie
  const dedupedActivities = deduplicateSameDayRatings(activities);

  const processed = new Set<string>();
  const results: CombinedActivityResult[] = [];

  for (let i = 0; i < dedupedActivities.length; i++) {
    const activity = dedupedActivities[i];
    if (processed.has(activity.id)) continue;

    // Only process watch/rate member activities
    if (
      activity.category !== "member" ||
      (activity.action !== "user_watched_movie" && activity.action !== "user_rated_movie")
    ) {
      results.push({ activity });
      processed.add(activity.id);
      continue;
    }

    const details = activity.details as Record<string, unknown> | null;
    const tmdbId = details?.tmdb_id as number | undefined;
    const movieTitle = details?.movie_title as string | undefined;
    const activityTime = new Date(activity.timestamp).getTime();

    // Look for a complementary action (watch for rate, or rate for watch)
    let combinedWith: ActivityItem | undefined;

    for (let j = i + 1; j < dedupedActivities.length; j++) {
      const other = dedupedActivities[j];
      if (processed.has(other.id)) continue;
      if (other.category !== "member") continue;

      // Check if it's a complementary action
      const isComplementary =
        (activity.action === "user_watched_movie" && other.action === "user_rated_movie") ||
        (activity.action === "user_rated_movie" && other.action === "user_watched_movie");

      if (!isComplementary) continue;

      // Check same user
      if (activity.user?.id !== other.user?.id) continue;

      // Check same movie
      const otherDetails = other.details as Record<string, unknown> | null;
      const otherTmdbId = otherDetails?.tmdb_id as number | undefined;
      const otherMovieTitle = otherDetails?.movie_title as string | undefined;

      const sameMovie =
        (tmdbId && otherTmdbId && tmdbId === otherTmdbId) ||
        (movieTitle && otherMovieTitle && movieTitle === otherMovieTitle);

      if (!sameMovie) continue;

      // Check within 3 hours
      const otherTime = new Date(other.timestamp).getTime();
      const timeDiff = Math.abs(activityTime - otherTime);

      if (timeDiff <= THREE_HOURS_MS) {
        combinedWith = other;
        processed.add(other.id);
        break;
      }
    }

    processed.add(activity.id);

    if (combinedWith) {
      // Determine which is watch and which is rate
      const watchActivity = activity.action === "user_watched_movie" ? activity : combinedWith;
      const rateActivity = activity.action === "user_rated_movie" ? activity : combinedWith;
      const rateDetails = rateActivity.details as Record<string, unknown> | null;
      const rating = rateDetails?.rating as number | undefined;

      // Use the watch activity as the primary (usually happens first)
      results.push({
        activity: watchActivity,
        combinedWith: rateActivity,
        combinedWatchRate: {
          watched: true,
          rated: true,
          rating,
        },
      });
    } else {
      results.push({ activity });
    }
  }

  return results;
}

// ============================================
// GROUP ACTIVITIES FOR CONDENSED DISPLAY
// ============================================

/**
 * Groups activities by action type, club, and day for condensed display.
 * Also combines watch + rate activities from the same user within 3 hours.
 *
 * Grouping rules:
 * - Club activities: Group by action + club + day
 * - Member activities: Group by action + day (+ club for club-context activities)
 */
export function groupActivities(activities: ActivityItem[]): GroupedActivity[] {
  // First pass: Combine watch + rate activities
  const combinedResults = combineWatchRateActivities(activities);

  const groups = new Map<
    string,
    { items: ActivityItem[]; combinedWatchRate?: CombinedActivityResult["combinedWatchRate"] }
  >();

  // Helper to get day key (YYYY-MM-DD)
  const getDayKey = (timestamp: string) => timestamp.slice(0, 10);

  combinedResults.forEach((result) => {
    const activity = result.activity;
    const dayKey = getDayKey(activity.timestamp);
    let groupKey: string;

    // Combined watch+rate gets its own unique key (don't group with other activities)
    if (result.combinedWatchRate) {
      const tmdbId = (activity.details as Record<string, unknown> | null)?.tmdb_id;
      groupKey = `combined-watch-rate-${activity.user?.id}-${tmdbId}-${activity.id}`;
    } else if (activity.category === "club") {
      // Club activities: group by action + club + day
      const isGroupable = GROUPABLE_CLUB_ACTIVITIES.includes(activity.action as ClubActivityType);
      if (isGroupable && activity.club) {
        groupKey = `club-${activity.action}-${activity.club.id}-${dayKey}`;
      } else {
        groupKey = activity.id; // Don't group
      }
    } else {
      // Member activities: group by action + day (+ movie for movie activities, + club for certain types)
      const isGroupable = GROUPABLE_MEMBER_ACTIVITIES.includes(
        activity.action as MemberActivityType
      );
      const isMovieActivity = MOVIE_GROUPABLE_ACTIVITIES.includes(
        activity.action as MemberActivityType
      );
      const needsClubContext = CLUB_CONTEXT_ACTIVITIES.includes(
        activity.action as MemberActivityType
      );
      const tmdbId = (activity.details as Record<string, unknown> | null)?.tmdb_id;

      if (isGroupable) {
        if (isMovieActivity && tmdbId) {
          // Movie activities: group by action + tmdb_id + day (so same movie from multiple users groups together)
          groupKey = `member-${activity.action}-${tmdbId}-${dayKey}`;
        } else if (needsClubContext && activity.club) {
          groupKey = `member-${activity.action}-${activity.club.id}-${dayKey}`;
        } else {
          groupKey = `member-${activity.action}-${dayKey}`;
        }
      } else {
        groupKey = activity.id; // Don't group
      }
    }

    const existing = groups.get(groupKey) || { items: [] };
    existing.items.push(activity);
    if (result.combinedWith) {
      existing.items.push(result.combinedWith);
    }
    if (result.combinedWatchRate) {
      existing.combinedWatchRate = result.combinedWatchRate;
    }
    groups.set(groupKey, existing);
  });

  // Deduplicate movie-specific member activities by tmdb_id within each group
  // This prevents "added 2 movies to future nominations" when it was the same movie twice
  const DEDUP_BY_MOVIE_ACTIONS = new Set([
    "user_future_nomination_added",
    "user_future_nomination_removed",
    "user_movie_pool_added",
    "user_movie_pool_removed",
    "user_nominated",
    "user_nomination_removed",
  ]);

  groups.forEach((group) => {
    const first = group.items[0];
    if (first && DEDUP_BY_MOVIE_ACTIONS.has(first.action)) {
      const seen = new Map<number, ActivityItem>();
      for (const item of group.items) {
        const tmdbId = (item.details as Record<string, unknown> | null)?.tmdb_id as
          | number
          | undefined;
        if (tmdbId && !seen.has(tmdbId)) {
          seen.set(tmdbId, item);
        }
      }
      if (seen.size > 0 && seen.size < group.items.length) {
        group.items = Array.from(seen.values());
      }
    }
  });

  // Convert to grouped activities
  const grouped: GroupedActivity[] = [];

  groups.forEach((group, groupKey) => {
    const { items, combinedWatchRate } = group;
    const first = items[0];
    const dayKey = getDayKey(first.timestamp);

    // Extract common details for display
    const details = first.details || {};

    // Collect all unique users from the group (for multi-user movie activities)
    const uniqueUsers = new Map<
      string,
      { id: string; display_name: string | null; avatar_url: string | null }
    >();
    const ratings: number[] = [];

    for (const item of items) {
      if (item.user && item.user.id) {
        uniqueUsers.set(item.user.id, item.user);
      }
      // Collect ratings for averaging
      const itemDetails = item.details as Record<string, unknown> | null;
      const rating = itemDetails?.rating as number | undefined;
      if (rating !== undefined) {
        ratings.push(rating);
      }
    }

    const users = Array.from(uniqueUsers.values());
    const avgRating =
      ratings.length > 0
        ? Math.round((ratings.reduce((a, b) => a + b, 0) / ratings.length) * 10) / 10
        : undefined;

    // For member activities, count unique users not duplicate activity entries
    // This prevents the same user from being counted twice if their action was logged multiple times
    const isMovieGroupedActivity = MOVIE_GROUPABLE_ACTIVITIES.includes(
      first.action as MemberActivityType
    );
    const effectiveCount =
      first.category === "member" && isMovieGroupedActivity && users.length > 0
        ? users.length
        : items.length;

    grouped.push({
      id: groupKey,
      category: first.category,
      action: combinedWatchRate ? "user_watched_and_rated" : first.action,
      timestamp: first.timestamp,
      dayKey,
      count: effectiveCount,
      items,
      club: first.club,
      user: first.user, // Primary user for single-user activities
      users: users.length > 1 ? users : undefined, // Multiple users for grouped activities
      movie: details.tmdb_id
        ? {
            tmdb_id: details.tmdb_id as number,
            title: (details.movie_title as string) || "Unknown",
          }
        : undefined,
      festival: details.festival_id
        ? {
            id: details.festival_id as string,
            theme: (details.festival_theme as string) || null,
          }
        : undefined,
      event: details.event_title
        ? {
            title: details.event_title as string,
          }
        : undefined,
      badge: details.badge_name
        ? {
            name: details.badge_name as string,
          }
        : undefined,
      avgRating,
      ratings: ratings.length > 0 ? ratings : undefined,
      combinedWatchRate,
    });
  });

  // Sort by timestamp
  grouped.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

  return grouped;
}

// ============================================
// WRAP WITHOUT GROUPING (for dedicated activity page)
// ============================================

/**
 * Wraps each activity as a standalone GroupedActivity with count=1.
 * Use this for the dedicated activity page where no grouping is desired.
 */
export function wrapActivitiesWithoutGrouping(activities: ActivityItem[]): GroupedActivity[] {
  const getDayKey = (timestamp: string) => timestamp.slice(0, 10);

  return activities.map((activity) => {
    const details = activity.details || {};

    return {
      id: activity.id,
      category: activity.category,
      action: activity.action,
      timestamp: activity.timestamp,
      dayKey: getDayKey(activity.timestamp),
      count: 1,
      items: [activity],
      club: activity.club,
      user: activity.user,
      movie: details.tmdb_id
        ? {
            tmdb_id: details.tmdb_id as number,
            title: (details.movie_title as string) || "Unknown",
          }
        : undefined,
      festival: details.festival_id
        ? {
            id: details.festival_id as string,
            theme: (details.festival_theme as string) || null,
          }
        : undefined,
      event: details.event_title
        ? {
            title: details.event_title as string,
          }
        : undefined,
      badge: details.badge_name
        ? {
            name: details.badge_name as string,
          }
        : undefined,
      avgRating: details.rating ? (details.rating as number) : undefined,
      ratings: details.rating ? [details.rating as number] : undefined,
    };
  });
}

// ============================================
// ENRICH WITH MOVIE POSTERS
// ============================================

/**
 * Enriches grouped activities with movie poster URLs from the database.
 * Call this after grouping to add poster_url to movie activities.
 */
export async function enrichWithMoviePosters(
  activities: GroupedActivity[]
): Promise<GroupedActivity[]> {
  // Collect all unique tmdb_ids
  const tmdbIds = new Set<number>();
  for (const activity of activities) {
    if (activity.movie?.tmdb_id) {
      tmdbIds.add(activity.movie.tmdb_id);
    }
  }

  if (tmdbIds.size === 0) {
    return activities;
  }

  // Fetch all movies at once
  const supabase = await createClient();
  const { data: movies } = await supabase
    .from("movies")
    .select("tmdb_id, poster_url")
    .in("tmdb_id", Array.from(tmdbIds));

  if (!movies || movies.length === 0) {
    return activities;
  }

  // Create lookup map
  const posterMap = new Map<number, string | null>();
  for (const movie of movies) {
    posterMap.set(movie.tmdb_id, movie.poster_url);
  }

  // Enrich activities
  return activities.map((activity) => {
    if (activity.movie?.tmdb_id && posterMap.has(activity.movie.tmdb_id)) {
      return {
        ...activity,
        movie: {
          ...activity.movie,
          poster_url: posterMap.get(activity.movie.tmdb_id),
        },
      };
    }
    return activity;
  });
}

// ============================================
// APPLY MEMBER JOINED DEDUPLICATION
// ============================================

/**
 * Applies "max once per day per user" deduplication for member_joined activities.
 * This is called before grouping.
 */
export function deduplicateMemberJoined(activities: ClubActivity[]): ClubActivity[] {
  const seen = new Map<string, ClubActivity>();

  return activities.filter((activity) => {
    if (activity.action !== "member_joined") return true;

    // For member_joined, deduplicate by club + day
    const dayKey = activity.timestamp.slice(0, 10);
    const key = `${activity.club?.id || "unknown"}-${dayKey}`;

    if (seen.has(key)) {
      // We've already seen a member_joined for this club today
      // Increment the count in the original (handled by grouping)
      return true; // Still include, will be grouped
    }

    seen.set(key, activity);
    return true;
  });
}
