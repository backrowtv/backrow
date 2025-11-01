"use client";

import { useState, useEffect, useCallback, useRef } from "react";

interface ClubPreferences {
  themePoolExpanded?: boolean;
  moviePoolExpanded?: boolean;
  clubResourcesExpanded?: boolean;
  moviePoolSort?: string;
  [key: string]: boolean | string | undefined;
}

function getStorageKey(clubId: string) {
  return `backrow_club_prefs_${clubId}`;
}

/**
 * Hook to persist user preferences per club in localStorage.
 * Handles SSR hydration safely by returning defaultValue until mounted.
 *
 * @param clubId - The club ID to store preferences for
 * @param key - The preference key (themePoolExpanded, moviePoolExpanded, clubResourcesExpanded)
 * @param defaultValue - Default value to use when no preference is stored
 * @returns [currentValue, setValue, hasHydrated] tuple
 *          hasHydrated is true after localStorage has been checked (use to skip animation on restore)
 */
export function useClubPreference<T = boolean>(
  clubId: string,
  key: string,
  defaultValue: T
): [T, (value: T) => void, boolean] {
  // Initialize with default to avoid hydration mismatch
  const [value, setValue] = useState<T>(defaultValue);
  const [hasHydrated, setHasHydrated] = useState(false);
  // Track if user has interacted (toggled) to know when to animate
  const hasInteracted = useRef(false);

  // Load from localStorage after mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem(getStorageKey(clubId));
      if (stored) {
        const prefs: ClubPreferences = JSON.parse(stored);
        if (prefs[key] !== undefined) {
          setValue(prefs[key] as T);
        }
      }
    } catch {
      // Ignore localStorage errors (private browsing, etc.)
    }
    setHasHydrated(true);
  }, [clubId, key]);

  // Persist changes to localStorage
  const setPreference = useCallback(
    (newValue: T) => {
      hasInteracted.current = true;
      setValue(newValue);
      try {
        const stored = localStorage.getItem(getStorageKey(clubId));
        const prefs: ClubPreferences = stored ? JSON.parse(stored) : {};
        (prefs as Record<string, unknown>)[key] = newValue;
        localStorage.setItem(getStorageKey(clubId), JSON.stringify(prefs));
      } catch {
        // Ignore localStorage errors
      }
    },
    [clubId, key]
  );

  return [value, setPreference, hasHydrated] as [T, (value: T) => void, boolean];
}
