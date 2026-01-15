'use server'

import { createClient } from '@/lib/supabase/server'
import { getPersonDetails } from '@/lib/tmdb/client'
import { generatePersonSlug } from '@/lib/persons/slugs'

export async function cachePerson(tmdbId: number) {
  const supabase = await createClient()
  
  // Check if person already cached
  const { data: existingPerson } = await supabase
    .from('persons')
    .select('*')
    .eq('tmdb_id', tmdbId)
    .maybeSingle()
  
  // If cached recently (within 7 days), return it
  if (existingPerson) {
    const cachedAt = new Date(existingPerson.cached_at || 0)
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
    
    if (cachedAt > sevenDaysAgo) {
      return { success: true, person: existingPerson }
    }
  }
  
  // Fetch from TMDB
  try {
    const tmdbPerson = await getPersonDetails(tmdbId)
    
    // Generate slug
    const slug = generatePersonSlug(tmdbPerson.name, tmdbPerson.birthday)
    
    const personData = {
      tmdb_id: tmdbId,
      name: tmdbPerson.name,
      slug,
      birthday: tmdbPerson.birthday,
      deathday: tmdbPerson.deathday,
      place_of_birth: tmdbPerson.place_of_birth,
      profile_url: tmdbPerson.profile_path 
        ? `https://image.tmdb.org/t/p/w500${tmdbPerson.profile_path}` 
        : null,
      known_for_department: tmdbPerson.known_for_department,
      biography: tmdbPerson.biography,
      cached_at: new Date().toISOString(),
    }
    
    // Upsert person
    const { data: person, error } = await supabase
      .from('persons')
      .upsert(personData, {
        onConflict: 'tmdb_id',
      })
      .select()
      .single()
    
    if (error) {
      // If slug conflict, try with TMDB ID suffix
      if (error.code === '23505' && error.message.includes('slug')) {
        const uniqueSlug = `${slug}-${tmdbId}`
        const { data: retryPerson, error: retryError } = await supabase
          .from('persons')
          .upsert({ ...personData, slug: uniqueSlug }, {
            onConflict: 'tmdb_id',
          })
          .select()
          .single()
        
        if (retryError) {
          return { error: retryError.message }
        }
        return { success: true, person: retryPerson }
      }
      return { error: error.message }
    }
    
    return { success: true, person }
  } catch (error) {
    return {
      error:
        error instanceof Error
          ? error.message
          : 'Failed to fetch person from TMDB',
    }
  }
}

export async function getPerson(tmdbId: number) {
  const supabase = await createClient()
  
  const { data: person, error: personError } = await supabase
    .from('persons')
    .select('*')
    .eq('tmdb_id', tmdbId)
    .maybeSingle()
  
  if (personError) {
    return { error: personError.message }
  }
  
  if (!person) {
    // Try to cache it
    const result = await cachePerson(tmdbId)
    if (result.error) {
      return { error: result.error }
    }
    return { person: result.person }
  }
  
  return { person }
}

export async function getPersonBySlug(slug: string) {
  const supabase = await createClient()
  
  const { data: person, error: personError } = await supabase
    .from('persons')
    .select('*')
    .eq('slug', slug)
    .maybeSingle()
  
  if (personError) {
    return { error: personError.message }
  }
  
  if (!person) {
    return { error: 'Person not found' }
  }
  
  return { person }
}

// Get slug for a person (caches if not already cached)
export async function getPersonSlug(tmdbId: number): Promise<string | null> {
  const result = await getPerson(tmdbId)
  if (result.error || !result.person) {
    return null
  }
  return result.person.slug
}

