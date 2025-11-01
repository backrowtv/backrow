import type { SupabaseClient } from '@supabase/supabase-js'

/**
 * Detects whether a club uses Structured mode (seasons/festivals) or Casual mode (endless festival).
 * 
 * Logic:
 * - Structured: Club has seasons (uses season → festival structure)
 * - Casual: Club has no seasons (uses endless festival mode)
 * 
 * @param supabase - Supabase client instance
 * @param clubId - The club ID to check
 * @returns Promise resolving to 'structured' or 'casual'
 */
export async function detectClubMode(
  supabase: SupabaseClient,
  clubId: string
): Promise<'structured' | 'casual'> {
  try {
    // Check if club has any seasons
    const { data: seasons, error } = await supabase
      .from('seasons')
      .select('id')
      .eq('club_id', clubId)
      .limit(1)
    
    if (error) {
      // If error querying seasons, default to structured (safer default)
      console.error('Error detecting club mode:', error)
      return 'structured'
    }
    
    // If club has seasons, it's structured mode
    // If club has no seasons, it's casual mode (endless festival)
    return seasons && seasons.length > 0 ? 'structured' : 'casual'
  } catch (error) {
    // On any unexpected error, default to structured
    console.error('Unexpected error detecting club mode:', error)
    return 'structured'
  }
}

