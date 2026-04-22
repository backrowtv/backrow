"use client";

/**
 * ClubThemedBackground
 *
 * @deprecated CSS variables for club theming are scoped on `.club-layout`
 * in the club layout. This component is kept as a no-op for call sites that
 * still import it.
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
  return null;
}
