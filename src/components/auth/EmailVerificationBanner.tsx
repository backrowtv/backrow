'use client'

import { useState } from 'react'
import { X, EnvelopeSimple, WarningCircle } from '@phosphor-icons/react'
import { Button } from '@/components/ui/button'
import { createClient } from '@/lib/supabase/client'
import toast from 'react-hot-toast'

interface EmailVerificationBannerProps {
  email: string
  emailVerified: boolean
}

export function EmailVerificationBanner({ email, emailVerified }: EmailVerificationBannerProps) {
  const [dismissed, setDismissed] = useState(false)
  const [isResending, setIsResending] = useState(false)

  if (emailVerified || dismissed) {
    return null
  }

  const handleResendVerification = async () => {
    setIsResending(true)
    try {
      const supabase = createClient()
      const { error } = await supabase.auth.resend({
        type: 'signup',
        email: email,
      })

      if (error) {
        console.error('Error resending verification email:', error)
        toast.error('Failed to resend verification email. Please try again later.')
      } else {
        toast.success('Verification email sent! Please check your inbox.')
      }
    } catch (error) {
      console.error('Error resending verification email:', error)
      toast.error('Failed to resend verification email. Please try again later.')
    } finally {
      setIsResending(false)
    }
  }

  return (
    <div
      className="rounded-lg border p-4 mb-6 flex items-start gap-3 animate-fade-in bg-[var(--warning)]/10 border-[var(--warning)]/30"
    >
      <WarningCircle className="w-5 h-5 shrink-0 mt-0.5 text-[var(--warning)]" weight="fill" />
      <div className="flex-1">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-sm font-medium mb-1 text-[var(--warning)]">
              Please verify your email address
            </p>
            <p className="text-sm text-[var(--text-primary)]">
              We sent a verification email to <strong>{email}</strong>. Please check your inbox and click the verification link to complete your account setup.
            </p>
          </div>
          <button
            onClick={() => setDismissed(true)}
            className="shrink-0 p-1 hover:opacity-70 transition-opacity"
            aria-label="Dismiss"
          >
            <X className="w-4 h-4 text-[var(--text-muted)]" weight="bold" />
          </button>
        </div>
        <div className="mt-3 flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleResendVerification}
            disabled={isResending}
            className="text-xs"
          >
            <EnvelopeSimple className="w-3 h-3 mr-1" weight="bold" />
            {isResending ? 'Sending...' : 'Resend Email'}
          </Button>
        </div>
      </div>
    </div>
  )
}

