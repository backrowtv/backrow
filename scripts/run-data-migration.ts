import { createClient } from '@supabase/supabase-js'
import { config } from 'dotenv'
import { resolve } from 'path'
import type { FestivalResults } from '../src/types/festival-results'

// Load environment variables
config({ path: resolve(process.cwd(), '.env.local') })

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error('❌ Missing environment variables')
  console.error('Need: NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY')
  process.exit(1)
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
})

async function migrateFestivalResults() {
  console.log('🚀 Starting data migration from festival_results to festival_standings...\n')
  
  // Get all festival results that are final
  const { data: results, error } = await supabase
    .from('festival_results')
    .select('festival_id, results')
    .eq('is_final', true)
  
  if (error) {
    console.error('❌ Error fetching festival results:', error)
    return { error: error.message }
  }
  
  if (!results || results.length === 0) {
    console.log('ℹ️  No festival results to migrate')
    return { success: true, message: 'No festival results to migrate', migrated: 0, errors: 0 }
  }
  
  console.log(`📊 Found ${results.length} festival results to migrate\n`)
  
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
        )
        
        // Extract guessing stats (handle both formats)
        const guesserDataAny = guesserData as { accuracy?: number; guessingAccuracy?: number; correct_count?: number; correctCount?: number } | undefined
        const guessingAccuracy = guesserDataAny?.accuracy || guesserDataAny?.guessingAccuracy || null
        const correctCount = guesserDataAny?.correct_count || guesserDataAny?.correctCount || 0
        
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
        console.error(`❌ Error inserting standings for festival ${result.festival_id}:`, insertError.message)
        errors++
      } else {
        migrated++
        console.log(`✅ Migrated festival ${result.festival_id} (${standings.length} standings)`)
      }
    } catch (err) {
      console.error(`❌ Error processing festival ${result.festival_id}:`, err)
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

async function main() {
  const result = await migrateFestivalResults()
  
  if (result.error) {
    console.error('❌ Migration failed:', result.error)
    process.exit(1)
  }
  
  console.log('\n✅', result.message)
  console.log(`   Migrated: ${result.migrated} festivals`)
  console.log(`   Errors: ${result.errors}`)
  console.log('\n✅ Data migration complete!')
}

main().catch(console.error)
