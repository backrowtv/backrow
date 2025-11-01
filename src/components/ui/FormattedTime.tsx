'use client'

import { useTimeFormat } from '@/contexts/DisplayPreferencesContext'

interface FormattedTimeProps {
  date: Date | string
  className?: string
}

export function FormattedTime({ date, className }: FormattedTimeProps) {
  const { formatTime } = useTimeFormat()
  const dateObj = typeof date === 'string' ? new Date(date) : date
  
  return <span className={className}>{formatTime(dateObj)}</span>
}
