// ============================================
// ACTIVITY TYPE CONSTANTS
// ============================================

/**
 * Club Activity Types (club-scoped)
 * These activities are shown to all club members and are attributed to the club itself,
 * not to individual users. They appear in the activity feed for anyone who is a member
 * of the club.
 */
export const CLUB_ACTIVITY_TYPES = [
  // Member changes
  "member_joined",
  "member_left",

  // Festival lifecycle
  "festival_started",
  "festival_cancelled",
  "festival_phase_changed",
  "festival_results_revealed",

  // Content
  "announcement_posted",

  // Events
  "event_created",
  "event_cancelled",
  "event_modified",

  // Polls
  "poll_created",
  "poll_edited",
  "poll_closed",
  "poll_deleted",

  // Club changes
  "club_name_changed",
  "club_archived",
  "club_deleted",

  // Seasons
  "season_started",
  "season_ended",
  "season_paused",
  "season_resumed",
  "season_dates_changed",
  "season_renamed",

  // Endless Festival movies
  "endless_movie_added",
  "endless_movie_playing",
  "endless_movie_completed",
  "endless_movie_cancelled",
] as const;

export type ClubActivityType = (typeof CLUB_ACTIVITY_TYPES)[number];

/**
 * Member Activity Types (user-scoped, private)
 * These activities are private to the logged-in user. They represent actions the user
 * has taken and are NEVER shown to other users. Only the user who performed the action
 * can see these in their activity feed.
 */
export const MEMBER_ACTIVITY_TYPES = [
  // Club membership (user's perspective)
  "user_joined_club",
  "user_left_club",
  "user_blocked",

  // Club management (as producer)
  "user_created_club",
  "user_deleted_club",
  "user_archived_club",

  // Watch activity
  "user_watched_movie",

  // Rating activity
  "user_rated_movie",
  "user_rating_changed",

  // Nomination activity
  "user_nominated",
  "user_nomination_removed",
  "user_nomination_edited",

  // Theme activity
  "user_theme_submitted",
  "user_theme_removed",
  "user_theme_edited",

  // Movie pool activity
  "user_movie_pool_added",
  "user_movie_pool_removed",

  // Future nominations
  "user_future_nomination_added",
  "user_future_nomination_removed",

  // Badges
  "user_badge_earned",
] as const;

export type MemberActivityType = (typeof MEMBER_ACTIVITY_TYPES)[number];

/**
 * All activity types combined
 */
export const ALL_ACTIVITY_TYPES = [...CLUB_ACTIVITY_TYPES, ...MEMBER_ACTIVITY_TYPES] as const;

export type ActivityType = ClubActivityType | MemberActivityType;

/**
 * Check if an action is a club activity type
 */
export function isClubActivityType(action: string): action is ClubActivityType {
  return CLUB_ACTIVITY_TYPES.includes(action as ClubActivityType);
}

/**
 * Check if an action is a member activity type
 */
export function isMemberActivityType(action: string): action is MemberActivityType {
  return MEMBER_ACTIVITY_TYPES.includes(action as MemberActivityType);
}

/**
 * Activities that should be grouped by same day + same club
 */
export const GROUPABLE_CLUB_ACTIVITIES: ClubActivityType[] = [
  "member_joined",
  "member_left",
  "endless_movie_added",
  "endless_movie_completed",
  "event_created",
];

/**
 * Activities that should be grouped by same day only (member activities)
 */
export const GROUPABLE_MEMBER_ACTIVITIES: MemberActivityType[] = [
  "user_watched_movie",
  "user_rated_movie",
  "user_nominated",
  "user_nomination_removed",
  "user_theme_submitted",
  "user_theme_removed",
  "user_movie_pool_added",
  "user_movie_pool_removed",
  "user_future_nomination_added",
  "user_future_nomination_removed",
  "user_badge_earned",
];

/**
 * Activities that require club context for grouping
 */
export const CLUB_CONTEXT_ACTIVITIES: MemberActivityType[] = [
  "user_nominated",
  "user_theme_submitted",
  "user_movie_pool_added",
];
