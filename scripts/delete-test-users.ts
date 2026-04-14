/**
 * Script to delete test users from BackRow development
 * 
 * Usage:
 *   npm run delete-test-users <email_or_pattern>
 * 
 * Examples:
 *   npm run delete-test-users myuser@example.com
 *   npm run delete-test-users "test*@example.com"  # Wildcard pattern
 * 
 * Requires SUPABASE_SERVICE_ROLE_KEY in .env.local
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

// Get email pattern from command line args (required)
const emailArg = process.argv[2]

if (!emailArg) {
  console.error('❌ Usage: npm run delete-test-users <email_or_pattern>')
  console.error('   Example: npm run delete-test-users myuser@example.com')
  console.error('   Example: npm run delete-test-users "test*@example.com"  (wildcard)')
  process.exit(1)
}

const TEST_EMAIL_PATTERNS = [emailArg]

async function deleteTestUsers() {
  console.log('🗑️  Deleting test users from BackRow...\n')

  try {
    // Get all users from auth
    const { data: { users }, error: listError } = await supabaseAdmin.auth.admin.listUsers()
    
    if (listError) {
      throw new Error(`Failed to list users: ${listError.message}`)
    }

    if (!users || users.length === 0) {
      console.log('ℹ️  No users found.')
      return
    }

    // Find test users
    const testUsers = users.filter(user => 
      TEST_EMAIL_PATTERNS.some(pattern => {
        if (pattern.includes('*')) {
          // Simple wildcard matching
          const regex = new RegExp('^' + pattern.replace('*', '.*') + '$')
          return regex.test(user.email || '')
        }
        return user.email === pattern
      })
    )

    if (testUsers.length === 0) {
      console.log('ℹ️  No test users found.')
      return
    }

    console.log(`Found ${testUsers.length} test user(s) to delete:\n`)
    testUsers.forEach(user => {
      console.log(`  - ${user.email} (${user.id})`)
    })
    console.log()

    // Delete each test user
    let deletedCount = 0
    let errorCount = 0

    for (const testUser of testUsers) {
      try {
        console.log(`Deleting ${testUser.email}...`)

        // Delete from public.users first (if exists)
        try {
          await supabaseAdmin
            .from('users')
            .delete()
            .eq('id', testUser.id)
        } catch {
          // Ignore errors if user doesn't exist in public.users
          console.log(`  ⚠️  Could not delete from public.users (may not exist)`)
        }

        // Delete from auth.users
        const { error: deleteError } = await supabaseAdmin.auth.admin.deleteUser(testUser.id)
        
        if (deleteError) {
          throw new Error(deleteError.message)
        }

        console.log(`  ✅ Deleted ${testUser.email}`)
        deletedCount++
      } catch (error) {
        console.error(`  ❌ Error deleting ${testUser.email}:`)
        if (error instanceof Error) {
          console.error(`     ${error.message}`)
        } else {
          console.error(`     ${error}`)
        }
        errorCount++
      }
    }

    console.log('\n✨ Deletion complete!')
    console.log(`\nDeleted: ${deletedCount}`)
    if (errorCount > 0) {
      console.log(`Errors: ${errorCount}`)
    }

  } catch (error) {
    console.error('\n❌ Error deleting test users:')
    if (error instanceof Error) {
      console.error(error.message)
    } else {
      console.error(error)
    }
    process.exit(1)
  }
}

// Run the script
deleteTestUsers()

