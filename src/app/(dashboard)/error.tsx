'use client'

import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { FilmSlate, ArrowClockwise, House, Warning } from '@phosphor-icons/react'
import Link from 'next/link'

// Fun movie-themed error messages
const ERROR_MESSAGES = [
  { title: "Plot twist!", subtitle: "Something unexpected happened behind the scenes." },
  { title: "Technical difficulties!", subtitle: "Our projector seems to be having a moment." },
  { title: "Intermission time!", subtitle: "We hit a snag, but the show must go on." },
  { title: "Scene missing!", subtitle: "Looks like we lost a reel somewhere." },
  { title: "Cut!", subtitle: "The director called for a quick break." },
  { title: "Blooper reel!", subtitle: "Even the best takes sometimes go wrong." },
  { title: "Film broke!", subtitle: "Don't worry, we're splicing it back together." },
  { title: "Connection lost!", subtitle: "The signal from the projection booth dropped." },
]

export default function DashboardError({
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
    // Log the error for debugging
    console.error('Dashboard error:', error)
  }, [error])

  const handleRetry = async () => {
    setIsRetrying(true)
    // Small delay for visual feedback
    await new Promise(resolve => setTimeout(resolve, 500))
    reset()
  }

  return (
    <div className="min-h-[60vh] flex items-center justify-center px-4">
      <div className="max-w-md w-full text-center space-y-6">
        {/* Animated film icon */}
        <div className="relative mx-auto w-24 h-24">
          <div className="absolute inset-0 bg-[var(--primary)]/10 rounded-full animate-ping" />
          <div className="relative flex items-center justify-center w-24 h-24 bg-[var(--surface-2)] rounded-full border border-[var(--border)]">
            <FilmSlate className="w-12 h-12 text-[var(--primary)]" weight="duotone" />
          </div>
        </div>

        {/* Error message */}
        <div className="space-y-2">
          <h1 className="text-2xl font-bold text-[var(--text-primary)]">
            {errorMessage.title}
          </h1>
          <p className="text-[var(--text-muted)]">
            {errorMessage.subtitle}
          </p>
        </div>

        {/* Error details (collapsible for debugging) */}
        {error.message && (
          <details className="text-left bg-[var(--surface-1)] rounded-lg p-3 text-xs">
            <summary className="cursor-pointer text-[var(--text-muted)] hover:text-[var(--text-secondary)] flex items-center gap-2">
              <Warning className="w-3 h-3" />
              Technical details
            </summary>
            <pre className="mt-2 text-[var(--text-muted)] overflow-auto max-h-32 font-mono text-[10px]">
              {error.message}
            </pre>
          </details>
        )}

        {/* Action buttons */}
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Button
            onClick={handleRetry}
            isLoading={isRetrying}
            className="gap-2"
          >
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

        {/* Playful footer */}
        <p className="text-xs text-[var(--text-muted)]">
          If this keeps happening, try refreshing the page or come back in a few minutes.
        </p>
      </div>
    </div>
  )
}
