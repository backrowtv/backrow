"use client";

import { useEffect, useLayoutEffect, useRef } from "react";

interface ClubThemeProviderProps {
  themeColor: string | null;
}

// Use useLayoutEffect for synchronous updates before paint
const useIsomorphicLayoutEffect = typeof window !== "undefined" ? useLayoutEffect : useEffect;

/**
 * Client component that sets club theme CSS variables.
 * This runs on both mobile and desktop, ensuring theme colors
 * are applied across all club pages.
 *
 * IMPORTANT: This cleans up CSS variables ONLY on unmount (leaving club)
 * to prevent theme colors from bleeding into non-club pages.
 */
export function ClubThemeProvider({ themeColor }: ClubThemeProviderProps) {
  // Track if we've ever set a theme color
  const hasSetTheme = useRef(false);

  // Set or clear CSS variables when themeColor changes
  useIsomorphicLayoutEffect(() => {
    if (themeColor) {
      // Set theme colors
      document.documentElement.style.setProperty("--club-accent", themeColor);
      document.documentElement.style.setProperty("--club-accent-muted", `${themeColor}26`);
      document.documentElement.style.setProperty("--club-accent-light", `${themeColor}4D`);
      hasSetTheme.current = true;
    } else if (hasSetTheme.current) {
      // Clear theme colors when navigating to a club without a theme
      document.documentElement.style.removeProperty("--club-accent");
      document.documentElement.style.removeProperty("--club-accent-muted");
      document.documentElement.style.removeProperty("--club-accent-light");
      hasSetTheme.current = false;
    }
  }, [themeColor]);

  // Cleanup ONLY on unmount (when leaving club pages entirely)
  useEffect(() => {
    return () => {
      // Only cleanup if we actually set a theme
      if (hasSetTheme.current) {
        document.documentElement.style.removeProperty("--club-accent");
        document.documentElement.style.removeProperty("--club-accent-muted");
        document.documentElement.style.removeProperty("--club-accent-light");
      }
    };
  }, []); // Empty deps = only runs on mount/unmount

  // Render nothing - this is just for setting CSS variables
  return null;
}
