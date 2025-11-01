'use server'

import { createClient } from '@/lib/supabase/server'
import type { FestivalResults } from '@/types/festival-results'

/**
 * Migrate existing festival_results JSONB data to normalized festival_standings table
 * This function reads all existing festival_results and populates the festival_standings table
 */
export async function migrateFestivalResults() {
  const supabase = await createClient()
  
  // Get all festival results that are final
  const { data: results, error } = await supabase
    .from('festival_results')
    .select('festival_id, results')
    .eq('is_final', true)
  
  if (error) {
    console.error('Error fetching festival results:', error)
    return { error: error.message }
  }
  
  if (!results || results.length === 0) {
    return { success: true, message: 'No festival results to migrate' }
  }
  
  let migrated = 0
  let errors = 0
  
  // Process each result
  for (const result of results) {
    try {
      const resultsData = result.results as FestivalResults | null
      
      if (!resultsData?.standings || !Array.isArray(resultsData.standings)) {
        continue
      }
      
      // Transform standings to normalized format
      const standings = resultsData.standings.map((entry, index) => {
        // Find guessing data for this user (handle both camelCase and snake_case)
        const guesserData = resultsData.guesses?.guessers?.find(
          (g: { user_id?: string; userId?: string }) => 
            (g.user_id || g.userId) === entry.user_id
        ) as { accuracy?: number; guessingAccuracy?: number; correct_count?: number; correctCount?: number } | undefined
        
        // Extract guessing stats (handle both formats)
        const guessingAccuracy = guesserData?.accuracy ?? guesserData?.guessingAccuracy ?? null
        const correctCount = guesserData?.correct_count ?? guesserData?.correctCount ?? 0
        
        return {
          festival_id: result.festival_id,
          user_id: entry.user_id,
          rank: index + 1,
          points: entry.points,
          nominations_count: 0, // Will be calculated if needed
          ratings_count: 0, // Will be calculated if needed
          average_rating: null, // Will be calculated if needed
          guessing_accuracy: guessingAccuracy,
          guessing_points: correctCount * 2, // 2 points per correct guess
        }
      })
      
      // Upsert standings (onConflict handles duplicates)
      const { error: insertError } = await supabase
        .from('festival_standings')
        .upsert(standings, { onConflict: 'festival_id,user_id' })
      
      if (insertError) {
        console.error(`Error inserting standings for festival ${result.festival_id}:`, insertError)
        errors++
      } else {
        migrated++
      }
    } catch (err) {
      console.error(`Error processing festival ${result.festival_id}:`, err)
      errors++
    }
  }
  
  return {
    success: true,
    message: `Migration complete: ${migrated} festivals migrated, ${errors} errors`,
    migrated,
    errors,
  }
}

