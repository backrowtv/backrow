"use client";

import { useEffect } from "react";
import { useTheme } from "@/components/ui/theme-toggle";

/**
 * Forces dark mode on the page via ThemeProvider's override mechanism.
 * Restores the user's theme preference on unmount.
 */
export function ForceDarkMode() {
  const { setOverrideTheme } = useTheme();

  useEffect(() => {
    setOverrideTheme("dark");
    return () => {
      setOverrideTheme(null);
    };
  }, [setOverrideTheme]);

  return null;
}
