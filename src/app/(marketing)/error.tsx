'use client'

import { useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { FilmSlate, ArrowClockwise, House } from '@phosphor-icons/react'
import Link from 'next/link'

export default function MarketingError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    // Log the error for debugging
    console.error('Marketing page error:', error)
  }, [error])

  return (
    <div className="min-h-[60vh] flex items-center justify-center px-4">
      <div className="max-w-md w-full text-center space-y-6">
        {/* Film icon */}
        <div className="relative mx-auto w-24 h-24">
          <div className="absolute inset-0 bg-[var(--primary)]/10 rounded-full animate-ping" />
          <div className="relative flex items-center justify-center w-24 h-24 bg-[var(--surface-2)] rounded-full border border-[var(--border)]">
            <FilmSlate className="w-12 h-12 text-[var(--primary)]" weight="duotone" />
          </div>
        </div>

        {/* Error message */}
        <div className="space-y-2">
          <h1 className="text-2xl font-bold text-[var(--text-primary)]">
            Something went wrong
          </h1>
          <p className="text-[var(--text-muted)]">
            We encountered an unexpected error. Please try again.
          </p>
        </div>

        {/* Action buttons */}
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Button onClick={reset} className="gap-2">
            <ArrowClockwise className="w-4 h-4" />
            Try again
          </Button>
          <Button variant="outline" asChild>
            <Link href="/" className="gap-2">
              <House className="w-4 h-4" />
              Back to home
            </Link>
          </Button>
        </div>
      </div>
    </div>
  )
}
