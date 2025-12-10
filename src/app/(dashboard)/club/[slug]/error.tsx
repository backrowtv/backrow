'use client'

import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { FilmSlate, ArrowClockwise, FilmReel, Warning, WifiSlash } from '@phosphor-icons/react'
import Link from 'next/link'

// Club-specific fun error messages
const ERROR_MESSAGES = [
  { title: "The screening was cancelled!", subtitle: "We couldn't load this club right now." },
  { title: "Members only... oops!", subtitle: "Something went wrong fetching club data." },
  { title: "The usher got lost!", subtitle: "We couldn't find our way to this club." },
  { title: "Popcorn machine broke!", subtitle: "Technical difficulties at the concession stand." },
  { title: "Sold out!", subtitle: "The connection to this club timed out." },
]

export default function ClubError({
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
  const [isOffline, setIsOffline] = useState(false)

  useEffect(() => {
    console.error('Club page error:', error)
    // Check if we're offline
    setIsOffline(!navigator.onLine)

    const handleOnline = () => setIsOffline(false)
    const handleOffline = () => setIsOffline(true)

    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)

    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [error])

  const handleRetry = async () => {
    setIsRetrying(true)
    await new Promise(resolve => setTimeout(resolve, 500))
    reset()
  }

  return (
    <div className="min-h-[60vh] flex items-center justify-center px-4">
      <div className="max-w-md w-full text-center space-y-6">
        {/* Icon - different for offline vs error */}
        <div className="relative mx-auto w-20 h-20">
          {isOffline ? (
            <>
              <div className="absolute inset-0 bg-amber-500/10 rounded-full animate-pulse" />
              <div className="relative flex items-center justify-center w-20 h-20 bg-[var(--surface-2)] rounded-full border border-[var(--border)]">
                <WifiSlash className="w-10 h-10 text-amber-500" weight="duotone" />
              </div>
            </>
          ) : (
            <>
              <div className="absolute inset-0 bg-[var(--primary)]/10 rounded-full animate-ping" style={{ animationDuration: '2s' }} />
              <div className="relative flex items-center justify-center w-20 h-20 bg-[var(--surface-2)] rounded-full border border-[var(--border)]">
                <FilmSlate className="w-10 h-10 text-[var(--primary)]" weight="duotone" />
              </div>
            </>
          )}
        </div>

        {/* Message */}
        <div className="space-y-2">
          <h1 className="text-xl font-bold text-[var(--text-primary)]">
            {isOffline ? "You're offline!" : errorMessage.title}
          </h1>
          <p className="text-sm text-[var(--text-muted)]">
            {isOffline
              ? "Check your connection and try again."
              : errorMessage.subtitle
            }
          </p>
        </div>

        {/* Error details */}
        {!isOffline && error.message && (
          <details className="text-left bg-[var(--surface-1)] rounded-lg p-3 text-xs">
            <summary className="cursor-pointer text-[var(--text-muted)] hover:text-[var(--text-secondary)] flex items-center gap-2">
              <Warning className="w-3 h-3" />
              What happened?
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
            {isOffline ? "Retry when online" : "Try again"}
          </Button>
          <Button variant="outline" size="sm" asChild>
            <Link href="/clubs" className="gap-2">
              <FilmReel className="w-4 h-4" />
              All clubs
            </Link>
          </Button>
        </div>
      </div>
    </div>
  )
}
