"use client";

/**
 * ClubThemedBackground
 *
 * @deprecated This component is deprecated. CSS variables for club theming
 * are now handled by ClubThemeProvider in the club layout, which properly
 * sets and cleans up CSS variables when entering/leaving club pages.
 *
 * This component is kept for backwards compatibility but does nothing.
 */
interface ClubThemedBackgroundProps {
  /** The theme color ID from ClubThemeColorPicker */
  themeColor?: string | null;
  /** @deprecated Use themeColor instead */
  backgroundType?: string | null;
  /** @deprecated Use themeColor instead */
  backgroundValue?: string | null;
}

export function ClubThemedBackground({
  themeColor: _themeColor,

  backgroundType: _backgroundType,

  backgroundValue: _backgroundValue,
}: ClubThemedBackgroundProps) {
  // CSS variables are now handled by ClubThemeProvider in the club layout.
  // This component is kept for backwards compatibility with existing imports.
  return null;
}
