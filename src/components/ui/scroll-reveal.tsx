'use client'

import { ReactNode } from 'react'
import { useInView } from 'react-intersection-observer'
import { cn } from '@/lib/utils'

interface ScrollRevealProps {
  children: ReactNode
  className?: string
  delay?: number
  direction?: 'up' | 'down' | 'left' | 'right' | 'fade'
  threshold?: number
}

export function ScrollReveal({
  children,
  className,
  delay = 0,
  direction = 'up',
  threshold = 0.1,
}: ScrollRevealProps) {
  const { ref, inView } = useInView({
    threshold,
    triggerOnce: true,
  })

  const directionClasses = {
    up: 'translate-y-8',
    down: '-translate-y-8',
    left: 'translate-x-8',
    right: '-translate-x-8',
    fade: '',
  }

  return (
    <div
      ref={ref}
      className={cn(
        'transition-all duration-700 ease-out',
        inView
          ? 'opacity-100 translate-y-0 translate-x-0'
          : `opacity-0 ${directionClasses[direction]}`,
        className
      )}
      style={{ transitionDelay: `${delay}ms` }}
    >
      {children}
    </div>
  )
}

interface StaggerRevealProps {
  children: ReactNode
  className?: string
  staggerDelay?: number
  direction?: 'up' | 'down' | 'left' | 'right' | 'fade'
}

export function StaggerReveal({
  children,
  className,
  staggerDelay = 100,
  direction = 'up',
}: StaggerRevealProps) {
  const childrenArray = Array.isArray(children) ? children : [children]
  
  return (
    <div className={className}>
      {childrenArray.map((child, index) => (
        <ScrollReveal
          key={index}
          delay={index * staggerDelay}
          direction={direction}
        >
          {child}
        </ScrollReveal>
      ))}
    </div>
  )
}

