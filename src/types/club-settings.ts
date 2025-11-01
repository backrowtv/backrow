/**
 * Club Settings Type Definitions
 *
 * Defines the structure for club settings stored in the clubs.settings JSONB column.
 * This interface covers sections 1-3: Themes, Nominations, and Festival Settings.
 */

export type ThemeGovernance = "democracy" | "random" | "autocracy";
export type MoviePoolGovernance = "democracy" | "random" | "autocracy";
export type FestivalType = "standard" | "endless";

export type RatingVisualIcon = "stars" | "popcorn" | "ticket" | "film" | "clapperboard";

/**
 * Slider icon for rubric rating UI
 * Controls the visual style of the slider thumb in the rating interface
 */
export type RubricSliderIcon = "default" | "stars" | "popcorn" | "ticket" | "film" | "clapperboard";

/**
 * Rubric enforcement level for clubs
 * - 'off': Rubrics disabled for this club
 * - 'suggested': Club has a rubric but members can use their own
 * - 'required': All members must use the club's rubric
 */
export type RubricEnforcement = "off" | "suggested" | "required";

export type ResultsRevealType = "automatic" | "manual";
export type ResultsRevealDirection = "forward" | "backward";
export type TimingType = "manual" | "duration" | "scheduled";
export type PlacementPointsType = "default" | "custom";

/**
 * Rating category within a rubric
 * Note: Previously called "rubric" but renamed to "category" for clarity
 * A "rubric" is the entire set of categories with a name
 */
export interface RatingRubric {
  id: string;
  name: string;
  weight: number; // 0-100 (percentage), sum should equal 100
  required: boolean; // enforced vs suggested
  order: number; // display order
  locked?: boolean; // when true, weight is frozen during manual +/- and auto-balance
}

/** Fixed scale for all rubric ratings — independent of user's personal rating scale */
export const RUBRIC_SCALE = { MIN: 0, MAX: 10, STEP: 1 } as const;

/**
 * A complete rubric with name and categories
 * Used for user_rubrics table and rubric library
 */
export interface UserRubric {
  id: string;
  user_id: string;
  name: string;
  categories: RatingRubric[];
  is_default: boolean;
  created_at: string;
  updated_at: string;
}

/**
 * Helper function to create a default rubric
 */
