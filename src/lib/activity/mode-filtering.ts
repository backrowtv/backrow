import { Database } from "@/types/database";
import { extractFestivalType, activityHasReview } from "@/types/supabase-helpers";

type ActivityLog = Database["public"]["Tables"]["activity_log"]["Row"];
type Club = Database["public"]["Tables"]["clubs"]["Row"];

/**
 * Filters activities based on festival type and club settings.
 *
 * Filtering rules:
 * - Endless festivals: Show everything (social viewing)
 * - Standard festivals with scoring: Hide individual ratings/watches (competitive)
 * - Standard festivals without scoring: Show everything
 */
export function shouldShowActivity(
  activity: ActivityLog,
  club: Club | null,
  userHasRated: boolean = false
): boolean {
  if (!club) return true;

  const settings = club.settings as Record<string, unknown> | null;
  const festivalType = extractFestivalType(settings);

  // Actions that should always be shown regardless of type
  const alwaysShowActions = [
    "club_created",
    "joined_club",
    "left",
    "promoted",
    "demoted",
    "removed_member",
    "festival_created",
    "festival_started",
    "festival_completed",
    "phase_changed",
    "deadline_changed",
    "theme_selected",
    "season_rolled_over",
    "season_concluded",
  ];

  if (alwaysShowActions.includes(activity.action)) {
    return true;
  }

  // Endless festivals show everything
  if (festivalType === "endless") {
    return true;
  }

  // Standard festivals: check scoring setting for competitive behavior
  const scoringEnabled = settings?.scoring_enabled === true;

  if (scoringEnabled) {
    // Competitive mode: hide individual ratings/watches
    if (activity.action === "rated_movie" || activity.action === "watched_movie") {
      return false;
    }
  }

  // If scoring is off but club_ratings_enabled, show reviews but hide scores until user has rated
  const ratingsEnabled = settings?.club_ratings_enabled !== false;
  if (ratingsEnabled && activity.action === "rated_movie") {
    return userHasRated || activityHasReview(activity.details as Record<string, unknown> | null);
  }

  return true;
}

/**
 * Checks if a rating activity should show the score.
 * When scoring is enabled (competitive), scores are hidden until results.
 * Otherwise, scores are shown after the user has rated.
 */
export function shouldShowRatingScore(
  activity: ActivityLog,
  club: Club | null,
  userHasRated: boolean = false
): boolean {
  if (!club) return true;

  const settings = club.settings as Record<string, unknown> | null;
  const festivalType = extractFestivalType(settings);

  // Endless festivals always show scores
  if (festivalType === "endless") {
    return true;
  }

  // Standard festivals with scoring: hide scores (competitive)
  const scoringEnabled = settings?.scoring_enabled === true;
  if (scoringEnabled && activity.action === "rated_movie") {
    return false;
  }

  // Standard festivals without scoring: show after user has rated
  if (activity.action === "rated_movie") {
    return userHasRated;
  }

  return true;
}
