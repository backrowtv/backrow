import type { ClubSettings } from "@/types/club-settings";
import type { AppRouterInstance } from "next/dist/shared/lib/app-router-context.shared-runtime";

// Timing configuration types for festival phases
export interface TimingConfig {
  type: "manual" | "duration" | "scheduled";
  duration_days?: number;
  duration_weeks?: number;
  duration_months?: number;
  scheduled_datetime?: string;
}

export interface RetentionConfig {
  value: number;
  unit: "days" | "weeks" | "months";
}

// Lighter props for timing sub-components that don't need full section props
// Uses Record type for flexibility since timing settings are stored as JSON
export interface TimingSectionProps {
  localSettings: Record<string, unknown>;
  updateSetting: (key: string, value: unknown) => void;
}

/**
 * Festival constraints — simplified from the old ModeConstraints system.
 * Only one flag matters: is this an Endless festival?
 * Standard festivals have full control over all settings.
 */
export interface FestivalConstraints {
  isEndless: boolean;
}

/** @deprecated Use FestivalConstraints instead */
export type ModeConstraints = FestivalConstraints;

export interface SettingsSectionProps {
  clubId: string;
  clubSlug?: string;
  localSettings: Partial<ClubSettings>;
  initialSettings: Partial<ClubSettings>;
  isPending: boolean;
  handleSave: () => Promise<void>;
  updateSetting: <K extends keyof ClubSettings>(key: K, value: ClubSettings[K]) => void;
  updateSettingLoose: (key: string, value: unknown) => void;
  updateBooleanSetting: (key: keyof ClubSettings, checked: boolean | "indeterminate") => void;
  modeConstraints: FestivalConstraints;
  router: AppRouterInstance;
  startTransition: (callback: () => void) => void;
  festivalType?: string;
}

export interface ThemesSectionProps extends SettingsSectionProps {
  themeSubmissionsLocked?: boolean;
}
