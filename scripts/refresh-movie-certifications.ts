/**
 * Script to refresh all movies in the database to populate certification data
 * Run with: npx tsx scripts/refresh-movie-certifications.ts
 */

import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!
const tmdbApiKey = process.env.TMDB_API_KEY!

if (!supabaseUrl || !supabaseServiceKey || !tmdbApiKey) {
  console.error('Missing required environment variables:')
  console.error('- NEXT_PUBLIC_SUPABASE_URL')
  console.error('- SUPABASE_SERVICE_ROLE_KEY')
  console.error('- TMDB_API_KEY')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey)

interface TMDBReleaseDates {
  results: Array<{
    iso_3166_1: string
    release_dates: Array<{
      certification: string
      type: number
    }>
  }>
}

function extractUSCertification(releaseDates: TMDBReleaseDates | undefined): string | null {
  if (!releaseDates?.results) return null

  const usRelease = releaseDates.results.find(r => r.iso_3166_1 === 'US')
  if (!usRelease?.release_dates) return null

  // Prefer theatrical releases (type 3)
  const theatrical = usRelease.release_dates.find(rd => rd.type === 3 && rd.certification)
  if (theatrical?.certification) return theatrical.certification

  // Fallback to any release with certification
  const anyWithCert = usRelease.release_dates.find(rd => rd.certification)
  return anyWithCert?.certification || null
}

async function fetchCertification(tmdbId: number): Promise<string | null> {
  try {
    const response = await fetch(
      `https://api.themoviedb.org/3/movie/${tmdbId}?api_key=${tmdbApiKey}&append_to_response=release_dates`
    )

    if (!response.ok) {
      console.error(`  TMDB API error for ${tmdbId}: ${response.statusText}`)
      return null
    }

    const data = await response.json()
    return extractUSCertification(data.release_dates)
  } catch (error) {
    console.error(`  Error fetching ${tmdbId}:`, error)
    return null
  }
}

async function main() {
  console.log('Fetching movies without certification...\n')

  // Get all movies that don't have certification
  const { data: movies, error } = await supabase
    .from('movies')
    .select('tmdb_id, title')
    .is('certification', null)
    .order('cached_at', { ascending: false })

  if (error) {
    console.error('Error fetching movies:', error)
    process.exit(1)
  }

  console.log(`Found ${movies.length} movies without certification\n`)

  if (movies.length === 0) {
    console.log('All movies already have certification data!')
    return
  }

  let updated = 0
  let failed = 0
  let noCert = 0

  for (let i = 0; i < movies.length; i++) {
    const movie = movies[i]
    process.stdout.write(`[${i + 1}/${movies.length}] ${movie.title}... `)

    const certification = await fetchCertification(movie.tmdb_id)

    if (certification) {
      const { error: updateError } = await supabase
        .from('movies')
        .update({ certification })
        .eq('tmdb_id', movie.tmdb_id)

      if (updateError) {
        console.log(`FAILED (${updateError.message})`)
        failed++
      } else {
        console.log(certification)
        updated++
      }
    } else {
      console.log('(no US certification)')
      noCert++
    }

    // Rate limit: TMDB allows ~40 requests per 10 seconds
    if ((i + 1) % 35 === 0) {
      console.log('\n  Pausing for rate limit...\n')
      await new Promise(resolve => setTimeout(resolve, 10000))
    }
  }

  console.log('\n--- Summary ---')
  console.log(`Updated: ${updated}`)
  console.log(`No US certification: ${noCert}`)
  console.log(`Failed: ${failed}`)
}

main().catch(console.error)
