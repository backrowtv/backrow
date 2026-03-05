/**
 * Activity Filter Types, Mappings, and Helpers
 *
 * This module provides:
 * - Date range presets for filtering
 * - Sub-filter to action type mappings
 * - URL serialization/deserialization helpers
 * - Filter state types
 */

// ============================================
// DATE RANGE PRESETS
// ============================================

export type DateRangePreset = "all_time" | "yesterday" | "last_week" | "last_month" | "last_year";

interface DateRange {
  start: string; // ISO date string
  end: string; // ISO date string
}

interface DateRangePresetConfig {
  label: string;
  getDates: () => DateRange | null;
}

/**
 * Get start of day in ISO format
 */
function startOfDay(date: Date): string {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d.toISOString();
}

/**
 * Get end of day in ISO format
 */
function endOfDay(date: Date): string {
  const d = new Date(date);
  d.setHours(23, 59, 59, 999);
  return d.toISOString();
}

export const DATE_RANGE_PRESETS: Record<DateRangePreset, DateRangePresetConfig> = {
  all_time: {
    label: "All Time",
    getDates: () => null, // No date filter
  },
  yesterday: {
    label: "Yesterday",
    getDates: () => {
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      return {
        start: startOfDay(yesterday),
        end: endOfDay(yesterday),
      };
    },
  },
  last_week: {
    label: "Last Week",
    getDates: () => {
      const now = new Date();
      const weekAgo = new Date();
      weekAgo.setDate(weekAgo.getDate() - 7);
      return {
        start: startOfDay(weekAgo),
        end: endOfDay(now),
      };
    },
  },
  last_month: {
    label: "Last Month",
    getDates: () => {
      const now = new Date();
      const monthAgo = new Date();
      monthAgo.setDate(monthAgo.getDate() - 30);
      return {
        start: startOfDay(monthAgo),
        end: endOfDay(now),
      };
    },
  },
  last_year: {
    label: "Last Year",
    getDates: () => {
      const now = new Date();
      const yearAgo = new Date();
      yearAgo.setFullYear(yearAgo.getFullYear() - 1);
      return {
        start: startOfDay(yearAgo),
        end: endOfDay(now),
      };
    },
  },
};

/**
 * Get date range from preset key
 */
export function getDateRangeFromPreset(preset: DateRangePreset | null): DateRange | null {
  if (!preset || preset === "all_time") return null;
  return DATE_RANGE_PRESETS[preset]?.getDates() ?? null;
}

// ============================================
// ACTIVITY FILTER CATEGORIES
// ============================================

export type ActivityFilterCategory = "club_activity" | "member_activity";

// Sub-filter types for club activities
export type ClubActivitySubFilter =
  | "member_changes"
  | "festival_events"
  | "announcements"
  | "events"
  | "polls"
  | "club_management"
  | "endless_activity";

// Sub-filter types for member activities
export type MemberActivitySubFilter =
  | "watch"
  | "rate"
  | "nominations"
  | "themes"
  | "movie_pool"
  | "future_nominations"
  | "badges"
  | "club_membership";

// ============================================
// SUB-FILTER TO ACTION TYPE MAPPINGS
// ============================================

/**
 * Maps club sub-filters to their corresponding database action types
 */
export const CLUB_SUBFILTER_ACTIONS: Record<ClubActivitySubFilter, string[]> = {
  member_changes: ["member_joined", "member_left"],
  festival_events: ["festival_started", "festival_phase_changed", "festival_results_revealed"],
  announcements: ["announcement_posted"],
  events: ["event_created", "event_cancelled", "event_modified"],
  polls: ["poll_created"],
  club_management: [
    "club_name_changed",
    "club_archived",
    "club_deleted",
    "season_started",
    "season_ended",
    "season_paused",
    "season_resumed",
    "season_dates_changed",
    "season_renamed",
  ],
  endless_activity: ["endless_movie_added", "endless_movie_playing", "endless_movie_completed"],
};

/**
 * Maps member sub-filters to their corresponding database action types
 */
export const MEMBER_SUBFILTER_ACTIONS: Record<MemberActivitySubFilter, string[]> = {
  watch: ["user_watched_movie"],
  rate: ["user_rated_movie", "user_rating_changed"],
  nominations: ["user_nominated", "user_nomination_removed", "user_nomination_edited"],
  themes: ["user_theme_submitted", "user_theme_removed", "user_theme_edited"],
  movie_pool: ["user_movie_pool_added", "user_movie_pool_removed"],
  future_nominations: ["user_future_nomination_added", "user_future_nomination_removed"],
  badges: ["user_badge_earned"],
  club_membership: [
    "user_joined_club",
    "user_left_club",
    "user_blocked",
    "user_created_club",
    "user_deleted_club",
    "user_archived_club",
  ],
};

/**
 * Labels for display in the UI
 */
export const CLUB_SUBFILTER_LABELS: Record<ClubActivitySubFilter, string> = {
  member_changes: "Member Changes",
  festival_events: "Festival Events",
  announcements: "Announcements",
  events: "Events",
  polls: "Polls",
  club_management: "Club Management",
  endless_activity: "Endless Festival",
};

export const MEMBER_SUBFILTER_LABELS: Record<MemberActivitySubFilter, string> = {
  watch: "Watched",
  rate: "Rated",
  nominations: "Nominations",
  themes: "Themes",
  movie_pool: "Movie Pool",
  future_nominations: "Future Nominations",
  badges: "Badges",
  club_membership: "Club Membership",
};

