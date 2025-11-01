'use server'

import { createClient } from '@/lib/supabase/server'
import { cacheMovie } from '@/app/actions/movies'
import { extractTmdbIdFromLetterboxdUri, matchMovieByTitleAndYear } from './matching'

export interface LetterboxdCsvRow {
  LetterboxdURI?: string
  tmdbID?: string
  imdbID?: string
  Title?: string
  Year?: string
  Rating?: string
  WatchedDate?: string
  [key: string]: string | undefined
}

export interface ImportResult {
  total: number
  imported: number
  skipped: number
  errors: number
  errorMessages: string[]
}

export interface ImportProgress {
  step: 'parsing' | 'matching' | 'importing' | 'complete'
  processed: number
  total: number
  currentMovie?: string
}

/**
 * Convert Letterboxd rating (0.5-5.0 stars) to BackRow rating (0.1-10.0)
 */
function convertRating(letterboxdRating: string | undefined): number | null {
  if (!letterboxdRating || letterboxdRating.trim() === '') {
    return null
  }

  const rating = parseFloat(letterboxdRating.trim())
  if (isNaN(rating) || rating < 0.5 || rating > 5.0) {
    return null
  }

  // Convert: 0.5-5.0 → 1.0-10.0
  const backrowRating = rating * 2
  
  // Round to one decimal place
  return Math.round(backrowRating * 10) / 10
}

/**
 * Parse watch date from CSV
 * Letterboxd dates are typically in YYYY-MM-DD format
 */
function parseWatchDate(dateStr: string | undefined): string | null {
  if (!dateStr || dateStr.trim() === '') {
    return null
  }

  try {
    const date = new Date(dateStr.trim())
    if (isNaN(date.getTime())) {
      return null
    }
    return date.toISOString()
  } catch {
    return null
  }
}

/**
 * Process a single Letterboxd CSV row
 */
async function processRow(
  row: LetterboxdCsvRow,
  userId: string
): Promise<{ success: boolean; tmdbId: number | null; error?: string }> {
  const supabase = await createClient()
  // Extract TMDB ID
  let tmdbId: number | null = null

  // Try tmdbID column first
  if (row.tmdbID && row.tmdbID.trim() !== '') {
    const id = parseInt(row.tmdbID.trim(), 10)
    if (!isNaN(id) && id > 0) {
      tmdbId = id
    }
  }

  // Try extracting from URI if not found
  if (!tmdbId && row.LetterboxdURI) {
    tmdbId = await extractTmdbIdFromLetterboxdUri(row.LetterboxdURI)
  }

  // Try matching by title and year if still no ID
  if (!tmdbId && row.Title) {
    tmdbId = await matchMovieByTitleAndYear(row.Title, row.Year || null)
  }

  if (!tmdbId) {
    return {
      success: false,
      tmdbId: null,
      error: `Could not match movie: ${row.Title || 'Unknown'} (${row.Year || 'Unknown Year'})`,
    }
  }

  // Cache movie if needed
  const cacheResult = await cacheMovie(tmdbId)
  if (cacheResult.error) {
    return {
      success: false,
      tmdbId,
      error: `Failed to cache movie: ${cacheResult.error}`,
    }
  }

  // Check if watch_history entry already exists
  const { data: existingHistory } = await supabase
    .from('watch_history')
    .select('id, first_watched_at')
    .eq('user_id', userId)
    .eq('tmdb_id', tmdbId)
    .maybeSingle()

  const watchDate = parseWatchDate(row.WatchedDate)
  const contexts = {
    source: 'letterboxd_import',
    imported_at: new Date().toISOString(),
  }

  if (!existingHistory) {
    // Create watch_history entry if it doesn't exist
    const { error: historyError } = await supabase.from('watch_history').insert({
      user_id: userId,
      tmdb_id: tmdbId,
      first_watched_at: watchDate || new Date().toISOString(),
      contexts,
      updated_at: new Date().toISOString(),
    })

    if (historyError) {
      return {
        success: false,
        tmdbId,
        error: `Failed to create watch history: ${historyError.message}`,
      }
    }

    // Check badges after adding to watch history
    try {
      const { checkRelevantBadges } = await import('@/app/actions/badges')
      await checkRelevantBadges(userId, 'movie_watched')
    } catch (badgeError) {
      // Don't fail import if badge check fails
      console.error('Error checking badges:', badgeError)
    }
  } else if (watchDate && existingHistory.first_watched_at) {
    // Update if this watch date is earlier than the existing one
    const existingDate = new Date(existingHistory.first_watched_at)
    const newDate = new Date(watchDate)
    
    if (newDate < existingDate) {
      const { error: historyError } = await supabase
        .from('watch_history')
        .update({
          first_watched_at: watchDate,
          updated_at: new Date().toISOString(),
        })
        .eq('id', existingHistory.id)

      if (historyError) {
        // Don't fail the import if update fails
        console.error('Failed to update watch history date:', historyError)
      }
    }
  }

  // Create generic_rating entry if rating exists
  const rating = convertRating(row.Rating)
  if (rating !== null) {
    const { error: ratingError } = await supabase
      .from('generic_ratings')
      .upsert(
        {
          user_id: userId,
          tmdb_id: tmdbId,
          rating,
          updated_at: new Date().toISOString(),
        },
        {
          onConflict: 'user_id,tmdb_id',
        }
      )

    if (ratingError) {
      // Don't fail the whole import if rating fails
      console.error('Failed to create rating:', ratingError)
    }
  }

  return { success: true, tmdbId }
}

/**
 * Process Letterboxd import in batches
 */
export async function processLetterboxdImport(
  rows: LetterboxdCsvRow[],
  userId: string
): Promise<ImportResult> {
  const result: ImportResult = {
    total: rows.length,
    imported: 0,
    skipped: 0,
    errors: 0,
    errorMessages: [],
  }

  // Process in batches of 50
  const BATCH_SIZE = 50
  for (let i = 0; i < rows.length; i += BATCH_SIZE) {
    const batch = rows.slice(i, i + BATCH_SIZE)
    
    for (const row of batch) {
      try {
        const processResult = await processRow(row, userId)
        
        if (processResult.success) {
          result.imported++
        } else {
          result.errors++
          if (processResult.error) {
            result.errorMessages.push(processResult.error)
          }
        }
      } catch (error) {
        result.errors++
        const errorMessage = error instanceof Error ? error.message : 'Unknown error'
        result.errorMessages.push(`Error processing ${row.Title || 'Unknown'}: ${errorMessage}`)
      }
    }
  }

  return result
}

