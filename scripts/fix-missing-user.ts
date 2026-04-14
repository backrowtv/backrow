#!/usr/bin/env npx tsx
/**
 * Script to fix users who exist in auth.users but not in public.users
 *
 * Usage: npx tsx scripts/fix-missing-user.ts <email>
 * Example: npx tsx scripts/fix-missing-user.ts test3@backrow.tv
 */

import { createClient } from '@supabase/supabase-js'
import 'dotenv/config'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing required environment variables:')
  console.error('- NEXT_PUBLIC_SUPABASE_URL')
  console.error('- SUPABASE_SERVICE_ROLE_KEY')
  process.exit(1)
}

const email = process.argv[2]
if (!email) {
  console.error('Usage: npx tsx scripts/fix-missing-user.ts <email>')
  process.exit(1)
}

async function fixMissingUser() {
  const supabase = createClient(supabaseUrl, supabaseServiceKey, {
    auth: { autoRefreshToken: false, persistSession: false }
  })

  // Find auth user by email
  const { data: { users }, error: authError } = await supabase.auth.admin.listUsers()

  if (authError) {
    console.error('Error listing users:', authError)
    process.exit(1)
  }

  const authUser = users.find(u => u.email === email)
  if (!authUser) {
    console.error(`No auth user found with email: ${email}`)
    process.exit(1)
  }

  console.log(`Found auth user: ${authUser.id} (${authUser.email})`)

  // Check if public user exists
  const { data: publicUser } = await supabase
    .from('users')
    .select('id, username')
    .eq('id', authUser.id)
    .single()

  if (publicUser) {
    console.log(`Public user already exists with username: ${publicUser.username}`)
    process.exit(0)
  }

  // Generate unique username
  const usernameBase = (email.split('@')[0] || `user_${authUser.id.slice(0, 8)}`).toLowerCase().replace(/[^a-z0-9_]/g, '_')

  let username = usernameBase
  let counter = 1

  while (true) {
    const { data: existing } = await supabase
      .from('users')
      .select('id')
      .eq('username', username)
      .single()

    if (!existing) break

    username = `${usernameBase}${counter}`
    counter++

    if (counter > 100) {
      console.error('Could not find unique username after 100 attempts')
      process.exit(1)
    }
  }

  // Create public user
  const { data: newUser, error: insertError } = await supabase
    .from('users')
    .insert({
      id: authUser.id,
      email: email,
      username: username,
      display_name: email.split('@')[0] || 'User',
    })
    .select()
    .single()

  if (insertError) {
    console.error('Error creating user:', insertError)
    process.exit(1)
  }

  console.log(`Created public user:`)
  console.log(`  ID: ${newUser.id}`)
  console.log(`  Username: ${newUser.username}`)
  console.log(`  Display Name: ${newUser.display_name}`)
}

fixMissingUser()
