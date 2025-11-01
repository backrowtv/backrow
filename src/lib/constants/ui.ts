/**
 * Centralized UI constants for the BackRow application.
 * These values are extracted from various components to ensure consistency
 * and make maintenance easier.
 */

import type { BadgeCategoryId } from "@/types/badges";

// ============================================
// CAROUSEL CONFIGURATION
// ============================================

export const CAROUSEL_CONFIG = {
  /** Poster width in pixels for mobile devices */
  MOBILE_POSTER_WIDTH: 140,
  /** Poster width in pixels for desktop devices */
  DESKTOP_POSTER_WIDTH: 180,
  /** Window width breakpoint for mobile detection */
  MOBILE_BREAKPOINT: 640,
  /** Number of items per page in grid view on mobile */
  GRID_ITEMS_MOBILE: 10,
  /** Number of items per page in grid view on desktop */
  GRID_ITEMS_DESKTOP: 10,
  /** Grid columns on mobile */
  GRID_COLS_MOBILE: 5,
  /** Grid columns on desktop */
  GRID_COLS_DESKTOP: 5,
} as const;

// ============================================
// BADGE CATEGORY LABELS
// ============================================

/**
 * Category-specific tier labels for badges.
 * Each category has themed names for each tier level.
 */
export const BADGE_CATEGORY_LABELS: Record<BadgeCategoryId, string[]> = {
  festivals_won: [
    "First Victory",
    "Rising Champion",
    "Festival Champion",
    "Festival Legend",
    "Festival Titan",
    "Festival God",
  ],
  movies_watched: [
    "First Film",
    "Movie Watcher",
    "Film Fan",
    "Film Enthusiast",
    "Cinephile",
    "Film Devotee",
  ],
  festivals_participated: [
    "Festival Rookie",
    "Festival Goer",
    "Festival Regular",
    "Festival Veteran",
    "Festival Expert",
    "Festival Stalwart",
  ],
  guesses_correct: [
    "Lucky Guess",
    "Keen Observer",
    "Sleuth",
    "Detective",
    "Mind Reader",
    "Psychic",
  ],
  achievements: [],
} as const;

// ============================================
// NOMINATION OPTIONS
// ============================================

/**
 * Available options for max nominations per user in festival wizard.
 */
export const NOMINATION_OPTIONS = [1, 2, 3] as const;

// ============================================
// THREAD/DISCUSSION CONSTANTS
// ============================================

export const THREAD_CONSTANTS = {
  /** Maximum visual indentation depth for nested comments */
  MAX_VISUAL_DEPTH: 6,
  /** Depth at which to show "Continue thread" link instead of inline replies */
  CONTINUE_THREAD_DEPTH: 5,
} as const;
