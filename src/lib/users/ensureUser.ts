import { SupabaseClient } from '@supabase/supabase-js'

/**
 * Ensures a user exists in the public.users table.
 * Creates the user if they don't exist, otherwise returns existing user.
 *
 * Uses retry logic to handle race conditions on username uniqueness.
 */
export async function ensureUser(
  supabase: SupabaseClient,
  authUserId: string,
  email: string
) {
  // Check if user already exists
  const { data: existingUser } = await supabase
    .from('users')
    .select('id')
    .eq('id', authUserId)
    .single()

  if (existingUser) {
    return { user: existingUser, created: false }
  }

  // Generate username from email (before @ symbol)
  const usernameBase = (email.split('@')[0] || `user_${authUserId.slice(0, 8)}`).toLowerCase().replace(/[^a-z0-9_]/g, '_')

  // Retry loop to handle race conditions on username uniqueness
  const maxAttempts = 10
  let lastError: Error | null = null

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    // Generate username with counter (first attempt uses base, subsequent add counter)
    const username = attempt === 0 ? usernameBase : `${usernameBase}${attempt}`

    // Try to insert with this username
    const { data: newUser, error } = await supabase
      .from('users')
      .insert({
        id: authUserId,
        email: email,
        username: username,
        display_name: email.split('@')[0] || 'User',
      })
      .select()
      .single()

    if (!error) {
      return { user: newUser, created: true }
    }

    // If error is duplicate key on username, try next username
    if (error.code === '23505' && error.message?.includes('username')) {
      lastError = new Error(`Username ${username} already taken`)
      continue
    }

    // If error is duplicate key on id, user was created by another process
    if (error.code === '23505' && error.message?.includes('users_pkey')) {
      const { data: user } = await supabase
        .from('users')
        .select('id')
        .eq('id', authUserId)
        .single()
      if (user) {
        return { user, created: false }
      }
    }

    // For other errors, throw immediately
    throw error
  }

  // If we exhausted all attempts, throw the last error
  throw lastError || new Error('Failed to create user after maximum attempts')
}

