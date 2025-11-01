/**
 * Centralized Cache Invalidation Strategy
 *
 * Provides standardized cache invalidation utilities to replace 312+ scattered
 * revalidatePath calls with consistent, maintainable cache management.
 *
 * @example
 * // Before (inconsistent, scattered):
 * revalidatePath(`/club/${slug}`)
 * revalidatePath('/clubs')
 * revalidatePath('/')
 * revalidatePath('/discover')
 *
 * // After (centralized):
 * invalidateClub(slug)
 */

import { revalidatePath, revalidateTag } from 'next/cache'

/**
 * All application paths as a central reference.
 * Use these instead of hardcoding paths throughout the codebase.
 */
export const CachePaths = {
  // Root paths
  home: '/',
  clubs: '/clubs',
  discover: '/discover',
  activity: '/activity',
  profile: '/profile',
  search: '/search',
  calendar: '/calendar',

  // Dynamic paths
  club: (slug: string) => `/club/${slug}`,
  clubSettings: (slug: string) => `/club/${slug}/settings`,
  clubMembers: (slug: string) => `/club/${slug}/members`,
  clubHistory: (slug: string) => `/club/${slug}/history`,
  clubStats: (slug: string) => `/club/${slug}/stats`,
  clubDiscuss: (slug: string) => `/club/${slug}/discuss`,
  clubDisplayCase: (slug: string) => `/club/${slug}/display-case`,

  festival: (clubSlug: string, festivalSlug: string) =>
    `/club/${clubSlug}/festival/${festivalSlug}`,

  season: (clubSlug: string, seasonSlug: string) =>
    `/club/${clubSlug}/season/${seasonSlug}`,

  movie: (id: string | number) => `/movies/${id}`,
  person: (id: string | number) => `/person/${id}`,

  // Profile sub-paths
  profileSettings: '/profile/settings',
  profileDisplayCase: '/profile/display-case',
  profileFutureNominations: '/profile/future-nominations',
} as const

/**
 * Cache tags for fine-grained invalidation.
 * Use with revalidateTag for more precise cache control.
 */
export const CacheTags = {
  // Global
  clubs: 'clubs',
  festivals: 'festivals',
  users: 'users',

  // Per-entity
  club: (id: string) => `club-${id}`,
  festival: (id: string) => `festival-${id}`,
  user: (id: string) => `user-${id}`,
  season: (id: string) => `season-${id}`,

  // Collections
  clubMembers: (clubId: string) => `club-members-${clubId}`,
  clubFestivals: (clubId: string) => `club-festivals-${clubId}`,
  clubSeasons: (clubId: string) => `club-seasons-${clubId}`,
} as const

/**
 * Invalidates all cache related to a club.
 * Call after club creation, update, or deletion.
 *
 * @param slug - The club's URL slug
 * @param options - Additional invalidation options
 */
export function invalidateClub(
  slug: string,
  options?: { includeGlobal?: boolean }
): void {
  const { includeGlobal = true } = options ?? {}

  // Club-specific paths
  revalidatePath(CachePaths.club(slug))
  revalidatePath(CachePaths.clubSettings(slug))
  revalidatePath(CachePaths.clubMembers(slug))
  revalidatePath(CachePaths.clubHistory(slug))
  revalidatePath(CachePaths.clubStats(slug))
  revalidatePath(CachePaths.clubDiscuss(slug))

  // Global paths that list clubs
  if (includeGlobal) {
    revalidatePath(CachePaths.clubs)
    revalidatePath(CachePaths.discover)
    revalidatePath(CachePaths.home)
  }
}

/**
 * Invalidates all cache related to a festival.
 * Call after festival creation, update, phase change, or deletion.
 *
 * @param clubSlug - The club's URL slug
 * @param festivalSlug - The festival's URL slug
 */
export function invalidateFestival(clubSlug: string, festivalSlug: string): void {
  // Festival-specific path
  revalidatePath(CachePaths.festival(clubSlug, festivalSlug))

  // Club page (shows current festival)
  revalidatePath(CachePaths.club(clubSlug))

  // Home (may show festival activity)
  revalidatePath(CachePaths.home)

  // Calendar (shows festival deadlines)
  revalidatePath(CachePaths.calendar)
}

