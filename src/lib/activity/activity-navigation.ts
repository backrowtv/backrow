import type { ActivityDetails } from "./activity-verbiage";
import {
  isClubActivityType,
  isMemberActivityType,
  type ClubActivityType,
  type MemberActivityType,
} from "./activity-types";

/**
 * Determine the navigation URL for an activity item based on smart routing logic
 *
 * Smart Logic:
 * - Watch/Rate activities → Movie page (or filtered feed if grouped)
 * - Nomination activities → Festival page (or filtered feed if grouped)
 * - Theme activities → Club page (or filtered feed if grouped)
 * - Festival-specific (non-endless) → Festival page
 * - Endless festival → Club page
 * - Member joined/left → Members page
 * - Default → Club page or profile page
 *
 * @param action - The activity action type
 * @param details - Activity details containing context (movie_title, club_slug, etc.)
 * @param clubSlug - Optional club slug for fallback
 * @param isClubActivity - Whether this is a club-level activity
 * @param isGrouped - Whether this is a grouped activity (multiple items)
 * @returns Navigation URL
 */
export function getActivityNavigationUrl(
  action: string,
  details: ActivityDetails | null,
  clubSlug?: string | null,
  isClubActivity: boolean = false,
  isGrouped: boolean = false
): string {
  // Extract common details
  const tmdbId = details?.tmdb_id;
  const festivalId = details?.festival_id;
  const festivalSlug = details?.festival_slug;
  const slug = details?.club_slug || clubSlug;

  // Handle club activities
  if (isClubActivity || isClubActivityType(action)) {
    return getClubActivityUrl(action as ClubActivityType, details, slug);
  }

  // Handle member activities
  if (isMemberActivityType(action)) {
    return getMemberActivityUrl(action as MemberActivityType, details, slug, isGrouped);
  }

  // Fallback: try to determine from details
  if (tmdbId) {
    return `/movies/${tmdbId}`;
  }

  if (slug) {
    if (festivalId || festivalSlug) {
      return `/club/${slug}/festival/${festivalSlug || festivalId}`;
    }
    return `/club/${slug}`;
  }

  // Final fallback
  return "/home";
}

/**
 * Get navigation URL for club activities
 */
function getClubActivityUrl(
  action: ClubActivityType,
  details: ActivityDetails | null,
  clubSlug?: string | null
): string {
  const slug = details?.club_slug || clubSlug;
  const festivalId = details?.festival_id;
  const festivalSlug = details?.festival_slug;

  // Member changes → Members page
  if (action === "member_joined" || action === "member_left") {
    return slug ? `/club/${slug}/members` : "/home";
  }

  // Festival-specific activities (non-endless) → Festival page
  if (
    action === "festival_started" ||
    action === "festival_phase_changed" ||
    action === "festival_results_revealed"
  ) {
    if (slug && (festivalId || festivalSlug)) {
      return `/club/${slug}/festival/${festivalSlug || festivalId}`;
    }
  }

  // Endless festival activities → Club page
  if (
    action === "endless_movie_added" ||
    action === "endless_movie_playing" ||
    action === "endless_movie_completed"
  ) {
    return slug ? `/club/${slug}` : "/home";
  }

  // Event activities → Events page
  if (action === "event_created" || action === "event_cancelled" || action === "event_modified") {
    return slug ? `/club/${slug}/events` : "/home";
  }

  // All other club activities → Club page
  return slug ? `/club/${slug}` : "/home";
}

/**
 * Get navigation URL for member activities
 */
function getMemberActivityUrl(
  action: MemberActivityType,
  details: ActivityDetails | null,
  clubSlug?: string | null,
  isGrouped: boolean = false
): string {
  const slug = details?.club_slug || clubSlug;
  const tmdbId = details?.tmdb_id;
  const festivalId = details?.festival_id;
  const festivalSlug = details?.festival_slug;

  // Watch/Rate activities → Movie page (if available), or filtered feed if grouped
  if (
    action === "user_watched_movie" ||
    action === "user_rated_movie" ||
    action === "user_rating_changed"
  ) {
    // Grouped activities link to filtered activity feed
    if (isGrouped) {
      return `/activity?category=member_activity&sub=${action === "user_watched_movie" ? "watch" : "rate"}`;
    }
    if (tmdbId) {
      return `/movies/${tmdbId}`;
    }
  }

  // Nomination activities → Festival page (context where nominated), or filtered feed if grouped
  if (
    action === "user_nominated" ||
    action === "user_nomination_removed" ||
    action === "user_nomination_edited"
  ) {
    // Grouped activities link to filtered activity feed
    if (isGrouped) {
      return "/activity?category=member_activity&sub=nominations";
    }
    if (slug && (festivalId || festivalSlug)) {
      return `/club/${slug}/festival/${festivalSlug || festivalId}`;
    }
    // Fallback to club if no festival context
    if (slug) {
      return `/club/${slug}`;
    }
  }

  // Theme activities → Club page, or filtered feed if grouped
  if (
    action === "user_theme_submitted" ||
    action === "user_theme_removed" ||
    action === "user_theme_edited"
  ) {
    // Grouped activities link to filtered activity feed
    if (isGrouped) {
      return "/activity?category=member_activity&sub=themes";
    }
    return slug ? `/club/${slug}` : "/home";
  }

  // Club membership → Club page
  if (action === "user_joined_club" || action === "user_left_club") {
    return slug ? `/club/${slug}` : "/home";
  }

  // Club management → Club page
  if (
    action === "user_created_club" ||
    action === "user_archived_club" ||
    action === "user_deleted_club"
  ) {
    return slug ? `/club/${slug}` : "/home";
  }

  // Movie pool activities → Movie page (if available), or filtered feed if grouped
  if (action === "user_movie_pool_added" || action === "user_movie_pool_removed") {
    // Grouped activities link to filtered activity feed
    if (isGrouped) {
      return "/activity?category=member_activity&sub=movie_pool";
    }
    if (tmdbId) {
      return `/movies/${tmdbId}`;
    }
    return slug ? `/club/${slug}` : "/home";
  }

  // Future nominations → Movie page (if available), or filtered feed if grouped
  if (action === "user_future_nomination_added" || action === "user_future_nomination_removed") {
    // Grouped activities link to filtered activity feed
    if (isGrouped) {
      return "/activity?category=member_activity&sub=future_nominations";
    }
    if (tmdbId) {
      return `/movies/${tmdbId}`;
    }
    return "/profile/future-nominations";
  }

  // Badge earned → Profile badges section (TBD - will be updated when badges feature is implemented)
  if (action === "user_badge_earned") {
    return "/profile/badges";
  }

  // User blocked → Profile settings
  if (action === "user_blocked") {
    return "/profile/settings/account";
  }

  // Default fallback
  return "/home";
}

/**
 * Check if an activity should use card navigation on mobile
 * (All activities support card navigation)
 */
export function supportsCardNavigation(_action: string): boolean {
  // All activities support card navigation
  return true;
}
