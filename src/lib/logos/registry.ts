/**
 * Logo Registry
 *
 * Central configuration for all brand logos used in the app.
 * Defines svgl-react component names and CDN fallback URLs.
 */

export interface LogoConfig {
  /**
   * svgl-react component name (exact match to export)
   * Set to null if svgl doesn't have this logo
   */
  svgl: string | null;

  /**
   * Light variant component name (for dark backgrounds)
   * Only applicable if svgl has theme variants
   */
  svglLight?: string;

  /**
   * Dark variant component name (for light backgrounds)
   * Only applicable if svgl has theme variants
   */
  svglDark?: string;

  /**
   * Fallback CDN URL if svgl component is unavailable
   */
  fallback: string | null;

  /**
   * Width/height aspect ratio (width = size * aspectRatio)
   * Default is 1 (square)
   */
  aspectRatio?: number;

  /**
   * Human-readable name for accessibility
   */
  name: string;
}

export const LOGO_REGISTRY: Record<string, LogoConfig> = {
  // ============================================
  // Movie Database Services
  // ============================================
  imdb: {
    svgl: null,
    fallback: "https://upload.wikimedia.org/wikipedia/commons/6/69/IMDB_Logo_2016.svg",
    aspectRatio: 2,
    name: "IMDb",
  },
  letterboxd: {
    svgl: null,
    fallback: "https://a.ltrbxd.com/logos/letterboxd-decal-dots-neg-rgb.svg",
    aspectRatio: 1,
    name: "Letterboxd",
  },
  tmdb: {
    svgl: null,
    fallback:
      "https://www.themoviedb.org/assets/2/v4/logos/v2/blue_square_2-d537fb228cf3ded904ef09b136fe3fec72548ebc1fea3fbbd1ad9e36364db38b.svg",
    aspectRatio: 1.2,
    name: "TMDB",
  },
  trakt: {
    svgl: null,
    fallback:
      "https://trakt.tv/assets/logos/logomark.square.gradient-b644b16c38ff775861b4b1f58c1230f6a097a2466ab33ae00445a505c33fcb91.svg",
    aspectRatio: 1,
    name: "Trakt",
  },
  wikipedia: {
    svgl: null, // svgl has MediaWiki, not Wikipedia
    fallback: "https://upload.wikimedia.org/wikipedia/commons/8/80/Wikipedia-logo-v2.svg",
    aspectRatio: 1,
    name: "Wikipedia",
  },

  // ============================================
  // Social Media Platforms
  // ============================================
  twitter: {
    svgl: "Twitter",
    fallback: "https://abs.twimg.com/responsive-web/client-web/icon-svg.168b89d5.svg",
    aspectRatio: 1,
    name: "X",
  },
  instagram: {
    svgl: "Instagram",
    fallback: "https://upload.wikimedia.org/wikipedia/commons/a/a5/Instagram_icon.png",
    aspectRatio: 1,
    name: "Instagram",
  },
  reddit: {
    svgl: "Reddit",
    fallback: "https://www.redditstatic.com/desktop2x/img/favicon/android-icon-192x192.png",
    aspectRatio: 1,
    name: "Reddit",
  },
  discord: {
    svgl: "Discord",
    fallback: "https://discord.com/assets/847541504914fd33810e70a0ea73177e.ico",
    aspectRatio: 1,
    name: "Discord",
  },
  tiktok: {
    svgl: "TikTokDark", // TikTok naming is by MODE: "Dark" = white logo FOR dark mode
    svglLight: "TikTokDark", // White logo for dark backgrounds
    svglDark: "TikTokLight", // Dark logo for light backgrounds
    fallback: "https://upload.wikimedia.org/wikipedia/en/a/a9/TikTok_logo.svg",
    aspectRatio: 1,
    name: "TikTok",
  },

  // ============================================
  // Major Streaming Platforms (svgl available)
  // ============================================
  netflix: {
    svgl: "Netflix",
    fallback: null,
    aspectRatio: 1,
    name: "Netflix",
  },
  "disney-plus": {
    svgl: "DisneyPlus",
    fallback: null,
    aspectRatio: 1,
    name: "Disney+",
  },
  hulu: {
    svgl: "HuluLight", // Use light variant for dark backgrounds (default)
    svglLight: "HuluLight",
    svglDark: "HuluDark",
    fallback: null,
    aspectRatio: 1,
    name: "Hulu",
  },
  "prime-video": {
    svgl: "PrimeVideo",
    fallback: null,
    aspectRatio: 1,
    name: "Prime Video",
  },
  "apple-tv": {
    svgl: "AppleLight", // Use light variant for dark backgrounds
    svglLight: "AppleLight",
    svglDark: "AppleDark",
    fallback: null,
    aspectRatio: 1,
    name: "Apple TV+",
  },
  youtube: {
    svgl: "YouTube",
    fallback: null,
    aspectRatio: 1,
    name: "YouTube",
  },
  spotify: {
    svgl: "Spotify",
    fallback: null,
    aspectRatio: 1,
    name: "Spotify",
  },
  twitch: {
    svgl: "Twitch",
    fallback: null,
    aspectRatio: 1,
    name: "Twitch",
  },

  // ============================================
  // Streaming Platforms (CDN fallback only)
  // These use TMDB's logo CDN as fallback
  // ============================================
  max: {
    svgl: null,
    fallback: null, // Will use TMDB CDN
    aspectRatio: 1,
    name: "Max",
  },
  peacock: {
    svgl: null,
    fallback: null,
    aspectRatio: 1,
    name: "Peacock",
  },
  "paramount-plus": {
    svgl: null,
    fallback: null,
    aspectRatio: 1,
    name: "Paramount+",
  },
  "discovery-plus": {
    svgl: null,
    fallback: null,
    aspectRatio: 1,
    name: "Discovery+",
  },
  tubi: {
    svgl: null,
    fallback: null,
    aspectRatio: 1,
    name: "Tubi",
  },
  "pluto-tv": {
    svgl: null,
    fallback: null,
    aspectRatio: 1,
    name: "Pluto TV",
  },
  plex: {
    svgl: null,
    fallback: null,
    aspectRatio: 1,
    name: "Plex",
  },
  "roku-channel": {
    svgl: null,
    fallback: null,
    aspectRatio: 1,
    name: "The Roku Channel",
  },
  crunchyroll: {
    svgl: null,
    fallback: null,
    aspectRatio: 1,
    name: "Crunchyroll",
  },
  showtime: {
    svgl: null,
    fallback: null,
    aspectRatio: 1,
    name: "Showtime",
  },
  starz: {
    svgl: null,
    fallback: null,
    aspectRatio: 1,
    name: "Starz",
  },
  "mgm-plus": {
    svgl: null,
    fallback: null,
    aspectRatio: 1,
    name: "MGM+",
  },
  "amc-plus": {
    svgl: null,
    fallback: null,
    aspectRatio: 1,
    name: "AMC+",
  },
  criterion: {
    svgl: null,
    fallback: null,
    aspectRatio: 1,
    name: "Criterion Channel",
  },
  mubi: {
    svgl: null,
    fallback: null,
    aspectRatio: 1,
    name: "MUBI",
  },
  shudder: {
    svgl: null,
    fallback: null,
    aspectRatio: 1,
    name: "Shudder",
  },
  kanopy: {
    svgl: null,
    fallback: null,
    aspectRatio: 1,
    name: "Kanopy",
  },
  hoopla: {
    svgl: null,
    fallback: null,
    aspectRatio: 1,
    name: "Hoopla",
  },
  "acorn-tv": {
    svgl: null,
    fallback: null,
    aspectRatio: 1,
    name: "Acorn TV",
  },
  britbox: {
    svgl: null,
    fallback: null,
    aspectRatio: 1,
    name: "BritBox",
  },
  fubo: {
    svgl: null,
    fallback: null,
    aspectRatio: 1,
    name: "Fubo",
  },
  philo: {
    svgl: null,
    fallback: null,
    aspectRatio: 1,
    name: "Philo",
  },
  freevee: {
    svgl: null,
    fallback: null,
    aspectRatio: 1,
    name: "Freevee",
  },
  vudu: {
    svgl: null,
    fallback: null,
    aspectRatio: 1,
    name: "Vudu",
  },
  "google-play": {
    svgl: null, // svgl has GooglePlayStore but it's the store icon, not movies
    fallback: null,
    aspectRatio: 1,
    name: "Google Play Movies",
  },
  "microsoft-store": {
    svgl: null,
    fallback: null,
    aspectRatio: 1,
    name: "Microsoft Store",
  },
  redbox: {
    svgl: null,
    fallback: null,
    aspectRatio: 1,
    name: "Redbox",
  },
};

/**
 * Get logo configuration by key
 */
export function getLogoConfig(key: string): LogoConfig | null {
  return LOGO_REGISTRY[key] || null;
}

/**
 * Get the appropriate svgl component name based on theme
 */
export function getSvglComponentName(config: LogoConfig, theme: "light" | "dark"): string | null {
  if (!config.svgl) return null;

  // If theme variants exist, use the appropriate one
  // Note: svglLight is for dark backgrounds, svglDark is for light backgrounds
  if (theme === "dark" && config.svglLight) {
    return config.svglLight;
  }
  if (theme === "light" && config.svglDark) {
    return config.svglDark;
  }

  // Fall back to default
  return config.svgl;
}
