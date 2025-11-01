'use client'

import { useSyncExternalStore, useMemo } from 'react'

interface FormattedDateProps {
  date: Date | string
  format: 'long' | 'short'
  className?: string
}

// Subscribe function that never re-triggers
const emptySubscribe = () => () => {}

// Check if we're on the client
const getClientSnapshot = () => true
const getServerSnapshot = () => false

/**
 * Client-side date formatter to prevent hydration mismatches
 * Formats dates after component mounts on the client
 */
export function FormattedDate({ date, format, className = '' }: FormattedDateProps) {
  const isClient = useSyncExternalStore(emptySubscribe, getClientSnapshot, getServerSnapshot)

  const formatted = useMemo(() => {
    if (!isClient) return ''
    const d = typeof date === 'string' ? new Date(date) : date
    
    if (format === 'long') {
      // Format: "Monday, January 15"
      return d.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })
    } else {
      // Format: "Mon, Jan 15"
      return d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })
    }
  }, [isClient, date, format])

  // Return empty string during SSR to prevent hydration mismatch
  if (!isClient) {
    return <span className={className} suppressHydrationWarning />
  }

  return <span className={className}>{formatted}</span>
}