export function createDefaultRubric(order: number, existingRubrics: RatingRubric[]): RatingRubric {
  const totalExistingWeight = existingRubrics.reduce((sum, r) => sum + r.weight, 0);
  const remainingWeight = Math.max(0, 100 - totalExistingWeight);

  return {
    id: `rubric-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    name: "",
    weight: remainingWeight > 0 ? remainingWeight : 0,
    required: false,
    order,
  };
}

/**
 * Preset Rubric Templates
 * Users can start from these templates when creating custom rubrics
 */
export interface PresetRubricTemplate {
  id: string;
  name: string;
  description: string;
  rubrics: Omit<RatingRubric, "id">[];
}

/**
 * Helper to generate unique IDs for preset rubrics
 */
export function createRubricsFromPreset(preset: PresetRubricTemplate): RatingRubric[] {
  return preset.rubrics.map((rubric, index) => ({
    ...rubric,
    id: `rubric-${Date.now()}-${Math.random().toString(36).substr(2, 9)}-${index}`,
  }));
}

export const PRESET_RUBRICS: PresetRubricTemplate[] = [
  {
    id: "essential",
    name: "Essential",
    description:
      "A streamlined rubric for everyday movie watching — covers the fundamentals without overcomplicating things",
    rubrics: [
      { name: "Story", weight: 30, required: false, order: 0 },
      { name: "Performance", weight: 25, required: false, order: 1 },
      { name: "Craft", weight: 20, required: false, order: 2 },
      { name: "Engagement", weight: 25, required: false, order: 3 },
    ],
  },
  {
    id: "comprehensive",
    name: "Comprehensive",
    description:
      "A detailed breakdown for deeper film analysis — great for competitive festivals or serious cinephiles",
    rubrics: [
      { name: "Story", weight: 20, required: false, order: 0 },
      { name: "Performance", weight: 15, required: false, order: 1 },
      { name: "Direction", weight: 15, required: false, order: 2 },
      { name: "Cinematography", weight: 12, required: false, order: 3 },
      { name: "Sound & Score", weight: 10, required: false, order: 4 },
      { name: "Originality", weight: 13, required: false, order: 5 },
      { name: "Engagement", weight: 15, required: false, order: 6 },
    ],
  },
  {
    id: "social",
    name: "Social",
    description:
      "Built for watch parties and casual clubs — focuses on the shared experience over technical merit",
    rubrics: [
      { name: "Entertainment", weight: 30, required: false, order: 0 },
      { name: "Shareability", weight: 25, required: false, order: 1 },
      { name: "Craft", weight: 20, required: false, order: 2 },
      { name: "Memorability", weight: 25, required: false, order: 3 },
    ],
  },
];

/**
 * Calculate weighted score from rubric ratings
 * Scale (min/max) is uniform across all rubrics, set globally
 */
export function calculateWeightedScore(
  rubricRatings: Record<string, number>,
  rubrics: RatingRubric[],
  scale: { min: number; max: number }
): number {
  if (rubrics.length === 0) return scale.min;

  const range = scale.max - scale.min;
  if (range === 0) return scale.min;

  const totalPercentage = rubrics.reduce((sum, rubric) => {
    const score = rubricRatings[rubric.id] ?? scale.min;
    const normalized = (score - scale.min) / range;
    return sum + normalized * rubric.weight;
  }, 0);

  // Scale from 0-100 percentage to output scale
  return scale.min + (totalPercentage / 100) * range;
}

/**
 * Calculate the contribution of a single rubric to the total score
 * Scale (min/max) is uniform across all rubrics, set globally
 */
export function calculateRubricContribution(
  score: number,
  rubric: RatingRubric,
  scale: { min: number; max: number }
): { earned: number; possible: number; percentage: number } {
  const range = scale.max - scale.min;
  if (range === 0) return { earned: 0, possible: rubric.weight, percentage: 0 };

  const normalized = (score - scale.min) / range;
  const earned = normalized * rubric.weight;

  return {
    earned,
    possible: rubric.weight,
    percentage: normalized * 100,
  };
}

/** @deprecated Use PlacementRule instead — kept for backward compat with existing club data */
export interface PlacementPoint {
  place: number;
  points: number | null;
}

/**
 * A custom scoring rule covering a single placement or a range.
 * For single placements, from === to.
 */
export interface PlacementRule {
  from: number;
  to: number;
  points: number;
}

export interface PlacementPointsConfig {
  type: PlacementPointsType;
  rules?: PlacementRule[];
  points?: PlacementPoint[]; // Legacy format
  formula?: string; // Legacy format
}

export interface PhaseTiming {
  type: TimingType;
  duration_days?: number;
  duration_weeks?: number;
  duration_months?: number;
  scheduled_datetime?: string; // ISO datetime
}

/**
 * Default duration for festival phases
 * Used to pre-populate festival creation form
 */
export type DurationUnit = "days" | "weeks" | "months";

export interface DefaultPhaseDuration {
  value: number;
  unit: DurationUnit;
}

export interface ClubSettings {
  // Theme Settings (Section 1)
  themes_enabled?: boolean;
  theme_governance?: ThemeGovernance;
  theme_voting_enabled?: boolean;
  max_themes_per_user?: number;

  // Nomination Settings (Section 2)
  max_nominations_per_user?: number;
  max_nominations_per_festival?: number | null; // null = unlimited
  blind_nominations_enabled?: boolean; // When enabled, users can see WHO nominated but not WHAT until results phase. Only available for Standard festivals.
  allow_non_admin_nominations?: boolean; // Can non-admin members nominate movies? (default: true)

  // Festival Settings (Section 3)
  festival_type?: FestivalType;

  // Movie Pool Settings (Endless Festivals only - Section 3.5)
  movie_pool_enabled?: boolean; // Toggle movie pool on/off (default: true for endless)
  movie_pool_voting_enabled?: boolean; // Enable upvote/downvote on pool movies
  movie_pool_governance?: MoviePoolGovernance; // How movies are selected for Now Showing
  // democracy: Top-voted auto-promotes to Now Showing when threshold reached
  // random: Random selection from pool when admin triggers
  // autocracy: Admin manually moves movies to Now Showing
  movie_pool_auto_promote_threshold?: number; // Votes needed for auto-promote (democracy mode)
  movie_pool_max_per_user?: number; // Max movies per user in pool (default: 5)
  allow_non_admin_movie_pool?: boolean; // Can members add to movie pool? (default: true)

  // Endless Festival Display Settings
  endless_festival_show_title?: boolean; // Show "Now Showing" title header (default: true)

  // Rating Settings (Section 4 - Settings Clarity v2)
  club_ratings_enabled?: boolean; // Toggle club ratings on/off
  rating_min?: number; // Default: 0
  rating_max?: number; // Default: 10
  rating_increment?: number; // Default: 0.1
  rating_rubrics?: RatingRubric[]; // Club's rubric categories (the club's single rubric)
  rating_rubric_name?: string; // Name of the club's rubric
  rating_rubric_slider_icon?: RubricSliderIcon; // Icon style for rubric slider thumbs
  rubric_enforcement?: RubricEnforcement; // 'off' | 'suggested' | 'required'

  // Scoring Settings (Section 5 - Settings Clarity v2)
  placement_points?: PlacementPointsConfig | PlacementPoint[]; // Placement-based scoring (replaces action-based)

  // Timing Settings (Section 6 - Settings Clarity v2)
  nomination_timing?: PhaseTiming;
  watch_rate_timing?: PhaseTiming;
  auto_start_next_festival?: boolean;

  // Default Phase Durations (pre-populate festival creation form)
  default_nomination_duration?: DefaultPhaseDuration; // How long nomination phase lasts
  default_watch_rate_duration?: DefaultPhaseDuration; // Duration from nomination close to results

  // Results Settings (Section 7 - Settings Clarity v2)
  results_reveal_type?: ResultsRevealType; // Default: 'manual'
  results_reveal_delay_seconds?: number; // Default: 5 (for automatic mode)
  results_reveal_direction?: ResultsRevealDirection;

  // Guessing Settings (Section 8 - Settings Clarity v2 - Updated)
  nomination_guessing_enabled?: boolean; // Only works with blind_nominations_enabled (nominator guessing, not winner guessing)
  guessing_deadline_days?: number;

  // Member Permissions (Section 9)
  allow_critics_to_invite?: boolean; // Default: false - When true, critics can invite new members

  // Legacy/Existing Settings (preserved for backward compatibility - will be deprecated)
  theme_selection?: string;
  theme_submissions_enabled?: boolean;
  max_nominations?: number;
  nomination_deadline_days?: number;
  allow_multiple_nominations?: boolean;
  scoring_enabled?: boolean;
  festival_winner_enabled?: boolean;
  guessing_points?: number; // Deprecated - no points for guessing in v2
  rating_scale?: string; // Deprecated - use rating_min/max/increment instead
  rating_deadline_days?: number;
  show_ratings_before_results?: boolean;
  extended_reviews?: boolean;
  points_method?: string; // Deprecated - placement-based only
  points_nomination?: number; // Deprecated - replaced by placement_points
  points_rating?: number; // Deprecated - replaced by placement_points
  points_correct_guess?: number; // Deprecated - replaced by placement_points
  season_standings_enabled?: boolean;
  phase_duration_days?: number; // Deprecated - use nomination_timing/watch_rate_timing
  auto_advance?: boolean; // Deprecated - use nomination_timing/watch_rate_timing
  results_display_mode?: string; // Deprecated - use results_reveal_type/direction
  results_reveal_timing_hours?: number; // Deprecated
  spotlight_animation_enabled?: boolean;
  show_detailed_stats?: boolean;
}

/**
 * Default values for club settings
 */
export const DEFAULT_CLUB_SETTINGS: Partial<ClubSettings> = {
  themes_enabled: true,
  theme_governance: "democracy",
  theme_voting_enabled: true,
  max_themes_per_user: 5,
  max_nominations_per_user: 1,
  max_nominations_per_festival: null, // unlimited by default
  festival_type: "standard",
  // Movie Pool defaults (for endless festivals)
  movie_pool_enabled: true,
  movie_pool_voting_enabled: true,
  movie_pool_governance: "autocracy",
  movie_pool_auto_promote_threshold: 5,
  movie_pool_max_per_user: 5,
  allow_non_admin_movie_pool: true,
  // Endless Festival Display
  endless_festival_show_title: true,
  // Rating Settings (v2 defaults)
  club_ratings_enabled: true,
  rating_min: 0,
  rating_max: 10,
  rating_increment: 0.1,
  // Scoring Settings (v2 defaults)
  placement_points: { type: "default" },
  // Results Settings (v2 defaults)
  results_reveal_type: "manual",
  results_reveal_delay_seconds: 5,
  results_reveal_direction: "forward",
  // Timing Settings (v2 defaults)
  nomination_timing: { type: "manual" },
  watch_rate_timing: { type: "manual" },
  auto_start_next_festival: false,
  // Member Permissions defaults
  allow_critics_to_invite: false,
};
