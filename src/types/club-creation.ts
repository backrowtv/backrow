/**
 * Club Creation Types
 *
 * Types and interfaces for club creation form and validation.
 * Simplified to Standard/Endless festival choice with smart defaults.
 *
 * Note: Core types like ThemeGovernance, FestivalType, RubricEnforcement are
 * imported from club-settings.ts to maintain a single source of truth.
 */

// Re-export shared types from club-settings for consistency
export type {
  ThemeGovernance,
  FestivalType,
  RubricEnforcement,
  TimingType,
  RatingRubric,
  MoviePoolGovernance,
} from "./club-settings";

// Import types we need to use in this file
import type { ThemeGovernance, FestivalType, MoviePoolGovernance } from "./club-settings";

/**
 * Background selector types (used by festival/club appearance settings).
 * Not used by the club creation wizard — kept here for backward compatibility.
 */
export type BackgroundType = "gradient" | "preset_image" | "custom_image";

export interface BackgroundOption {
  id: string;
  name: string;
  type: BackgroundType;
  value: string;
  preview?: string;
}

/**
 * Festival choice — Standard or Endless
 */
export type FestivalChoice = "standard" | "endless";
export type PrivacyLevel = "public_open" | "public_moderated" | "private";
export type TimingMode = "manual" | "scheduled";

/**
 * Festival default settings shape
 */
export interface FestivalDefaultSettings {
  festivalType: FestivalType;
  themesEnabled: boolean;
  themeGovernance: ThemeGovernance;
  maxThemesPerUser: number;
  maxNominationsPerUser: number;
  blindNominations: boolean;
  scoringEnabled: boolean;
  nominationGuessing: boolean;
  seasonStandingsEnabled: boolean;
  timingMode: TimingMode;
  autoStartNextFestival: boolean;
  moviePoolGovernance: MoviePoolGovernance;
  allowNonAdminMoviePool: boolean;
}

/**
 * Default settings for Standard festivals (competitive)
 */
export const DEFAULT_STANDARD_SETTINGS: FestivalDefaultSettings = {
  festivalType: "standard",
  themesEnabled: true,
  themeGovernance: "random",
  maxThemesPerUser: 5,
  maxNominationsPerUser: 1,
  blindNominations: true,
  scoringEnabled: true,
  nominationGuessing: true,
  seasonStandingsEnabled: true,
  timingMode: "manual",
  autoStartNextFestival: false,
  moviePoolGovernance: "democracy",
  allowNonAdminMoviePool: true,
};

/**
 * Default settings for Endless festivals (casual, no competition)
 */
export const DEFAULT_ENDLESS_SETTINGS: FestivalDefaultSettings = {
  festivalType: "endless",
  themesEnabled: true,
  themeGovernance: "autocracy",
  maxThemesPerUser: 5,
  maxNominationsPerUser: 3,
  blindNominations: false,
  scoringEnabled: false,
  nominationGuessing: false,
  seasonStandingsEnabled: false,
  timingMode: "manual",
  autoStartNextFestival: false,
  moviePoolGovernance: "democracy",
  allowNonAdminMoviePool: true,
};

/**
 * Apply a festival choice (Standard/Endless) to wizard state with smart defaults
 */
export function applyFestivalChoiceToState(
  state: ClubWizardState,
  choice: FestivalChoice
): ClubWizardState {
  const defaults = choice === "standard" ? DEFAULT_STANDARD_SETTINGS : DEFAULT_ENDLESS_SETTINGS;
  return {
    ...state,
    festivalChoice: choice,
    festivalType: defaults.festivalType,
    themesEnabled: defaults.themesEnabled,
    themeGovernance: defaults.themeGovernance,
    maxThemesPerUser: defaults.maxThemesPerUser,
    maxNominationsPerUser: defaults.maxNominationsPerUser,
    blindNominations: defaults.blindNominations,
    scoringEnabled: defaults.scoringEnabled,
    nominationGuessing: defaults.nominationGuessing,
    seasonStandingsEnabled: defaults.seasonStandingsEnabled,
    timingMode: defaults.timingMode,
    autoStartNextFestival: defaults.autoStartNextFestival,
    moviePoolGovernance: defaults.moviePoolGovernance,
    allowNonAdminMoviePool: defaults.allowNonAdminMoviePool,
  };
}

