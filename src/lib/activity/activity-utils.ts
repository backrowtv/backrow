import { Database } from '@/types/database'

type ActivityLog = Database['public']['Tables']['activity_log']['Row']

/**
 * Extracts tmdb_id from activity log details.
 * Handles different detail structures.
 * Pure utility function - safe for Client Components.
 */
export function getTmdbIdFromActivity(activity: ActivityLog): number | null | undefined {
  const details = activity.details as Record<string, unknown> | null
  if (!details) return null

  // Try different possible field names
  return (details.tmdb_id as number | undefined) ||
         (details.movie_tmdb_id as number | undefined) ||
         null
}

