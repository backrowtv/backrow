'use client'

import { useEffect, useState } from 'react'
import { Clock } from '@phosphor-icons/react'
import { cn } from '@/lib/utils'

const URGENT_THRESHOLD_MS = 48 * 60 * 60 * 1000 // 48 hours

interface UrgentIndicatorProps {
  date: string
  className?: string
}

// Only renders clock icon if date is within 48 hours
export function UrgentIndicator({ date, className }: UrgentIndicatorProps) {
  const [isUrgent, setIsUrgent] = useState(false)
  
  useEffect(() => {
    const checkUrgent = () => {
      const targetDate = new Date(date).getTime()
      const now = Date.now()
      setIsUrgent(targetDate - now < URGENT_THRESHOLD_MS)
    }
    
    checkUrgent()
    const interval = setInterval(checkUrgent, 60000) // Check every minute
    
    return () => clearInterval(interval)
  }, [date])
  
  // Only show icon for urgent items (<48 hours)
  if (!isUrgent) {
    return null
  }
  
  return (
    <Clock className={cn(
      'h-3.5 w-3.5 flex-shrink-0 text-[var(--destructive)]',
      className
    )} />
  )
}

export function UrgentText({ date, children, className }: { 
  date: string
  children: React.ReactNode
  className?: string 
}) {
  const [isUrgent, setIsUrgent] = useState(false)
  
  useEffect(() => {
    const checkUrgent = () => {
      const targetDate = new Date(date).getTime()
      const now = Date.now()
      setIsUrgent(targetDate - now < URGENT_THRESHOLD_MS)
    }
    
    checkUrgent()
    const interval = setInterval(checkUrgent, 60000)
    
    return () => clearInterval(interval)
  }, [date])
  
  return (
    <span className={cn(
      'flex-shrink-0',
      isUrgent 
        ? 'text-xs text-[var(--destructive)] font-semibold' 
        : 'text-[10px] text-[var(--text-muted)]',
      className
    )}>
      {children}
    </span>
  )
}

