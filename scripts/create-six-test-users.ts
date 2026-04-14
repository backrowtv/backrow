/**
 * Script to create 6 test users for BackRow feature testing
 * 
 * Usage:
 *   npx tsx scripts/create-six-test-users.ts
 * 
 * Creates:
 *   - test1@backrow.test through test6@backrow.test
 *   - Password: TestPass123! (for all)
 *   - Display names: Test User 1 through Test User 6
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

// Test user configuration
const TEST_USERS = [
  { email: 'test1@backrow.test', displayName: 'Test User 1', role: 'producer' },
  { email: 'test2@backrow.test', displayName: 'Test User 2', role: 'director' },
  { email: 'test3@backrow.test', displayName: 'Test User 3', role: 'critic' },
  { email: 'test4@backrow.test', displayName: 'Test User 4', role: 'critic' },
  { email: 'test5@backrow.test', displayName: 'Test User 5', role: 'critic' },
  { email: 'test6@backrow.test', displayName: 'Test User 6', role: 'critic' },
]

const TEST_PASSWORD = 'TestPass123!'

async function createTestUser(email: string, displayName: string) {
  console.log(`\n📝 Creating ${email}...`)

  // Check if user already exists
  const { data: existingUsers } = await supabaseAdmin.auth.admin.listUsers()
  const existingUser = existingUsers?.users?.find(u => u.email === email)

  if (existingUser) {
    console.log(`  ⚠️  User ${email} already exists. Deleting and recreating...`)
    await supabaseAdmin.auth.admin.deleteUser(existingUser.id)
    
    // Also delete from public.users if exists
    try {
      await supabaseAdmin
        .from('users')
        .delete()
        .eq('id', existingUser.id)
    } catch {
      // Ignore errors if user doesn't exist in public.users
    }
  }

  // Create user in auth.users
  const { data: authUser, error: authError } = await supabaseAdmin.auth.admin.createUser({
    email,
    password: TEST_PASSWORD,
    email_confirm: true, // Auto-confirm email for dev
    user_metadata: {
      display_name: displayName,
    },
  })

  if (authError) {
    throw new Error(`Failed to create auth user ${email}: ${authError.message}`)
  }

  if (!authUser.user) {
    throw new Error(`Failed to create auth user ${email}: No user returned`)
  }

  // Generate username from email
  const username = email.split('@')[0]

  // Create user in public.users table
  const { error: publicError } = await supabaseAdmin
    .from('users')
    .insert({
      id: authUser.user.id,
      email: email,
      username: username,
      display_name: displayName,
    })

  if (publicError) {
    // Check if it's a duplicate key error
    if (publicError.code === '23505') {
      console.log(`  ⚠️  User already exists in public.users, continuing...`)
    } else {
      throw new Error(`Failed to create public user ${email}: ${publicError.message}`)
    }
  }

  console.log(`  ✅ Created ${email} (${authUser.user.id.slice(0, 8)}...)`)
  return authUser.user
}

async function createSixTestUsers() {
  console.log('🎬 Creating 6 test users for BackRow feature testing...\n')
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
  console.log('Email Pattern: test1@backrow.test - test6@backrow.test')
  console.log(`Password: ${TEST_PASSWORD}`)
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')

  const createdUsers: Array<{ email: string; id: string; role: string }> = []

  for (const testUser of TEST_USERS) {
    try {
      const user = await createTestUser(testUser.email, testUser.displayName)
      createdUsers.push({
        email: testUser.email,
        id: user.id,
        role: testUser.role,
      })
    } catch (error) {
      console.error(`\n❌ Error creating ${testUser.email}:`)
      if (error instanceof Error) {
        console.error(`   ${error.message}`)
      } else {
        console.error(error)
      }
    }
  }

  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
  console.log('✨ Test user creation complete!')
  console.log(`\nCreated ${createdUsers.length}/${TEST_USERS.length} users:`)
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
  
  createdUsers.forEach(user => {
    const roleLabel = user.role.charAt(0).toUpperCase() + user.role.slice(1)
    console.log(`  ${user.email} - ${roleLabel} (${user.id.slice(0, 8)}...)`)
  })

  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
  console.log('🔐 Login Credentials:')
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
  console.log(`Password for all: ${TEST_PASSWORD}`)
  console.log('\nSign in at: http://localhost:3000/sign-in')
  console.log('Test page at: http://localhost:3000/test-auth')
}

// Run the script
createSixTestUsers()

