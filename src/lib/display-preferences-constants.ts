// Display preferences types and constants
// Separated from server actions because 'use server' files can only export async functions

export type TimeFormat = "12h" | "24h";
export type DateFormat = "MDY" | "DMY" | "YMD"; // Month-Day-Year, Day-Month-Year, Year-Month-Day

export interface DisplayPreferences {
  timeFormat: TimeFormat;
  dateFormat: DateFormat;
}

// Default preferences - will be overridden by user's saved preferences or locale detection
export const DEFAULT_DISPLAY_PREFERENCES: DisplayPreferences = {
  timeFormat: "12h",
  dateFormat: "MDY",
};

// Theme preferences - persisted to Supabase for cross-device sync
export type ThemeMode = "light" | "dark";

export interface ThemePreferences {
  theme: ThemeMode;
  colorTheme: string;
}

export const DEFAULT_THEME_PREFERENCES: ThemePreferences = {
  theme: "dark",
  colorTheme: "default",
};