export const CATEGORY_LABELS: Record<ActivityFilterCategory, string> = {
  club_activity: "Club Activity",
  member_activity: "My Activity",
};

/**
 * List of all club sub-filters in display order
 */
export const CLUB_SUB_FILTERS: ClubActivitySubFilter[] = [
  "member_changes",
  "festival_events",
  "announcements",
  "events",
  "polls",
  "club_management",
  "endless_activity",
];

/**
 * List of all member sub-filters in display order
 */
export const MEMBER_SUB_FILTERS: MemberActivitySubFilter[] = [
  "watch",
  "rate",
  "nominations",
  "themes",
  "movie_pool",
  "future_nominations",
  "badges",
  "club_membership",
];

// ============================================
// HELPER FUNCTIONS
// ============================================

/**
 * Converts UI sub-filters to database action types
 *
 * @param category - The activity category (club_activity or member_activity)
 * @param subFilters - Array of selected sub-filter keys
 * @returns Array of database action type strings to filter by
 */
export function subFiltersToActions(
  category: ActivityFilterCategory,
  subFilters: string[]
): string[] {
  if (subFilters.length === 0) return [];

  const actions: string[] = [];

  if (category === "club_activity") {
    for (const sub of subFilters) {
      const subActions = CLUB_SUBFILTER_ACTIONS[sub as ClubActivitySubFilter];
      if (subActions) {
        actions.push(...subActions);
      }
    }
  } else {
    for (const sub of subFilters) {
      const subActions = MEMBER_SUBFILTER_ACTIONS[sub as MemberActivitySubFilter];
      if (subActions) {
        actions.push(...subActions);
      }
    }
  }

  // Deduplicate and return
  return [...new Set(actions)];
}

/**
 * Get the label for a sub-filter
 */
export function getSubFilterLabel(filter: string): string {
  if (filter in CLUB_SUBFILTER_LABELS) {
    return CLUB_SUBFILTER_LABELS[filter as ClubActivitySubFilter];
  }
  if (filter in MEMBER_SUBFILTER_LABELS) {
    return MEMBER_SUBFILTER_LABELS[filter as MemberActivitySubFilter];
  }
  return filter;
}

// ============================================
// FILTER STATE TYPE
// ============================================

export interface ActivityFiltersState {
  category: ActivityFilterCategory | null;
  subFilters: string[];
  clubIds: string[];
  userId: string | null;
  dateRange: DateRangePreset;
}

export const DEFAULT_FILTER_STATE: ActivityFiltersState = {
  category: null,
  subFilters: [],
  clubIds: [],
  userId: null,
  dateRange: "all_time",
};

// ============================================
// URL SERIALIZATION HELPERS
// ============================================

/**
 * Parse activity filters from URL search params
 */
export function parseActivityFiltersFromURL(searchParams: URLSearchParams): ActivityFiltersState {
  const category = searchParams.get("category") as ActivityFilterCategory | null;
  const subFilters = searchParams.get("sub")?.split(",").filter(Boolean) || [];

  // Support both 'clubs' (multi) and 'club' (single, backward compat)
  let clubIds = searchParams.get("clubs")?.split(",").filter(Boolean) || [];
  const singleClub = searchParams.get("club");
  if (singleClub && !clubIds.includes(singleClub)) {
    clubIds = [singleClub, ...clubIds];
  }

  const userId = searchParams.get("user") || null;
  const dateRange = (searchParams.get("date") as DateRangePreset) || "all_time";

  return {
    category,
    subFilters,
    clubIds,
    userId,
    dateRange,
  };
}

/**
 * Serialize activity filters to URL search params
 */
export function serializeActivityFiltersToURL(
  filters: ActivityFiltersState,
  existingParams?: URLSearchParams
): URLSearchParams {
  const params = existingParams ? new URLSearchParams(existingParams) : new URLSearchParams();

  // Clear filter-related params first
  params.delete("category");
  params.delete("sub");
  params.delete("clubs");
  params.delete("club"); // Remove legacy single club param
  params.delete("user");
  params.delete("date");

  // Set new values (only if they have content)
  if (filters.category) {
    params.set("category", filters.category);
  }

  if (filters.subFilters.length > 0) {
    params.set("sub", filters.subFilters.join(","));
  }

  if (filters.clubIds.length > 0) {
    params.set("clubs", filters.clubIds.join(","));
  }

  if (filters.userId) {
    params.set("user", filters.userId);
  }

  if (filters.dateRange && filters.dateRange !== "all_time") {
    params.set("date", filters.dateRange);
  }

  return params;
}

/**
 * Check if any filters are active (non-default)
 * Note: Category tabs are NOT considered filters - they are view mode selectors
 */
export function hasActiveFilters(filters: ActivityFiltersState): boolean {
  return (
    // Category is intentionally NOT checked - tabs are view mode selectors
    filters.subFilters.length > 0 ||
    filters.clubIds.length > 0 ||
    filters.userId !== null ||
    filters.dateRange !== "all_time"
  );
}

/**
 * Count the number of active filters (for badge display)
 * Note: Category tabs (Club/All/Me) are NOT counted as filters -
 * they are view mode selectors, not clearable filters
 */
export function countActiveFilters(filters: ActivityFiltersState): number {
  let count = 0;
  // Category is intentionally NOT counted - tabs are view mode selectors, not filters
  count += filters.subFilters.length;
  count += filters.clubIds.length;
  if (filters.userId) count += 1;
  if (filters.dateRange !== "all_time") count += 1;
  return count;
}
