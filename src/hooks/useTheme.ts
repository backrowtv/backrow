"use client";

import { useState, useEffect, useSyncExternalStore } from "react";

type Theme = "light" | "dark";

/**
 * Gets the current theme from localStorage or document class
 */
function getTheme(): Theme {
  if (typeof window === "undefined") {
    return "dark";
  }

  // First try localStorage
  const stored = localStorage.getItem("theme") as Theme | null;
  if (stored === "light" || stored === "dark") {
    return stored;
  }

  // Fall back to document class
  if (document.documentElement.classList.contains("light")) {
    return "light";
  }

  // Default to dark
  return "dark";
}

/**
 * Subscribe to theme changes via storage events and DOM mutations
 */
function subscribeToThemeChanges(callback: () => void): () => void {
  // Listen for storage changes (cross-tab sync)
  const handleStorage = (e: StorageEvent) => {
    if (e.key === "theme") {
      callback();
    }
  };
  window.addEventListener("storage", handleStorage);

  // Listen for class changes on documentElement
  const observer = new MutationObserver((mutations) => {
    for (const mutation of mutations) {
      if (mutation.attributeName === "class") {
        callback();
      }
    }
  });

  observer.observe(document.documentElement, {
    attributes: true,
    attributeFilter: ["class", "data-color-theme"],
  });

  return () => {
    window.removeEventListener("storage", handleStorage);
    observer.disconnect();
  };
}

/**
 * Hook to get the current theme state
 * Automatically updates when theme changes via toggle or cross-tab sync
 */
export function useTheme(): Theme {
  const theme = useSyncExternalStore<Theme>(
    subscribeToThemeChanges,
    getTheme,
    (): Theme => "dark" // Server-side default
  );

  return theme;
}

/**
 * Simple hook for SSR-safe theme detection
 * Returns the theme after mount, defaults to 'dark' during SSR
 */
export function useThemeSimple(): Theme {
  const [theme, setTheme] = useState<Theme>("dark");
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    setTheme(getTheme());

    // Listen for changes
    const unsubscribe = subscribeToThemeChanges(() => {
      setTheme(getTheme());
    });

    return unsubscribe;
  }, []);

  // Return 'dark' during SSR/hydration to avoid mismatch
  if (!mounted) {
    return "dark";
  }

  return theme;
}