/**
 * Wizard state for club creation (4-step wizard).
 * Rubric configuration lives in club settings, not in the wizard.
 */
export interface ClubWizardState {
  // Navigation
  currentStep: number;

  // Step 1: Identity
  name: string;
  description: string;
  avatarFile: File | null;
  avatarPreview: string | null;
  avatarIcon: string | null;
  avatarColorIndex: number | null;
  avatarBorderColorIndex: number | null;
  themeColor: string | null;
  genres: string[];

  // Step 2: Mode
  festivalChoice: FestivalChoice | null;
  festivalType: FestivalType;

  // Step 3: How It Runs
  themesEnabled: boolean;
  themeGovernance: ThemeGovernance;
  maxThemesPerUser: number;
  maxNominationsPerUser: number;
  blindNominations: boolean;
  timingMode: TimingMode;
  autoStartNextFestival: boolean;
  scoringEnabled: boolean;
  nominationGuessing: boolean;
  seasonStandingsEnabled: boolean;
  moviePoolGovernance: MoviePoolGovernance;
  allowNonAdminMoviePool: boolean;

  // Step 4: Review & Launch
  privacy: PrivacyLevel;
  email: string;
  username: string;
  authPassword: string;
  confirmPassword: string;
}

/**
 * Initial wizard state
 */
export const INITIAL_WIZARD_STATE: ClubWizardState = {
  currentStep: 1,
  festivalChoice: null,
  festivalType: "standard",
  name: "",
  description: "",
  avatarFile: null,
  avatarPreview: null,
  avatarIcon: null,
  avatarColorIndex: null,
  avatarBorderColorIndex: null,
  themeColor: null,
  genres: [],
  themesEnabled: true,
  themeGovernance: "random",
  maxThemesPerUser: 5,
  maxNominationsPerUser: 1,
  blindNominations: true,
  timingMode: "manual",
  autoStartNextFestival: false,
  scoringEnabled: true,
  nominationGuessing: true,
  seasonStandingsEnabled: true,
  moviePoolGovernance: "democracy",
  allowNonAdminMoviePool: true,
  privacy: "private",
  email: "",
  username: "",
  authPassword: "",
  confirmPassword: "",
};

export interface ClubCreationData {
  name: string;
  description?: string;
  privacy: PrivacyLevel;
  picture?: File;
  keywords?: string[];
}

export interface KeywordValidation {
  isValid: boolean;
  error?: string;
  wordCount?: number;
  charCount?: number;
}

/**
 * Validates a keyword/tag according to rules:
 * - Max 2 words per tag
 * - Max 25 characters per tag
 */
export function validateKeyword(keyword: string): KeywordValidation {
  const trimmed = keyword.trim();

  if (!trimmed) {
    return {
      isValid: false,
      error: "Keyword cannot be empty",
      charCount: 0,
      wordCount: 0,
    };
  }

  const charCount = trimmed.length;
  const words = trimmed.split(/\s+/).filter((w) => w.length > 0);
  const wordCount = words.length;

  if (charCount > 25) {
    return {
      isValid: false,
      error: `Keyword must be 25 characters or less (${charCount}/25)`,
      charCount,
      wordCount,
    };
  }

  if (wordCount > 2) {
    return {
      isValid: false,
      error: `Keyword must be 2 words or less (${wordCount} words)`,
      charCount,
      wordCount,
    };
  }

  return {
    isValid: true,
    charCount,
    wordCount,
  };
}

/**
 * Validates an array of keywords
 * - Max 10 tags total
 * - Each tag must pass validateKeyword rules
 */
export function validateKeywords(keywords: string[]): {
  isValid: boolean;
  errors: string[];
  validKeywords: string[];
} {
  const errors: string[] = [];
  const validKeywords: string[] = [];

  if (keywords.length > 10) {
    errors.push(`Maximum 10 keywords allowed (${keywords.length} provided)`);
    return { isValid: false, errors, validKeywords };
  }

  keywords.forEach((keyword, index) => {
    const validation = validateKeyword(keyword);
    if (!validation.isValid) {
      errors.push(`Keyword ${index + 1}: ${validation.error}`);
    } else {
      validKeywords.push(keyword.trim());
    }
  });

  return {
    isValid: errors.length === 0,
    errors,
    validKeywords,
  };
}
