'use client'

import { useAuth } from '@/components/auth/AuthProvider'
import { EmailVerificationBanner } from './EmailVerificationBanner'

/**
 * Client-side wrapper for EmailVerificationBanner.
 * 
 * Uses AuthProvider context to get user info instead of doing a server
 * auth check. This prevents re-triggering auth checks on navigation,
 * which would bypass the Router Cache and show loading skeletons.
 */
export function EmailVerificationBannerClient() {
  const { user } = useAuth()
  
  // Don't render if no user or email is verified
  if (!user) return null
  
  const emailVerified = user.email_confirmed_at !== null

  if (emailVerified) return null

  return (
    <div className="sticky top-0 z-40 px-4 pt-4">
      <div className="max-w-7xl mx-auto">
        <EmailVerificationBanner 
          email={user.email || ''} 
          emailVerified={emailVerified}
        />
      </div>
    </div>
  )
}
