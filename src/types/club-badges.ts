/**
 * Club badge/challenge system types
 * Mirrors the user badge structure but for club-level achievements
 */

/**
 * Club badge category identifiers
 */
export type ClubBadgeCategoryId =
  | "festivals_completed"
  | "movies_watched"
  | "members"
  | "seasons_completed";

/**
 * Badge requirement types for club challenges
 */
export type ClubBadgeRequirementType =
  | "club_festivals_completed"
  | "club_movies_watched"
  | "club_members"
  | "club_seasons_completed";

/**
 * Club badge requirement structure stored in requirements_jsonb
 */
export interface ClubBadgeRequirements {
  type: ClubBadgeRequirementType;
  threshold: number;
  category: ClubBadgeCategoryId;
}

/**
 * Club badge category metadata
 */
export interface ClubBadgeCategoryMeta {
  id: ClubBadgeCategoryId;
  displayName: string;
  description: string;
  icon: string; // Phosphor icon name
}

/**
 * Club badge with progress information
 */
export interface ClubBadgeWithProgress {
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
 * A category of club badges with all tiers
 */
export interface ClubBadgeCategory {
  category: ClubBadgeCategoryId;
  displayName: string;
  description: string;
  icon: string;
  badges: ClubBadgeWithProgress[];
  currentValue: number;
}

/**
 * Complete club badge data for display
 */
export interface ClubBadgeData {
  categories: ClubBadgeCategory[];
  earnedBadgeIds: string[];
}

/**
 * Club stats for badge calculation
 */
export interface ClubChallengeStats {
  festivalsCompleted: number;
  moviesWatched: number;
  members: number;
  seasonsCompleted: number;
}

/**
 * Category metadata lookup
 */
export const CLUB_BADGE_CATEGORIES: Record<ClubBadgeCategoryId, ClubBadgeCategoryMeta> = {
  festivals_completed: {
    id: "festivals_completed",
    displayName: "Festivals Completed",
    description: "Complete festivals together as a club",
    icon: "Trophy",
  },
  movies_watched: {
    id: "movies_watched",
    displayName: "Movies Watched",
    description: "Watch movies together as a club",
    icon: "FilmStrip",
  },
  members: {
    id: "members",
    displayName: "Club Members",
    description: "Grow your club membership",
    icon: "Users",
  },
  seasons_completed: {
    id: "seasons_completed",
    displayName: "Seasons Completed",
    description: "Complete full seasons of festivals",
    icon: "Calendar",
  },
};

/**
 * Order for displaying categories
 */
export const CLUB_BADGE_CATEGORY_ORDER: ClubBadgeCategoryId[] = [
  "festivals_completed",
  "movies_watched",
  "members",
  "seasons_completed",
];

/**
 * Category-specific tier labels (6 tiers each)
 * Each category has thematically appropriate names
 */
export const CLUB_BADGE_TIER_LABELS: Record<ClubBadgeCategoryId, string[]> = {
  festivals_completed: [
    "Indie Premiere",
    "Studio Screening",
    "Blockbuster Run",
    "Franchise Circuit",
    "Empire Theater",
    "Legacy Cinema",
  ],
  movies_watched: [
    "Indie Collection",
    "Studio Library",
    "Blockbuster Archive",
    "Franchise Vault",
    "Empire Repository",
    "Legacy Filmothek",
  ],
  members: [
    "Indie Crew",
    "Studio Team",
    "Blockbuster Squad",
    "Franchise Family",
    "Empire Guild",
    "Legacy Society",
  ],
  seasons_completed: [
    "Indie Season",
    "Studio Run",
    "Blockbuster Streak",
    "Franchise Era",
    "Empire Epoch",
    "Legacy Saga",
  ],
};
