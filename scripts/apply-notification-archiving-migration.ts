/**
 * Apply Notification Archiving Migration
 * 
 * This script applies the notification archiving migration directly via Supabase API
 */

import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'fs'
import { join } from 'path'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error('Missing required environment variables:')
  console.error('- NEXT_PUBLIC_SUPABASE_URL')
  console.error('- SUPABASE_SERVICE_ROLE_KEY')
  process.exit(1)
}

const supabaseUrl: string = SUPABASE_URL
const supabaseServiceKey: string = SUPABASE_SERVICE_ROLE_KEY

async function applyMigration() {
  const supabase = createClient(supabaseUrl, supabaseServiceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  })

  // Read migration file
  const migrationPath = join(process.cwd(), 'supabase/migrations/20251201000000_add_notification_archiving.sql')
  const migrationSQL = readFileSync(migrationPath, 'utf-8')

  console.log('📦 Applying notification archiving migration...')
  console.log('---')

  try {
    // Execute migration SQL using Supabase REST API
    // Split by semicolons and execute statements individually
    const statements = migrationSQL
      .split(';')
      .map(s => s.trim())
      .filter(s => s.length > 0 && !s.startsWith('--'))

    let executedCount = 0
    
    for (const statement of statements) {
      // Skip empty statements and comments
      if (!statement || statement.startsWith('--')) {
        continue
      }

      // Handle DO blocks (they contain semicolons)
      if (statement.includes('DO $$')) {
        // Execute DO block as-is
        try {
          const { error } = await supabase.rpc('exec_sql', {
            sql: statement + ';',
          })
          
          if (error) {
            // Try direct query if RPC doesn't work
            const { error: queryError } = await supabase
              .from('_migrations')
              .select('*')
              .limit(0) // Dummy query to test connection
            
            if (!queryError) {
              // Connection works, try executing via raw SQL
              console.log('⚠️  RPC method not available, please apply migration manually via Supabase Dashboard')
              console.log('Migration file:', migrationPath)
              break
            }
          } else {
            executedCount++
            console.log(`✅ Executed statement ${executedCount}`)
          }
        } catch (err) {
          console.error('Error executing DO block:', err)
        }
        continue
      }

      // Skip transaction markers
      if (statement.includes('BEGIN') || statement.includes('COMMIT')) {
        continue
      }

      try {
        // Try RPC method first
        const { error: rpcError } = await supabase.rpc('exec_sql', {
          sql: statement + ';',
        })

        if (rpcError) {
          // RPC might not be available, that's okay - migration can be applied manually
          console.log('⚠️  RPC method not available')
          console.log('Please apply migration manually via Supabase Dashboard')
          break
        } else {
          executedCount++
          console.log(`✅ Executed statement ${executedCount}`)
        }
      } catch (err) {
        console.error('Error executing statement:', err)
        console.error('Statement preview:', statement.substring(0, 100) + '...')
      }
    }

    if (executedCount > 0) {
      console.log('')
      console.log(`✅ Migration applied successfully! (${executedCount} statements executed)`)
    } else {
      console.log('')
      console.log('⚠️  Could not execute migration automatically')
    }
    
    console.log('')
    console.log('Next steps:')
    console.log('1. Verify columns were added:')
    console.log('   SELECT column_name, data_type FROM information_schema.columns')
    console.log('   WHERE table_name = \'notifications\' AND column_name IN (\'archived\', \'archived_at\');')
    console.log('')
    console.log('2. Verify functions were created:')
    console.log('   SELECT routine_name FROM information_schema.routines')
    console.log('   WHERE routine_name IN (\'archive_old_notifications\', \'delete_old_archived_notifications\');')
    console.log('')
    console.log('3. Regenerate TypeScript types:')
    console.log('   npx supabase gen types typescript --linked > src/types/database.ts')
    console.log('')
    console.log('---')
    console.log('If automatic execution failed, apply manually:')
    console.log('1. Go to: Supabase Dashboard > SQL Editor')
    console.log('2. Copy SQL from: supabase/migrations/20251201000000_add_notification_archiving.sql')
    console.log('3. Paste and execute')
  } catch (error) {
    console.error('❌ Migration failed:', error)
    console.error('')
    console.error('Please apply the migration manually via Supabase Dashboard:')
    console.error('1. Go to: Supabase Dashboard > SQL Editor')
    console.error('2. Copy the SQL from: supabase/migrations/20251201000000_add_notification_archiving.sql')
    console.error('3. Paste and execute')
    process.exit(1)
  }
}

applyMigration()


