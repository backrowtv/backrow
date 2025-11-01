import { SupabaseClient } from '@supabase/supabase-js'

/**
 * Resolve a season by slug or ID within a club
 * Returns the season ID (UUID) regardless of whether slug or ID was provided
 * 
 * @param supabase - Supabase client instance
 * @param clubId - The club ID (must be resolved first)
 * @param identifier - Either a season slug or season ID (UUID)
 * @returns Promise resolving to season ID (UUID) or null if not found
 */
export async function resolveSeason(
  supabase: SupabaseClient,
  clubId: string,
  identifier: string
): Promise<{ id: string; slug: string | null } | null> {
  // Check if identifier is a UUID
  const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(identifier)
  
  if (isUUID) {
    // Try to find by ID (must match club)
    const { data: season } = await supabase
      .from('seasons')
      .select('id, slug')
      .eq('id', identifier)
      .eq('club_id', clubId)
      .maybeSingle()
    
    return season || null
  } else {
    // Try to find by slug (must match club)
    const { data: season } = await supabase
      .from('seasons')
      .select('id, slug')
      .eq('slug', identifier)
      .eq('club_id', clubId)
      .maybeSingle()
    
    return season || null
  }
}

