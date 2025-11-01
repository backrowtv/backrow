import { CLUB_ACTIVITY_TYPES } from "./activity-types";

// ============================================
// TYPES
// ============================================

export type ActivityDisplayType = "movie_poster" | "user_avatar" | "club_avatar";

// Local type for activity details (avoid circular import from activity-verbiage)
export interface ActivityDetailsForDisplay {
  movie_title?: string;
  tmdb_id?: number;
  poster_url?: string;
  poster_path?: string;
  [key: string]: unknown;
}

// ============================================
// CONSTANTS
// ============================================

const TMDB_IMAGE_BASE_URL = "https://image.tmdb.org/t/p/w185";

/**
 * Actions that should display a movie poster instead of an avatar
 * Movie-related actions show posters - all other activities show avatars
 */
const MOVIE_POSTER_ACTIONS = new Set([
  // Watch and rate actions
  "user_watched_movie",
  "user_rated_movie",
  "user_watched_and_rated", // combined watch + rate
  "watched_movie", // legacy
  "rated_movie", // legacy
  // Movie pool actions
  "user_movie_pool_added",
  "user_movie_pool_removed",
  // Future nomination actions
  "user_future_nomination_added",
  "user_future_nomination_removed",
]);

// ============================================
// DISPLAY TYPE DETECTION
// ============================================

/**
 * Determine what type of image to display for an activity
 * @param action - The activity action type
 * @param isClubActivity - Whether this is a club-level activity (no user attribution)
 * @returns The type of image to display
 */
export function getActivityDisplayType(
  action: string,
  isClubActivity: boolean = false
): ActivityDisplayType {
  // Movie-related actions show poster
  if (MOVIE_POSTER_ACTIONS.has(action)) {
    return "movie_poster";
  }

  // Club activities show club avatar
  if (isClubActivity || (CLUB_ACTIVITY_TYPES as readonly string[]).includes(action)) {
    return "club_avatar";
  }

  // Default to user avatar for member activities
  return "user_avatar";
}

/**
 * Check if an action is a movie-related action that should show a poster
 */
export function isMovieAction(action: string): boolean {
  return MOVIE_POSTER_ACTIONS.has(action);
}

// ============================================
// MOVIE POSTER URL
// ============================================

/**
 * Get the movie poster URL from activity details
 * Tries multiple sources: poster_url, constructed from poster_path, or from tmdb_id
 * @param details - Activity details object
 * @returns Poster URL or null if not available
 */
export function getMoviePosterUrl(details: ActivityDetailsForDisplay | null): string | null {
  if (!details) return null;

  // Direct poster_url (full URL)
  if (details.poster_url && typeof details.poster_url === "string") {
    return details.poster_url;
  }

  // Poster path (needs TMDB base URL)
  if (details.poster_path && typeof details.poster_path === "string") {
    return `${TMDB_IMAGE_BASE_URL}${details.poster_path}`;
  }

  // No poster available - caller should handle fallback
  return null;
}

/**
 * Construct a TMDB poster URL from a poster path
 */
export function constructTmdbPosterUrl(posterPath: string | null): string | null {
  if (!posterPath) return null;
  return `${TMDB_IMAGE_BASE_URL}${posterPath}`;
}

// ============================================
// LEGACY ACTION DETECTION
// ============================================

/**
 * Legacy action type mappings for backward compatibility
 * Maps old action names to their category
 */
const LEGACY_CLUB_ACTIONS = new Set([
  "endless_movie_started",
  "endless_movie_deleted",
  "festival_created",
  "festival_completed",
  "phase_changed",
  "deadline_changed",
  "theme_selected",
]);

const LEGACY_MEMBER_ACTIONS = new Set(["watched_movie", "rated_movie", "nomination_added"]);

/**
 * Check if an action is a legacy club action
 */
export function isLegacyClubAction(action: string): boolean {
  return LEGACY_CLUB_ACTIONS.has(action);
}

/**
 * Check if an action is a legacy member action
 */
export function isLegacyMemberAction(action: string): boolean {
  return LEGACY_MEMBER_ACTIONS.has(action);
}

/**
 * Determine if an activity should be considered a club activity
 * (for display purposes - club avatar vs user avatar)
 */
export function shouldShowAsClubActivity(action: string, hasUserId: boolean): boolean {
  // If it's in the club activity types, it's a club activity
  if ((CLUB_ACTIVITY_TYPES as readonly string[]).includes(action)) {
    return true;
  }

  // Legacy club actions
  if (isLegacyClubAction(action)) {
    return true;
  }

  // No user ID means it's attributed to the club
  if (!hasUserId) {
    return true;
  }

  return false;
}
