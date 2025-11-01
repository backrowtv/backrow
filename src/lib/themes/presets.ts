export interface ThemePreset {
  id: string;
  name: string;
  /** Whether this theme supports light mode, dark mode, or both */
  variants: ("light" | "dark")[];
  /** Preview colors: [background, surface, primary, accent, text] */
  previewColors: {
    light?: [string, string, string, string, string];
    dark: [string, string, string, string, string];
  };
}

export const THEME_PRESETS: ThemePreset[] = [
  {
    id: "default",
    name: "Sage",
    variants: ["light", "dark"],
    previewColors: {
      light: ["#f0f0ec", "#edede9", "#5a9a72", "#5a87b0", "#171717"],
      dark: ["#1c1a19", "#211f1e", "#5a9a72", "#5a87b0", "#f2f2f2"],
    },
  },
  {
    id: "solarized",
    name: "Solarized",
    variants: ["light", "dark"],
    previewColors: {
      light: ["#fdf6e3", "#eee8d5", "#2aa198", "#268bd2", "#657b83"],
      dark: ["#002b36", "#073642", "#2aa198", "#268bd2", "#839496"],
    },
  },
  {
    id: "nord",
    name: "Nord",
    variants: ["light", "dark"],
    previewColors: {
      light: ["#eceff4", "#e5e9f0", "#5e81ac", "#88c0d0", "#2e3440"],
      dark: ["#2e3440", "#3b4252", "#81a1c1", "#88c0d0", "#eceff4"],
    },
  },
  {
    id: "rose-pine",
    name: "Rosé Pine",
    variants: ["light", "dark"],
    previewColors: {
      light: ["#faf4ed", "#fffaf3", "#907aa9", "#d7827e", "#575279"],
      dark: ["#232136", "#2a273f", "#c4a7e7", "#ea9a97", "#e0def4"],
    },
  },
  {
    id: "gruvbox",
    name: "Gruvbox",
    variants: ["light", "dark"],
    previewColors: {
      light: ["#fbf1c7", "#ebdbb2", "#b57614", "#076678", "#3c3836"],
      dark: ["#282828", "#3c3836", "#d79921", "#458588", "#ebdbb2"],
    },
  },
  {
    id: "catppuccin",
    name: "Catppuccin",
    variants: ["dark"],
    previewColors: {
      dark: ["#1e1e2e", "#313244", "#cba6f7", "#f5c2e7", "#cdd6f4"],
    },
  },
  {
    id: "tokyo-night",
    name: "Tokyo Night",
    variants: ["dark"],
    previewColors: {
      dark: ["#1a1b26", "#24283b", "#7aa2f7", "#bb9af7", "#c0caf5"],
    },
  },
  {
    id: "monokai",
    name: "Monokai",
    variants: ["dark"],
    previewColors: {
      dark: ["#272822", "#3e3d32", "#a6e22e", "#f92672", "#f8f8f2"],
    },
  },
  {
    id: "everforest",
    name: "Everforest",
    variants: ["light", "dark"],
    previewColors: {
      light: ["#fdf6e3", "#eae4ca", "#8da101", "#35a77c", "#5c6a72"],
      dark: ["#2d353b", "#3d484d", "#a7c080", "#83c092", "#d3c6aa"],
    },
  },
  {
    id: "pure",
    name: "Pure",
    variants: ["light", "dark"],
    previewColors: {
      light: ["#ffffff", "#f5f5f5", "#111111", "#555555", "#111111"],
      dark: ["#000000", "#111111", "#ffffff", "#888888", "#ffffff"],
    },
  },
];

export const DEFAULT_THEME = "default";

export function getThemePreset(id: string): ThemePreset | undefined {
  return THEME_PRESETS.find((t) => t.id === id);
}

export function isThemeDarkOnly(id: string): boolean {
  const preset = getThemePreset(id);
  return preset ? !preset.variants.includes("light") : false;
}
