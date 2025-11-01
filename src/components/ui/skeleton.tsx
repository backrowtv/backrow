import * as React from 'react'
import { cn } from '@/lib/utils'

export interface SkeletonProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'text' | 'circular' | 'rectangular'
  animation?: 'pulse' | 'wave' | 'none'
}

const Skeleton = React.forwardRef<HTMLDivElement, SkeletonProps>(
  (
    {
      className,
      variant = 'rectangular',
      animation = 'pulse',
      ...props
    },
    ref
  ) => {
    const variantClasses = {
      text: 'h-4 rounded',
      circular: 'rounded-full',
      rectangular: 'rounded-md',
    }
    
    const animationClasses = {
      pulse: 'skeleton', // Uses skeleton-pulse animation from globals.css
      wave: 'animate-shimmer',
      none: '',
    }
    
    return (
      <div
        ref={ref}
        className={cn(
          'bg-[var(--surface-1)]',
          variantClasses[variant],
          animationClasses[animation],
          'transition-opacity duration-200',
          className
        )}
        style={{
          animationDuration: animation === 'pulse' ? '2s' : undefined,
          animationTimingFunction: animation === 'pulse' ? 'var(--easing-smooth)' : undefined,
          opacity: animation === 'none' ? 1 : 0.7,
        }}
        {...props}
      />
    )
  }
)
Skeleton.displayName = 'Skeleton'

export { Skeleton }

