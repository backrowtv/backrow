/**
 * Zod schemas for club settings validation
 *
 * These schemas provide runtime validation and type inference for club settings.
 * Use parseClubSettings() to safely parse settings from the database.
 */

import { z } from "zod";
import type { ClubSettings } from "@/types/club-settings";

// Theme governance modes
export const ThemeGovernanceSchema = z.enum(["democracy", "random", "autocracy"]);

// Festival type
export const FestivalTypeSchema = z.enum(["standard", "endless"]);

// Rating configurations
export const ResultsRevealTypeSchema = z.enum(["automatic", "manual"]);
export const ResultsRevealDirectionSchema = z.enum(["forward", "backward"]);
export const TimingTypeSchema = z.enum(["manual", "duration", "scheduled"]);
export const PlacementPointsTypeSchema = z.enum(["default", "custom", "formula"]);

// Rating rubric schema
export const RatingRubricSchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string().optional(),
  weight: z.number().min(0).max(100),
  required: z.boolean(),
  order: z.number(),
});

// Placement point schema
export const PlacementPointSchema = z.object({
  place: z.number().min(1),
  points: z.number().nullable(),
});

// Placement points config
export const PlacementPointsConfigSchema = z.object({
  type: PlacementPointsTypeSchema,
  points: z.array(PlacementPointSchema).optional(),
  formula: z.string().optional(),
});

// Phase timing config
export const PhaseTimingSchema = z.object({
  type: TimingTypeSchema,
  duration_days: z.number().optional(),
  duration_weeks: z.number().optional(),
  duration_months: z.number().optional(),
  scheduled_datetime: z.string().optional(),
});

// Duration unit for default phase durations
export const DurationUnitSchema = z.enum(["days", "weeks", "months"]);

// Default phase duration (for pre-populating festival creation form)
export const DefaultPhaseDurationSchema = z.object({
  value: z.number().min(1).max(365),
  unit: DurationUnitSchema,
});

/**
 * Main club settings schema with defaults
 *
 * All fields are optional to handle partial settings from the database.
 * Use .parse() or .safeParse() to validate and get typed results.
 */
export const ClubSettingsSchema = z
  .object({
    // Theme Settings
    themes_enabled: z.boolean().default(true),
    theme_governance: ThemeGovernanceSchema.default("democracy"),
    theme_voting_enabled: z.boolean().default(true),
    max_themes_per_user: z.number().min(1).max(20).default(5),

    // Nomination Settings
    max_nominations_per_user: z.number().min(1).max(10).default(1),
    max_nominations_per_festival: z.number().min(1).max(50).nullable().default(null),
    blind_nominations_enabled: z.boolean().default(false),

    // Festival Settings
    festival_type: FestivalTypeSchema.default("standard"),

    // Rating Settings
    club_ratings_enabled: z.boolean().default(true),
    rating_min: z.number().default(0),
    rating_max: z.number().default(10),
    rating_increment: z.number().min(0.1).max(1).default(0.5),
    rating_rubrics: z.array(RatingRubricSchema).optional(),

    // Scoring Settings
    scoring_enabled: z.boolean().default(false),
    placement_points: z
      .union([PlacementPointsConfigSchema, z.array(PlacementPointSchema)])
      .optional(),

    // Timing Settings
    nomination_timing: PhaseTimingSchema.optional(),
    watch_rate_timing: PhaseTimingSchema.optional(),
    auto_start_next_festival: z.boolean().default(false),

    // Default Phase Durations (pre-populate festival creation form)
    default_nomination_duration: DefaultPhaseDurationSchema.optional(),
    default_watch_rate_duration: DefaultPhaseDurationSchema.optional(),

    // Results Settings
    results_reveal_type: ResultsRevealTypeSchema.default("manual"),
    results_reveal_delay_seconds: z.number().min(1).max(60).default(5),
    results_reveal_direction: ResultsRevealDirectionSchema.default("forward"),

    // Guessing Settings
    nomination_guessing_enabled: z.boolean().default(false),
    guessing_deadline_days: z.number().min(1).max(30).optional(),
  })
  .partial();

// Type inferred from schema
export type ValidatedClubSettings = z.infer<typeof ClubSettingsSchema>;

/**
 * Parse and validate club settings with defaults
 *
 * @param settings - Raw settings from database (could be null/undefined/partial)
 * @returns Validated settings with defaults applied
 *
 * @example
 * const settings = parseClubSettings(club.settings)
 * // settings is now fully typed with defaults
 */
export function parseClubSettings(settings: unknown): ValidatedClubSettings {
  const result = ClubSettingsSchema.safeParse(settings ?? {});

  if (!result.success) {
    console.warn("Invalid club settings, using defaults:", result.error.issues);
    return ClubSettingsSchema.parse({});
  }

  return result.data;
}

/**
 * Safely parse club settings without throwing
 * Returns tuple [data, error]
 */
export function safeParseClubSettings(
  settings: unknown
): [ValidatedClubSettings, null] | [null, z.ZodError] {
  const result = ClubSettingsSchema.safeParse(settings ?? {});

  if (result.success) {
    return [result.data, null];
  }

  return [null, result.error];
}

/**
 * Validate a partial settings update
 *
 * @param update - Partial settings to validate
 * @returns Validation result
 */
export function validateSettingsUpdate(
  update: Partial<ClubSettings>
): { valid: true; data: Partial<ValidatedClubSettings> } | { valid: false; errors: string[] } {
  const result = ClubSettingsSchema.partial().safeParse(update);

  if (result.success) {
    return { valid: true, data: result.data };
  }

  return {
    valid: false,
    errors: result.error.issues.map((issue) => `${issue.path.join(".")}: ${issue.message}`),
  };
}

/**
 * Get a single setting value with type safety
 */
export function getSettingValue<K extends keyof ValidatedClubSettings>(
  settings: unknown,
  key: K
): ValidatedClubSettings[K] {
  const parsed = parseClubSettings(settings);
  return parsed[key];
}

/**
 * Check if endless mode is enabled
 */
export function isEndlessMode(settings: unknown): boolean {
  return getSettingValue(settings, "festival_type") === "endless";
}

/**
 * Check if themes are enabled
 */
export function areThemesEnabled(settings: unknown): boolean {
  return getSettingValue(settings, "themes_enabled") === true;
}

/**
 * Check if scoring/ratings are enabled
 */
export function isScoringEnabled(settings: unknown): boolean {
  return getSettingValue(settings, "club_ratings_enabled") === true;
}
