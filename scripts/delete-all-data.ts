/**
 * Script to delete all user data from BackRow database
 * 
 * ⚠️ WARNING: This will delete ALL users, clubs, festivals, seasons, and related data!
 * 
 * Usage:
 *   SUPABASE_SERVICE_ROLE_KEY=your_service_role_key npm run delete-all-data
 * 
 * Or set SUPABASE_SERVICE_ROLE_KEY in .env.local
 */

import { createClient } from '@supabase/supabase-js'
import { config } from 'dotenv'
import { join } from 'path'

// Load environment variables from .env.local
config({ path: join(process.cwd(), '.env.local') })

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!SUPABASE_URL) {
  throw new Error('NEXT_PUBLIC_SUPABASE_URL is not set')
}

if (!SUPABASE_SERVICE_ROLE_KEY) {
  throw new Error('SUPABASE_SERVICE_ROLE_KEY is not set. Please set it in .env.local')
}

// Create admin client with service role key
const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
})

async function deleteAllData() {
  console.log('🗑️  Deleting all user data from BackRow...\n')
  console.log('⚠️  WARNING: This will delete ALL users, clubs, festivals, seasons, and related data!\n')

  const results: Array<{ table: string; success: boolean; count?: number; error?: string }> = []

  // Delete in order (respecting foreign key constraints)
  const tablesToDelete = [
    // Child tables first
    { name: 'nomination_guesses', description: 'Nomination guesses' },
    { name: 'festival_results', description: 'Festival results' },
    { name: 'ratings', description: 'Festival ratings' },
    { name: 'generic_ratings', description: 'Generic ratings' },
    { name: 'nominations', description: 'Nominations' },
    { name: 'theme_votes', description: 'Theme votes' },
    { name: 'festivals', description: 'Festivals' },
    { name: 'seasons', description: 'Seasons' },
    { name: 'theme_pool', description: 'Theme pool' },
    { name: 'chat_messages', description: 'Chat messages' },
    { name: 'activity_log', description: 'Activity log' },
    { name: 'favorite_clubs', description: 'Favorite clubs' },
    { name: 'club_members', description: 'Club members' },
    { name: 'clubs', description: 'Clubs' },
    { name: 'users', description: 'Users (public.users)' },
  ]

  // Helper function to delete from a table with appropriate filter
  async function deleteTableRows(tableName: string): Promise<{ error: unknown }> {
    // Special handling for tables without id columns or with composite keys
    // Use a condition on a key column that will match all rows
    const specialCases: Record<string, string> = {
      'festival_results': 'festival_id', // Uses festival_id as PK
      'generic_ratings': 'user_id',      // Composite PK: user_id, tmdb_id
      'club_members': 'club_id',        // Composite PK: club_id, user_id
    }

    // Try special case first
    if (specialCases[tableName]) {
      const column = specialCases[tableName]
      return await supabaseAdmin
        .from(tableName)
        .delete()
        .neq(column, '00000000-0000-0000-0000-000000000000')
    }

    // Try created_at first (most tables have this)
    const deleteWithCreatedAt = await supabaseAdmin
      .from(tableName)
      .delete()
      .gte('created_at', '1970-01-01')
    
    if (!deleteWithCreatedAt.error) {
      return deleteWithCreatedAt
    }

    // Fall back to id condition
    return await supabaseAdmin
      .from(tableName)
      .delete()
      .neq('id', '00000000-0000-0000-0000-000000000000')
  }

  // Delete from public tables
  for (const table of tablesToDelete) {
    try {
      console.log(`Deleting ${table.description}...`)
      
      // Get count before deletion (this will also check if table exists)
      const { count: beforeCount, error: countError } = await supabaseAdmin
        .from(table.name)
        .select('*', { count: 'exact', head: true })

      // If table doesn't exist, skip it
      if (countError && (countError.message.includes('does not exist') || countError.message.includes('not found') || countError.message.includes('schema cache'))) {
        console.log(`  ⚠️  Table ${table.name} does not exist, skipping...`)
        results.push({ table: table.name, success: true, count: 0 })
        continue
      }

      // Delete all rows
      const { error } = await deleteTableRows(table.name)

      if (error) {
        const errorMessage = error instanceof Error ? error.message : String(error)
        console.error(`  ❌ Error: ${errorMessage}`)
        results.push({ table: table.name, success: false, error: errorMessage })
      } else {
        console.log(`  ✅ Deleted ${beforeCount || 0} rows`)
        results.push({ table: table.name, success: true, count: beforeCount || 0 })
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error'
      console.error(`  ❌ Error deleting ${table.name}: ${errorMessage}`)
      results.push({ table: table.name, success: false, error: errorMessage })
    }
  }

  // Delete from Supabase Auth (auth.users)
  try {
    console.log('\nDeleting auth users...')
    
    // List all auth users
    const { data: authUsers, error: listError } = await supabaseAdmin.auth.admin.listUsers()
    
    if (listError) {
      console.error(`  ❌ Error listing auth users: ${listError.message}`)
      results.push({ table: 'auth.users', success: false, error: listError.message })
    } else {
      const userIds = authUsers.users.map(u => u.id)
      console.log(`  Found ${userIds.length} auth users to delete`)
      
      // Delete each auth user
      let deletedCount = 0
      for (const userId of userIds) {
        const { error: deleteError } = await supabaseAdmin.auth.admin.deleteUser(userId)
        if (deleteError) {
          console.error(`  ⚠️  Failed to delete auth user ${userId}: ${deleteError.message}`)
        } else {
          deletedCount++
        }
      }
      
      console.log(`  ✅ Deleted ${deletedCount} auth users`)
      results.push({ table: 'auth.users', success: true, count: deletedCount })
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    console.error(`  ❌ Error deleting auth users: ${errorMessage}`)
    results.push({ table: 'auth.users', success: false, error: errorMessage })
  }

  // Print summary
  console.log('\n📊 Summary:')
  console.log('='.repeat(60))
  
  const successful = results.filter(r => r.success)
  const failed = results.filter(r => !r.success)
  
  console.log(`\n✅ Successfully deleted from ${successful.length} tables:`)
  successful.forEach(result => {
    console.log(`   • ${result.table}: ${result.count || 0} rows`)
  })
  
  if (failed.length > 0) {
    console.log(`\n❌ Failed to delete from ${failed.length} tables:`)
    failed.forEach(result => {
      console.log(`   • ${result.table}: ${result.error}`)
    })
  }
  
  console.log('\n' + '='.repeat(60))
  
  // Note about movies table (TMDB cache - kept intentionally)
  console.log('\n💡 Note: The `movies` table (TMDB cache) was NOT deleted.')
  console.log('   This table contains cached movie data and can be kept for performance.')
  console.log('   If you want to clear it, you can manually delete from the `movies` table.')
}

// Run the script
deleteAllData()
  .then(() => {
    console.log('\n✨ Done!')
    process.exit(0)
  })
  .catch((error) => {
    console.error('\n❌ Script failed:', error)
    process.exit(1)
  })

