/**
 * Repositories - Unified Database Access Layer
 * 
 * This module provides a repository pattern for database access.
 * 
 * Benefits:
 * - Reusable: Same queries across server actions and components
 * - Type-safe: Full TypeScript support with proper return types
 * - Testable: Easy to mock for unit testing
 * - Consistent: Standardized error handling and logging
 * - DRY: Define queries once, use everywhere
 * 
 * Usage:
 * ```ts
 * import { createClient } from '@/lib/supabase/server'
 * import { clubs } from '@/lib/repositories'
 * 
 * const db = await createClient()
 * const { data, error } = await clubs.getClubBySlug(db, 'my-club')
 * ```
 * 
 * Or with destructured imports:
 * ```ts
 * import { getClubBySlug, getFestivalById } from '@/lib/repositories'
 * ```
 */

// Types
export * from './types'

// Club repository
import * as clubsRepo from './clubs'
export const clubs = clubsRepo
export {
  getClubBySlug,
  getClubById,
  getClubMembers,
  getUserMembership,
  isClubAdmin,
  isClubProducer,
  getUserClubs,
  getUserFavoriteClubs,
  searchClubs,
  getPublicClubs,
} from './clubs'

// Festival repository
import * as festivalsRepo from './festivals'
export const festivals = festivalsRepo
export {
  getFestivalById,
  getFestivalBySlug,
  getFestivalsByClub,
  getActiveFestival,
  getCurrentFestival,
  getFestivalNominations,
  getEndlessNominations,
  searchFestivals,
  getFestivalResults,
  getUserNominationCount,
} from './festivals'

// User repository
import * as usersRepo from './users'
export const users = usersRepo
export {
  getUserById,
  getUserByUsername,
  getUserByEmail,
  searchUsers,
  getUsersByIds,
  isUsernameAvailable,
  getUserMemberships,
  getUserStats,
} from './users'

// Movie repository
import * as moviesRepo from './movies'
export const movies = moviesRepo
export {
  getMovieByTmdbId,
  getMovieBySlug,
  searchMovies,
  getPopularMovies,
  getMoviesByTmdbIds,
  getUserRating,
  getNominationRatings,
  getUserWatchHistory,
  getMovieAverageRating,
  isMovieInWatchlist,
} from './movies'

