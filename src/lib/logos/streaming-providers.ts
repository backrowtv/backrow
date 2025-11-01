/**
 * Streaming Provider Mapping
 *
 * Maps TMDB provider IDs to our logo registry keys.
 * This allows us to use svgl-react logos for providers where available,
 * with fallback to TMDB CDN for others.
 */

/**
 * TMDB provider ID to logo registry key mapping
 */
export const PROVIDER_TO_LOGO: Record<number, string> = {
  // Major Streaming Services (svgl available)
  8: 'netflix', // Netflix
  337: 'disney-plus', // Disney+
  390: 'disney-plus', // Disney+ (intl)
  15: 'hulu', // Hulu
  9: 'prime-video', // Amazon Prime Video
  10: 'prime-video', // Amazon Video
  119: 'prime-video', // Amazon Prime Video (intl)
  350: 'apple-tv', // Apple TV+
  2: 'apple-tv', // Apple TV
  192: 'youtube', // YouTube
  188: 'youtube', // YouTube Premium

  // Premium Cable/Streaming (CDN fallback)
  384: 'max', // Max
  1899: 'max', // Max (alternate)
  531: 'paramount-plus', // Paramount+
  582: 'paramount-plus', // Paramount+ (intl)
  386: 'peacock', // Peacock
  387: 'peacock', // Peacock Premium
  520: 'discovery-plus', // Discovery+
  37: 'showtime', // Showtime
  1770: 'showtime', // Paramount+ with Showtime
  43: 'starz', // Starz
  34: 'mgm-plus', // MGM+ (formerly Epix)
  526: 'amc-plus', // AMC+

  // Free Streaming (CDN fallback)
  73: 'tubi', // Tubi
  300: 'pluto-tv', // Pluto TV
  538: 'plex', // Plex
  207: 'roku-channel', // Roku Channel
  613: 'freevee', // Freevee (Amazon)

  // Specialty Streaming (CDN fallback)
  283: 'crunchyroll', // Crunchyroll
  258: 'criterion', // Criterion Channel
  11: 'mubi', // MUBI
  99: 'shudder', // Shudder
  191: 'kanopy', // Kanopy
  212: 'hoopla', // Hoopla
  87: 'acorn-tv', // Acorn TV
  151: 'britbox', // BritBox US
  380: 'britbox', // BritBox
  257: 'fubo', // FuboTV
  584: 'philo', // Philo

  // Rent/Buy Platforms (CDN fallback)
  7: 'vudu', // Vudu / Fandango at Home
  3: 'google-play', // Google Play Movies
  68: 'microsoft-store', // Microsoft Store
  279: 'redbox', // Redbox
}

/**
 * Provider name patterns for fallback matching
 * Used when provider ID is not in the mapping
 */
export const PROVIDER_NAME_PATTERNS: Record<string, string> = {
  netflix: 'netflix',
  disney: 'disney-plus',
  hulu: 'hulu',
  amazon: 'prime-video',
  prime: 'prime-video',
  apple: 'apple-tv',
  youtube: 'youtube',
  max: 'max',
  hbo: 'max',
  paramount: 'paramount-plus',
  peacock: 'peacock',
  discovery: 'discovery-plus',
  showtime: 'showtime',
  starz: 'starz',
  mgm: 'mgm-plus',
  epix: 'mgm-plus',
  amc: 'amc-plus',
  tubi: 'tubi',
  pluto: 'pluto-tv',
  plex: 'plex',
  roku: 'roku-channel',
  freevee: 'freevee',
  crunchyroll: 'crunchyroll',
  criterion: 'criterion',
  mubi: 'mubi',
  shudder: 'shudder',
  kanopy: 'kanopy',
  hoopla: 'hoopla',
  acorn: 'acorn-tv',
  britbox: 'britbox',
  fubo: 'fubo',
  philo: 'philo',
  vudu: 'vudu',
  fandango: 'vudu',
  'google play': 'google-play',
  microsoft: 'microsoft-store',
  redbox: 'redbox',
}

/**
 * Get logo registry key for a TMDB provider
 *
 * @param providerId - TMDB provider ID
 * @param providerName - Provider name (fallback for matching)
 * @returns Logo registry key or null if not found
 */
export function getLogoKeyForProvider(
  providerId: number,
  providerName?: string
): string | null {
  // First try direct ID mapping
  const directMatch = PROVIDER_TO_LOGO[providerId]
  if (directMatch) {
    return directMatch
  }

  // If no ID match and we have a name, try pattern matching
  if (providerName) {
    const lowerName = providerName.toLowerCase()
    for (const [pattern, logoKey] of Object.entries(PROVIDER_NAME_PATTERNS)) {
      if (lowerName.includes(pattern)) {
        return logoKey
      }
    }
  }

  return null
}
