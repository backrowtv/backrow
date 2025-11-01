'use client'

import { useEffect, useState } from 'react'
import { cn } from '@/lib/utils'

interface AnimatedTextProps {
  text: string
  className?: string
  delay?: number
  speed?: number
  onComplete?: () => void
}

// Typewriter effect
export function TypewriterText({ text, className, delay = 0, speed = 50, onComplete }: AnimatedTextProps) {
  const [displayedText, setDisplayedText] = useState('')
  const [currentIndex, setCurrentIndex] = useState(0)

  useEffect(() => {
    if (currentIndex < text.length) {
      const timer = setTimeout(() => {
        setDisplayedText(text.slice(0, currentIndex + 1))
        setCurrentIndex(currentIndex + 1)
      }, delay + speed * currentIndex)

      return () => clearTimeout(timer)
    } else if (onComplete && currentIndex === text.length) {
      onComplete()
    }
  }, [currentIndex, text, delay, speed, onComplete])

  return <span className={className}>{displayedText}</span>
}

interface FadeInTextProps {
  children: React.ReactNode
  className?: string
  delay?: number
  duration?: number
}

// Fade in text with stagger
export function FadeInText({ children, className, delay = 0, duration = 1000 }: FadeInTextProps) {
  return (
    <span
      className={cn('opacity-0 animate-fade-in', className)}
      style={{ animationDelay: `${delay}ms`, animationDuration: `${duration}ms`, animationFillMode: 'forwards' }}
    >
      {children}
    </span>
  )
}