/**
 * Invalidates all cache related to a season.
 * Call after season creation, update, or conclusion.
 *
 * @param clubSlug - The club's URL slug
 * @param seasonSlug - The season's URL slug
 */
export function invalidateSeason(clubSlug: string, seasonSlug: string): void {
  revalidatePath(CachePaths.season(clubSlug, seasonSlug))
  revalidatePath(CachePaths.club(clubSlug))
  revalidatePath(CachePaths.clubHistory(clubSlug))
  revalidatePath(CachePaths.clubStats(clubSlug))
}

/**
 * Invalidates all cache related to club membership changes.
 * Call after join, leave, role change, or member removal.
 *
 * @param clubSlug - The club's URL slug
 */
export function invalidateClubMembership(clubSlug: string): void {
  revalidatePath(CachePaths.club(clubSlug))
  revalidatePath(CachePaths.clubMembers(clubSlug))
  revalidatePath(CachePaths.clubs) // User's club list
  revalidatePath(CachePaths.home)
}

/**
 * Invalidates all cache related to nominations.
 * Call after nomination create, update, or delete.
 *
 * @param clubSlug - The club's URL slug
 * @param festivalSlug - The festival's URL slug
 */
export function invalidateNominations(clubSlug: string, festivalSlug: string): void {
  revalidatePath(CachePaths.festival(clubSlug, festivalSlug))
  revalidatePath(CachePaths.club(clubSlug))
}

/**
 * Invalidates all cache related to ratings.
 * Call after rating create, update, or delete.
 *
 * @param clubSlug - The club's URL slug
 * @param festivalSlug - The festival's URL slug
 */
export function invalidateRatings(clubSlug: string, festivalSlug: string): void {
  revalidatePath(CachePaths.festival(clubSlug, festivalSlug))
  revalidatePath(CachePaths.club(clubSlug))
  revalidatePath(CachePaths.clubStats(clubSlug))
}

/**
 * Invalidates all cache related to discussions.
 * Call after thread or comment create, update, or delete.
 *
 * @param clubSlug - The club's URL slug
 */
export function invalidateDiscussions(clubSlug: string): void {
  revalidatePath(CachePaths.clubDiscuss(clubSlug))
  revalidatePath(CachePaths.club(clubSlug))
  revalidatePath(CachePaths.activity)
}

/**
 * Invalidates all cache related to user profile.
 * Call after profile update, settings change, or stats update.
 *
 * @param options - Specific profile sections to invalidate
 */
export function invalidateProfile(
  options?: { settings?: boolean; displayCase?: boolean; futureNominations?: boolean }
): void {
  revalidatePath(CachePaths.profile)

  if (options?.settings) {
    revalidatePath(CachePaths.profileSettings)
  }
  if (options?.displayCase) {
    revalidatePath(CachePaths.profileDisplayCase)
  }
  if (options?.futureNominations) {
    revalidatePath(CachePaths.profileFutureNominations)
  }
}

/**
 * Invalidates movie-related cache.
 * Call after movie data update or new ratings.
 *
 * @param movieId - The movie's TMDB ID
 */
export function invalidateMovie(movieId: string | number): void {
  revalidatePath(CachePaths.movie(movieId))
  revalidatePath(CachePaths.search)
}

/**
 * Invalidates global activity feed cache.
 * Call after any action that should appear in activity feeds.
 */
export function invalidateActivity(): void {
  revalidatePath(CachePaths.activity)
  revalidatePath(CachePaths.home)
}

/**
 * Invalidates all discoverable content.
 * Call after visibility changes or new public content.
 */
export function invalidateDiscover(): void {
  revalidatePath(CachePaths.discover)
  revalidatePath(CachePaths.home)
}

/**
 * Full cache invalidation for the entire app.
 * Use sparingly - only for admin operations or major data changes.
 */
export function invalidateAll(): void {
  revalidatePath('/', 'layout')
}

/**
 * Invalidates using a cache tag.
 * More efficient than path-based invalidation for specific data.
 *
 * @param tag - The cache tag to invalidate
 * @param cacheKind - The kind of cache ('default' for server cache)
 */
export function invalidateByTag(tag: string, cacheKind: 'default' | 'client' = 'default'): void {
  revalidateTag(tag, cacheKind)
}
