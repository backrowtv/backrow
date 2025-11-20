'use client'

import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { ArrowClockwise, House, Warning, Key } from '@phosphor-icons/react'
import Link from 'next/link'

// Auth-specific error messages
const ERROR_MESSAGES = [
  { title: "VIP access denied!", subtitle: "Something went wrong with authentication." },
  { title: "Ticket booth closed!", subtitle: "We're having trouble with sign in." },
  { title: "Backstage pass expired!", subtitle: "Please try signing in again." },
]

export default function AuthError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  const [errorMessage] = useState(() =>
    ERROR_MESSAGES[Math.floor(Math.random() * ERROR_MESSAGES.length)]
  )
  const [isRetrying, setIsRetrying] = useState(false)

  useEffect(() => {
    console.error('Auth error:', error)
  }, [error])

  const handleRetry = async () => {
    setIsRetrying(true)
    await new Promise(resolve => setTimeout(resolve, 500))
    reset()
  }

  return (
    <div className="min-h-[60vh] flex items-center justify-center px-4">
      <div className="max-w-md w-full text-center space-y-6">
        {/* Icon */}
        <div className="relative mx-auto w-20 h-20">
          <div className="absolute inset-0 bg-[var(--primary)]/10 rounded-full animate-pulse" />
          <div className="relative flex items-center justify-center w-20 h-20 bg-[var(--surface-2)] rounded-full border border-[var(--border)]">
            <Key className="w-10 h-10 text-[var(--primary)]" weight="duotone" />
          </div>
        </div>

        {/* Message */}
        <div className="space-y-2">
          <h1 className="text-xl font-bold text-[var(--text-primary)]">
            {errorMessage.title}
          </h1>
          <p className="text-sm text-[var(--text-muted)]">
            {errorMessage.subtitle}
          </p>
        </div>

        {/* Error details */}
        {error.message && (
          <details className="text-left bg-[var(--surface-1)] rounded-lg p-3 text-xs">
            <summary className="cursor-pointer text-[var(--text-muted)] hover:text-[var(--text-secondary)] flex items-center gap-2">
              <Warning className="w-3 h-3" />
              Technical details
            </summary>
            <pre className="mt-2 text-[var(--text-muted)] overflow-auto max-h-24 font-mono text-[10px]">
              {error.message}
            </pre>
          </details>
        )}

        {/* Actions */}
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Button
            onClick={handleRetry}
            isLoading={isRetrying}
            size="sm"
            className="gap-2"
          >
            <ArrowClockwise className="w-4 h-4" />
            Try again
          </Button>
          <Button variant="outline" size="sm" asChild>
            <Link href="/" className="gap-2">
              <House className="w-4 h-4" />
              Home
            </Link>
          </Button>
        </div>
      </div>
    </div>
  )
}
