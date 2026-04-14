"use client";

import { useEffect } from "react";
import { initFromDbPreferences } from "@/lib/themes/theme-store";

interface ThemeSyncProviderProps {
  theme: "light" | "dark";
  colorTheme: string;
  children: React.ReactNode;
}

/**
 * Syncs server-fetched theme preferences from the database
 * into the client-side theme store. This ensures cross-device
 * theme persistence — DB is the source of truth.
 */
export function ThemeSyncProvider({ theme, colorTheme, children }: ThemeSyncProviderProps) {
  useEffect(() => {
    initFromDbPreferences(theme, colorTheme);
  }, [theme, colorTheme]);

  return <>{children}</>;
}
