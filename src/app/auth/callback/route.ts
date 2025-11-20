import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { ensureUser } from '@/lib/users/ensureUser'
import { NextRequest } from 'next/server'
import { consumeRedirectCookie } from '@/lib/auth/redirect'

/**
 * OAuth Callback Handler
 * 
 * Handles OAuth redirects from all providers (Google, Meta, Twitter, Apple, Discord)
 * Also handles magic link authentication
 * Creates/updates user in database and redirects to dashboard
 */
export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url)
  const code = requestUrl.searchParams.get('code')
  const error = requestUrl.searchParams.get('error')
  const errorDescription = requestUrl.searchParams.get('error_description')
  
  // Handle OAuth errors (user denied access, etc.)
  if (error) {
    console.error('OAuth error:', error, errorDescription)
    const errorMessage = errorDescription || error || 'OAuth authentication failed'
    redirect(`/sign-in?error=${encodeURIComponent(errorMessage)}`)
  }
  
  // If no code, redirect to sign-in
  if (!code) {
    redirect('/sign-in?error=No authorization code received')
  }
  
  const supabase = await createClient()
  
  // Exchange code for session
  const { data: authData, error: authError } = await supabase.auth.exchangeCodeForSession(code)
  
  if (authError) {
    console.error('Error exchanging code for session:', authError)
    redirect(`/sign-in?error=${encodeURIComponent(authError.message || 'Failed to complete sign-in')}`)
  }
  
  if (!authData.user) {
    redirect('/sign-in?error=No user data received from OAuth provider')
  }
  
  const user = authData.user
  const email = user.email
  
  if (!email) {
    redirect('/sign-in?error=No email address received from OAuth provider')
  }
  
  // Ensure user exists in public.users table
  try {
    await ensureUser(supabase, user.id, email)
    
    // Optionally update user metadata from OAuth provider
    if (user.user_metadata) {
      const updateData: {
        display_name?: string
        avatar_url?: string
      } = {}
      
      // Use OAuth provider's display name if available
      if (user.user_metadata.full_name || user.user_metadata.name) {
        updateData.display_name = user.user_metadata.full_name || user.user_metadata.name
      }
      
      // Use OAuth provider's avatar if available
      if (user.user_metadata.avatar_url || user.user_metadata.picture) {
        updateData.avatar_url = user.user_metadata.avatar_url || user.user_metadata.picture
      }
      
      // Update user profile if we have new data
      if (Object.keys(updateData).length > 0) {
        try {
          const { error: updateError } = await supabase
            .from('users')
            .update(updateData)
            .eq('id', user.id)
          
          if (updateError) {
            // Log but don't fail - user can still sign in
            console.error('Error updating user profile from OAuth:', updateError)
          }
        } catch (err) {
          // Log but don't fail - user can still sign in
          console.error('Error updating user profile from OAuth:', err)
        }
      }
    }
  } catch (userError) {
    // Log error but don't fail - user can still sign in
    console.error('Error ensuring user exists:', userError)
  }
  
  // Redirect to stored destination (invite link, etc.) or home
  const destination = await consumeRedirectCookie()
  redirect(destination)
}

