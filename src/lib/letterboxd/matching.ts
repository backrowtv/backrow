'use server'

import { searchMovies } from '@/lib/tmdb/client'

/**
 * Extract TMDB ID from Letterboxd URI
 * Letterboxd URIs are in format: https://letterboxd.com/film/{slug}/
 * The slug may contain the TMDB ID, but it's not guaranteed
 * We'll try to extract it if it's in a numeric format
 */
export async function extractTmdbIdFromLetterboxdUri(uri: string): Promise<number | null> {
  if (!uri) return null
  
  // Try to extract numeric ID from URI
  // Some Letterboxd URIs might have format: /film/{id}-{slug}/
  const match = uri.match(/\/film\/(\d+)/)
  if (match && match[1]) {
    const id = parseInt(match[1], 10)
    if (!isNaN(id) && id > 0) {
      return id
    }
  }
  
  return null
}

/**
 * Match a movie by title and year using TMDB search
 * Returns the TMDB ID of the best match, or null if no match found
 */
export async function matchMovieByTitleAndYear(
  title: string,
  year: string | null
): Promise<number | null> {
  if (!title || title.trim().length === 0) {
    return null
  }

  try {
    // Search TMDB for the movie
    const results = await searchMovies(title.trim())
    
    if (!results || results.length === 0) {
      return null
    }

    // If year is provided, try to match by year
    if (year) {
      const yearNum = parseInt(year, 10)
      if (!isNaN(yearNum)) {
        // Find exact year match first
        const exactMatch = results.find((movie) => {
          if (!movie.release_date) return false
          const movieYear = new Date(movie.release_date).getFullYear()
          return movieYear === yearNum
        })
        
        if (exactMatch) {
          return exactMatch.id
        }
        
        // If no exact match, find closest year (within 1 year)
        const closeMatch = results.find((movie) => {
          if (!movie.release_date) return false
          const movieYear = new Date(movie.release_date).getFullYear()
          return Math.abs(movieYear - yearNum) <= 1
        })
        
        if (closeMatch) {
          return closeMatch.id
        }
      }
    }

    // If no year match or no year provided, return the first result
    // (TMDB search results are ordered by relevance)
    return results[0]?.id || null
  } catch (error) {
    console.error('Error matching movie by title and year:', error)
    return null
  }
}

