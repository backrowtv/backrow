/**
 * User Rating Preferences
 *
 * Defines the structure for user's personal rating scale preferences.
 * All ratings are displayed on a uniform 0-10 scale with one decimal place.
 * Users can customize their step increment and slider thumb icon.
 */

import type { RubricSliderIcon } from "./club-settings";

export interface UserRatingPreferences {
  /**
   * Step increment between ratings
   * Options: 0.1, 0.5, or 1.0
   */
  rating_increment: number;

  /**
   * Icon type for slider thumb
   * Controls the visual style of the slider thumb in the rating interface
   */
  rating_slider_icon?: RubricSliderIcon;
}

/** Default rating preferences for new users */
export const DEFAULT_RATING_PREFERENCES: UserRatingPreferences = {
  rating_increment: 0.5,
};

/** Available increment options for ratings */
export const NUMERIC_INCREMENT_OPTIONS = [
  { value: 0.1, label: "0.1" },
  { value: 0.5, label: "0.5" },
  { value: 1, label: "1" },
] as const;
