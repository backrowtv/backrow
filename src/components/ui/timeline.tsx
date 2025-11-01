'use client'

import { useScroll, useTransform, motion } from 'framer-motion'
import React, { useEffect, useRef, useState } from 'react'
import { cn } from '@/lib/utils'

export interface TimelineEntry {
  title: string
  content: React.ReactNode
}

interface TimelineProps {
  data: TimelineEntry[]
  className?: string
}

/**
 * Aceternity-style Timeline component with scroll beam animation
 */
export function Timeline({ data, className }: TimelineProps) {
  const ref = useRef<HTMLDivElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const [height, setHeight] = useState(0)

  useEffect(() => {
    if (ref.current) {
      const rect = ref.current.getBoundingClientRect()
      setHeight(rect.height)
    }
  }, [ref])

  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ['start 10%', 'end 50%'],
  })

  const heightTransform = useTransform(scrollYProgress, [0, 1], [0, height])
  const opacityTransform = useTransform(scrollYProgress, [0, 0.1], [0, 1])

  return (
    <div className={cn('w-full font-sans', className)} ref={containerRef}>
      <div ref={ref} className="relative pb-20">
        {data.map((item, index) => (
          <div key={index} className="flex justify-start pt-10 md:pt-40 md:gap-10">
            <div className="sticky flex flex-col md:flex-row z-40 items-center top-40 self-start max-w-xs lg:max-w-sm md:w-full">
              <div className="h-10 absolute left-3 md:left-3 w-10 rounded-full bg-[var(--surface-0)] flex items-center justify-center">
                <div className="h-4 w-4 rounded-full bg-[var(--surface-2)] border border-[var(--border)] p-2" />
              </div>
              <h3 className="hidden md:block text-xl md:pl-20 md:text-5xl font-bold text-[var(--text-muted)]">
                {item.title}
              </h3>
            </div>

            <div className="relative pl-20 pr-4 md:pl-4 w-full">
              <h3 className="md:hidden block text-2xl mb-4 text-left font-bold text-[var(--text-muted)]">
                {item.title}
              </h3>
              {item.content}
            </div>
          </div>
        ))}
        <div
          style={{ height: height + 'px' }}
          className="absolute md:left-8 left-8 top-0 overflow-hidden w-[2px] bg-[linear-gradient(to_bottom,var(--tw-gradient-stops))] from-transparent from-[0%] via-[var(--border)] to-transparent to-[99%] [mask-image:linear-gradient(to_bottom,transparent_0%,black_10%,black_90%,transparent_100%)]"
        >
          <motion.div
            style={{
              height: heightTransform,
              opacity: opacityTransform,
            }}
            className="absolute inset-x-0 top-0 w-[2px] bg-gradient-to-t from-[var(--primary)] via-[var(--primary)] to-transparent from-[0%] via-[10%] rounded-full"
          />
        </div>
      </div>
    </div>
  )
}

/**
 * Reusable scroll beam component for custom timeline implementations
 * Use this when you need just the beam animation without the full Timeline structure
 */
interface TimelineBeamProps {
  containerRef: React.RefObject<HTMLDivElement | null>
  className?: string
}

export function TimelineBeam({ containerRef, className }: TimelineBeamProps) {
  const [height, setHeight] = useState(0)

  useEffect(() => {
    if (containerRef.current) {
      const resizeObserver = new ResizeObserver((entries) => {
        for (const entry of entries) {
          setHeight(entry.contentRect.height)
        }
      })
      resizeObserver.observe(containerRef.current)
      return () => resizeObserver.disconnect()
    }
  }, [containerRef])

  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ['start start', 'end end'],
  })

  const heightTransform = useTransform(scrollYProgress, [0, 1], [0, height])
  const opacityTransform = useTransform(scrollYProgress, [0, 0.1], [0, 1])

  return (
    <div
      style={{ height: height + 'px' }}
      className={cn(
        'absolute left-[19px] top-0 overflow-hidden w-[2px]',
        'bg-[linear-gradient(to_bottom,var(--tw-gradient-stops))] from-transparent from-[0%] via-[var(--border)] to-transparent to-[99%]',
        '[mask-image:linear-gradient(to_bottom,transparent_0%,black_10%,black_90%,transparent_100%)]',
        className
      )}
    >
      <motion.div
        style={{
          height: heightTransform,
          opacity: opacityTransform,
        }}
        className="absolute inset-x-0 top-0 w-[2px] bg-gradient-to-t from-[var(--primary)] via-[var(--primary)] to-transparent from-[0%] via-[10%] rounded-full"
      />
    </div>
  )
}

/**
 * Timeline container that provides scroll context for the beam
 */
interface TimelineContainerProps {
  children: React.ReactNode
  className?: string
  showBeam?: boolean
}

export function TimelineScrollContainer({
  children,
  className,
  showBeam = true
}: TimelineContainerProps) {
  const containerRef = useRef<HTMLDivElement>(null)

  return (
    <div ref={containerRef} className={cn('relative', className)}>
      {showBeam && <TimelineBeam containerRef={containerRef} />}
      {children}
    </div>
  )
}

/**
 * Sticky header component for timeline sections
 */
interface TimelineStickyHeaderProps {
  children: React.ReactNode
  className?: string
}

export function TimelineStickyHeader({ children, className }: TimelineStickyHeaderProps) {
  return (
    <div
      className={cn(
        'sticky top-0 z-10',
        'backdrop-blur-md bg-[var(--surface-0)]/80',
        'border-b border-[var(--border)]/50',
        className
      )}
    >
      {children}
    </div>
  )
}

/**
 * Enhanced timeline dot with glow effect
 */
interface TimelineDotProps {
  isUrgent?: boolean
  isPast?: boolean
  className?: string
}

export function TimelineDot({ isUrgent, isPast, className }: TimelineDotProps) {
  return (
    <div className="relative flex items-center justify-center w-10 h-10">
      {/* Glow effect for non-past items */}
      {!isPast && (
        <div
          className={cn(
            'absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-4 h-4 rounded-full blur-sm opacity-50',
            isUrgent ? 'bg-[var(--destructive)]' : 'bg-[var(--primary)]'
          )}
        />
      )}
      {/* Main dot */}
      <div
        className={cn(
          'absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-3 h-3 rounded-full z-10 transition-transform',
          isPast
            ? 'bg-[var(--text-muted)]'
            : isUrgent
              ? 'bg-[var(--destructive)] animate-pulse'
              : 'bg-[var(--primary)]',
          className
        )}
      />
    </div>
  )
}
