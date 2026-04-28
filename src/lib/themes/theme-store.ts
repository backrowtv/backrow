import { isThemeDarkOnly } from "./presets";

type ThemeMode = "light" | "dark";

interface ThemeState {
  theme: ThemeMode;
  colorTheme: string;
  overrideTheme: ThemeMode | null;
}

const THEME_CHANGE_EVENT = "theme-state-change";

// Module-level state (singleton)
const state: ThemeState = {
  theme: "dark",
  colorTheme: "default",
  overrideTheme: null,
};

let initialized = false;
let dbSyncTimer: ReturnType<typeof setTimeout> | null = null;

function hasSupabaseAuthCookie(): boolean {
  if (typeof document === "undefined") return false;
  return /(?:^|;)\s*sb-[^=]*-auth-token/.test(document.cookie);
}

function init() {
  if (initialized || typeof window === "undefined") return;
  initialized = true;

  // Unauthenticated visitors always get dark mode, ignoring any leftover
  // localStorage from a previous authenticated session. Mirrors the inline
  // theme-init script in src/app/layout.tsx so the SSR class never flips.
  const authed = hasSupabaseAuthCookie();
  if (!authed) {
    state.theme = "dark";
    state.colorTheme = "default";
  } else {
    const stored = localStorage.getItem("theme") as ThemeMode | null;
    const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
    state.theme = stored || (prefersDark ? "dark" : "light");
    state.colorTheme = localStorage.getItem("colorTheme") || "default";
  }

  applyThemeToDOM(state.theme);
  applyColorThemeToDOM(state.colorTheme);

  // Cross-tab sync
  window.addEventListener("storage", (e) => {
    if (e.key === "theme") {
      state.theme = (e.newValue as ThemeMode) || "dark";
      applyThemeToDOM(state.overrideTheme ?? state.theme);
      notify();
    }
    if (e.key === "colorTheme") {
      state.colorTheme = e.newValue || "default";
      applyColorThemeToDOM(state.colorTheme);
      notify();
    }
  });
}

function applyThemeToDOM(mode: ThemeMode) {
  const root = document.documentElement;
  root.classList.remove("light", "dark");
  root.classList.add(mode);
  root.style.colorScheme = mode;

  // Smooth transition
  root.style.transition =
    "background-color var(--duration-normal) var(--easing-default), color var(--duration-normal) var(--easing-default)";

  // Update meta theme-color tags
  const themeColor = mode === "dark" ? "#0a0a0a" : "#f9f9f8";
  document.querySelectorAll('meta[name="theme-color"]').forEach((meta) => {
    meta.setAttribute("content", themeColor);
    meta.removeAttribute("media");
  });
}

function applyColorThemeToDOM(id: string) {
  const root = document.documentElement;
  if (id === "default") {
    root.removeAttribute("data-color-theme");
  } else {
    root.setAttribute("data-color-theme", id);
  }
}

function notify() {
  document.dispatchEvent(new CustomEvent(THEME_CHANGE_EVENT));
}

/**
 * Debounced sync to database — fires 500ms after the last change
 * so rapid toggles don't spam the server.
 */
function syncToDb() {
  if (dbSyncTimer) clearTimeout(dbSyncTimer);
  dbSyncTimer = setTimeout(async () => {
    try {
      const { updateThemePreferences } = await import("@/app/actions/display-preferences");
      await updateThemePreferences({
        theme: state.theme,
        colorTheme: state.colorTheme,
      });
    } catch {
      // Silent fail — localStorage still has the value
    }
  }, 500);
}

// --- Public API ---

export function getThemeState(): ThemeState {
  init();
  return { ...state };
}

export function setLightDark(mode: ThemeMode) {
  init();
  state.theme = mode;
  localStorage.setItem("theme", mode);

  // If switching to light and current colorTheme is dark-only, revert
  if (mode === "light" && isThemeDarkOnly(state.colorTheme)) {
    state.colorTheme = "default";
    localStorage.setItem("colorTheme", "default");
    applyColorThemeToDOM("default");
  }

  applyThemeToDOM(state.overrideTheme ?? mode);
  notify();
  syncToDb();
}

export function setColorTheme(id: string) {
  init();
  state.colorTheme = id;
  localStorage.setItem("colorTheme", id);
  applyColorThemeToDOM(id);

  // If selecting a dark-only theme while in light mode, switch to dark
  if (isThemeDarkOnly(id) && state.theme === "light") {
    state.theme = "dark";
    localStorage.setItem("theme", "dark");
    applyThemeToDOM(state.overrideTheme ?? "dark");
  }

  notify();
  syncToDb();
}

export function setOverrideTheme(override: ThemeMode | null) {
  init();
  state.overrideTheme = override;
  applyThemeToDOM(override ?? state.theme);
  notify();
}

/**
 * Initialize theme from server-fetched DB preferences.
 * Called once on mount when DB prefs are available.
 * Only applies if localStorage doesn't already have a value
 * (localStorage takes precedence for instant load, DB syncs it cross-device).
 */
export function initFromDbPreferences(theme: ThemeMode, colorTheme: string) {
  if (typeof window === "undefined") return;
  init();

  // If localStorage has no stored theme, use DB value
  const storedTheme = localStorage.getItem("theme");
  const storedColor = localStorage.getItem("colorTheme");

  if (!storedTheme) {
    state.theme = theme;
    localStorage.setItem("theme", theme);
    applyThemeToDOM(state.overrideTheme ?? theme);
  }

  if (!storedColor) {
    state.colorTheme = colorTheme;
    localStorage.setItem("colorTheme", colorTheme);
    applyColorThemeToDOM(colorTheme);
  }

  // If localStorage values differ from DB, update localStorage to match DB
  // This is the cross-device sync: DB is the source of truth
  if (storedTheme && storedTheme !== theme) {
    state.theme = theme;
    localStorage.setItem("theme", theme);
    applyThemeToDOM(state.overrideTheme ?? theme);
    notify();
  }

  if (storedColor && storedColor !== colorTheme) {
    state.colorTheme = colorTheme;
    localStorage.setItem("colorTheme", colorTheme);
    applyColorThemeToDOM(colorTheme);
    notify();
  }
}

export function subscribe(callback: () => void): () => void {
  document.addEventListener(THEME_CHANGE_EVENT, callback);
  return () => document.removeEventListener(THEME_CHANGE_EVENT, callback);
}
