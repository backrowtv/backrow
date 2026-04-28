"use client";

import { useEffect, useState, useCallback, startTransition } from "react";
import { Button } from "./button";
import { Sun, Moon } from "@phosphor-icons/react";
import {
  getThemeState,
  setLightDark,
  setColorTheme as storeSetColorTheme,
  setOverrideTheme as storeSetOverrideTheme,
  subscribe,
} from "@/lib/themes/theme-store";

// Hook to manage theme state - can be used by multiple components
export function useTheme() {
  const [state, setState] = useState(() => getThemeState());
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    startTransition(() => {
      setMounted(true);
      setState(getThemeState());
    });

    return subscribe(() => {
      setState(getThemeState());
    });
  }, []);

  const toggleTheme = useCallback(() => {
    setLightDark(state.theme === "dark" ? "light" : "dark");
  }, [state.theme]);

  const setColorTheme = useCallback((id: string) => {
    storeSetColorTheme(id);
  }, []);

  const setOverrideTheme = useCallback((override: "light" | "dark" | null) => {
    storeSetOverrideTheme(override);
  }, []);

  return {
    theme: state.theme,
    colorTheme: state.colorTheme,
    toggleTheme,
    setColorTheme,
    setOverrideTheme,
    mounted,
  };
}

// Menu item version of theme toggle for use in dropdown menus.
// This is only ever rendered inside an opened Radix DropdownMenuContent — never
// during SSR — so we don't need a mounted gate. The useState initializer below
// synchronously reads the real theme from localStorage via getThemeState(),
// avoiding a one-frame "Theme" placeholder flash when the menu opens.
export function ThemeMenuItem({ onClick }: { onClick?: () => void }) {
  const { theme, toggleTheme } = useTheme();

  const handleClick = () => {
    toggleTheme();
    onClick?.();
  };

  return (
    <button
      onClick={handleClick}
      className="flex items-center gap-2 w-full px-2 py-1.5 text-sm rounded-sm hover:bg-[var(--surface-2)] transition-colors cursor-pointer text-left"
    >
      {theme === "dark" ? (
        <Sun className="h-4 w-4" weight="regular" />
      ) : (
        <Moon className="h-4 w-4" weight="regular" />
      )}
      <span>{theme === "dark" ? "Light mode" : "Dark mode"}</span>
    </button>
  );
}

export function ThemeToggle() {
  const { theme, toggleTheme, mounted } = useTheme();

  if (!mounted) {
    return (
      <Button variant="ghost" size="sm" className="w-10 h-10 p-0 rounded-full">
        <div className="w-5 h-5" />
      </Button>
    );
  }

  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={toggleTheme}
      className="w-10 h-10 p-0 relative overflow-hidden rounded-full"
      aria-label="Toggle theme"
    >
      <div className="relative w-5 h-5">
        {/* Sun icon */}
        <svg
          className={`absolute inset-0 w-5 h-5 transition-all duration-300 text-[var(--text-primary)] ${
            theme === "dark" ? "rotate-0 opacity-100" : "rotate-90 opacity-0"
          }`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z"
          />
        </svg>
        {/* Moon icon */}
        <svg
          className={`absolute inset-0 w-5 h-5 transition-all duration-300 text-[var(--text-primary)] ${
            theme === "light" ? "rotate-0 opacity-100" : "-rotate-90 opacity-0"
          }`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z"
          />
        </svg>
      </div>
    </Button>
  );
}
