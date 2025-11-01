'use client'

import { useState, useEffect, useSyncExternalStore } from 'react'
import { Clock } from '@phosphor-icons/react'
import { cn } from '@/lib/utils'

interface LiveCountdownProps {
  deadline: string
  label?: string
  className?: string
  showIcon?: boolean
  size?: 'xs' | 'sm' | 'md'
}

interface TimeLeft {
  days: number
  hours: number
  minutes: number
  seconds: number
}

// Subscribe function that never re-triggers
const emptySubscribe = () => () => {}
const getClientSnapshot = () => true
const getServerSnapshot = () => false

export function LiveCountdown({ 
  deadline, 
  label, 
  className,
  showIcon = true,
  size = 'xs'
}: LiveCountdownProps) {
  const [timeLeft, setTimeLeft] = useState<TimeLeft | null>(null)
  const isClient = useSyncExternalStore(emptySubscribe, getClientSnapshot, getServerSnapshot)

  useEffect(() => {
    if (!isClient) return
    
    const calculateTimeLeft = (): TimeLeft | null => {
      const now = new Date().getTime()
      const target = new Date(deadline).getTime()
      const diff = target - now

      if (diff <= 0) {
        return null
      }

      return {
        days: Math.floor(diff / (1000 * 60 * 60 * 24)),
        hours: Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)),
        minutes: Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60)),
        seconds: Math.floor((diff % (1000 * 60)) / 1000),
      }
    }

    setTimeLeft(calculateTimeLeft())
    const timer = setInterval(() => {
      setTimeLeft(calculateTimeLeft())
    }, 1000)

    return () => clearInterval(timer)
  }, [deadline, isClient])

  // Prevent hydration mismatch by not rendering until mounted
  if (!isClient) {
    return (
      <div className={cn(
        'flex items-center justify-center gap-2',
        size === 'xs' && 'text-xs',
        size === 'sm' && 'text-sm',
        size === 'md' && 'text-base',
        className
      )} style={{ color: 'var(--text-muted)' }}>
        {showIcon && <Clock className={cn(
          size === 'xs' && 'w-3 h-3',
          size === 'sm' && 'w-3.5 h-3.5',
          size === 'md' && 'w-4 h-4'
        )} />}
        {label && <span>{label}</span>}
        <span>Loading...</span>
      </div>
    )
  }

  if (!timeLeft) {
    return (
      <span style={{ color: 'var(--text-muted)' }} className={cn(
        size === 'xs' && 'text-xs',
        size === 'sm' && 'text-sm',
        size === 'md' && 'text-base',
        className
      )}>
        Ending soon
      </span>
    )
  }

  return (
    <div className={cn(
      'flex items-center justify-center gap-2',
      size === 'xs' && 'text-xs',
      size === 'sm' && 'text-sm',
      size === 'md' && 'text-base',
      className
    )} style={{ color: 'var(--text-muted)' }}>
      {showIcon && <Clock className={cn(
        size === 'xs' && 'w-3 h-3',
        size === 'sm' && 'w-3.5 h-3.5',
        size === 'md' && 'w-4 h-4'
      )} />}
      {label && <span>{label}</span>}
      <div className="flex gap-1.5 items-center font-mono">
        {timeLeft.days > 0 && (
          <span className="font-medium" style={{ color: 'var(--text-primary)' }}>
            {timeLeft.days}d
          </span>
        )}
        <span className="font-medium" style={{ color: 'var(--text-primary)' }}>
          {String(timeLeft.hours).padStart(2, '0')}h
        </span>
        <span className="font-medium" style={{ color: 'var(--text-primary)' }}>
          {String(timeLeft.minutes).padStart(2, '0')}m
        </span>
        <span 
          className="font-medium animate-pulse"
          style={{ color: 'var(--text-primary)' }}
        >
          {String(timeLeft.seconds).padStart(2, '0')}s
        </span>
      </div>
    </div>
  )
}

