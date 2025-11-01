/**
 * Centralized phase label utilities
 *
 * These functions provide consistent phase labels across the app,
 * taking into account club settings like ratings_enabled.
 */

export type FestivalPhase = "theme_selection" | "nomination" | "watch_rate" | "results" | null;

export interface PhaseDisplay {
  label: string;
  className: string;
}

/**
 * Get the display label for a festival phase
 *
 * @param phase - The current festival phase
 * @param ratingsEnabled - Whether club ratings are enabled (defaults to true)
 * @returns The display label for the phase
 */
export function getPhaseLabel(
  phase: FestivalPhase,
  _ratingsEnabled: boolean = true
): string | null {
  if (!phase) return null;

  switch (phase) {
    case "theme_selection":
      return "Theme";
    case "nomination":
      return "Nominate";
    case "watch_rate":
      return "Watch & Rate";
    case "results":
      return "Results";
    default:
      return null;
  }
}

/**
 * Get the full display configuration for a festival phase badge
 *
 * @param phase - The current festival phase
 * @param ratingsEnabled - Whether club ratings are enabled (defaults to true)
 * @returns Object with label and className, or null if no phase
 */
export function getPhaseDisplay(
  phase: FestivalPhase,
  _ratingsEnabled: boolean = true
): PhaseDisplay | null {
  if (!phase) return null;

  switch (phase) {
    case "theme_selection":
      return {
        label: "Theme",
        className: "bg-purple-600 text-white",
      };
    case "nomination":
      return {
        label: "Nominate",
        className: "bg-blue-600 text-white",
      };
    case "watch_rate":
      return {
        label: "Watch & Rate",
        className: "bg-amber-600 text-white",
      };
    case "results":
      return {
        label: "Results",
        className: "bg-green-600 text-white",
      };
    default:
      return null;
  }
}

/**
 * Phase display for contexts where we need a fallback (like activity feeds)
 * Always returns a display, using 'Active' as fallback
 */
export function getPhaseDisplayWithFallback(
  phase: string | null,
  ratingsEnabled: boolean = true
): PhaseDisplay {
  const display = getPhaseDisplay(phase as FestivalPhase, ratingsEnabled);
  if (display) return display;

  return {
    label: "Active",
    className: "bg-green-600 text-white",
  };
}
