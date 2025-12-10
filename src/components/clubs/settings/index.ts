/**
 * Settings Components
 *
 * Components for club settings, forms, and configuration.
 */

// Main settings components
export { SettingsForm } from "../SettingsForm";
export { SettingsTab } from "../SettingsTab";

// Form components
export { AgeRestrictionForm } from "../AgeRestrictionForm";
export { BackgroundSelector } from "../BackgroundSelector";
export { ClubForm } from "../ClubForm";
export { ClubImageryForm } from "../ClubImageryForm";
export { ClubNameForm } from "../ClubNameForm";
export { ClubNotificationSettingsForm } from "../ClubNotificationSettingsForm";
export { ClubPersonalizationForm } from "../ClubPersonalizationForm";
export { ClubRubricSelector } from "../ClubRubricSelector";
export { KeywordsInput } from "../KeywordsInput";

// Timing section components (extracted from SettingsForm)
export {
  NominationTimingSection,
  WatchRateTimingSection,
  RecentlyWatchedRetentionSection,
} from "./TimingSections";

// Guessing section component (extracted from SettingsForm)
export { GuessingSection } from "./GuessingSection";

// Nomination section component (extracted from SettingsForm)
export { NominationSection } from "./NominationSection";

// Types
export type { SettingsSectionProps, TimingSectionProps, ThemesSectionProps } from "./types";
