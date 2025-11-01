/**
 * Badge system types for tiered milestone badges and stat display badges
 */

// Re-export base types from actions for convenience
export type { Badge, UserBadge } from "@/app/actions/badges.types";

/**
 * Badge requirement structure stored in requirements_jsonb
 */
export interface BadgeRequirements {
  type:
    | "movie_milestone"
    | "festival_milestone"
    | "festival_win_milestone"
    | "guess_milestone"
    | "rating_perfect_10"
    | "rating_rock_bottom"
    | "rating_contrarian"
    | "rating_generous"
    | "nomination_crowd_pleaser"
    | "festival_photo_finish"
    | "festival_back_to_back"
    | "club_founder";
  threshold: number;
  category: BadgeCategoryId;
}

/**
 * Badge category identifiers
 */
export type BadgeCategoryId =
  | "festivals_won"
  | "movies_watched"
  | "festivals_participated"
  | "guesses_correct"
  | "achievements";

/**
 * Badge category metadata
 */
export interface BadgeCategoryMeta {
  id: BadgeCategoryId;
  displayName: string;
  description: string;
  icon: string; // Phosphor icon name
}

/**
 * Badge with user progress information
 */
export interface BadgeWithProgress {
  id: string;
  name: string;
  description: string;
  icon_url: string | null;
  threshold: number;
  earned: boolean;
  earnedAt: string | null;
  progress: {
    current: number;
    target: number;
    percent: number;
  };
  isNextToUnlock: boolean;
}

/**
 * A category of badges with all tiers
 */
export interface BadgeCategory {
  category: BadgeCategoryId;
  displayName: string;
  description: string;
  icon: string;
  badges: BadgeWithProgress[];
  currentValue: number; // User's current count for this category
}

/**
 * One-off achievement badge (not tiered)
 */
export interface AchievementBadge {
  id: string;
  name: string;
  description: string;
  icon_url: string | null;
  earned: boolean;
  earnedAt: string | null;
  requirementType: string;
}

/**
 * Complete badge data for display
 */
export interface UserBadgeData {
  categories: BadgeCategory[];
  achievements: AchievementBadge[];
  earnedBadgeIds: string[]; // For FeaturedBadgeSelector
}

/**
 * Category metadata lookup
 */
export const BADGE_CATEGORIES: Record<BadgeCategoryId, BadgeCategoryMeta> = {
  festivals_won: {
    id: "festivals_won",
    displayName: "Festivals Won",
    description: "Win festivals to earn these badges",
    icon: "Trophy",
  },
  movies_watched: {
    id: "movies_watched",
    displayName: "Movies Watched",
    description: "Watch movies to earn these badges",
    icon: "FilmStrip",
  },
  festivals_participated: {
    id: "festivals_participated",
    displayName: "Festivals Participated",
    description: "Participate in festivals to earn these badges",
    icon: "Ticket",
  },
  guesses_correct: {
    id: "guesses_correct",
    displayName: "Nominators Guessed",
    description: "Correctly guess who nominated movies",
    icon: "MagnifyingGlass",
  },
  achievements: {
    id: "achievements",
    displayName: "Other",
    description: "One-of-a-kind moments and achievements",
    icon: "Star",
  },
};

/**
 * Order for displaying categories
 */
export const BADGE_CATEGORY_ORDER: BadgeCategoryId[] = [
  "festivals_won",
  "movies_watched",
  "festivals_participated",
  "guesses_correct",
];
