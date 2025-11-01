import * as React from 'react'
import { cn } from '@/lib/utils'

export interface SectionProps extends React.HTMLAttributes<HTMLElement> {
  variant?: 'default' | 'hero' | 'minimal'
  fullWidth?: boolean
}

export const Section = React.forwardRef<HTMLElement, SectionProps>(
  ({ className, variant = 'default', fullWidth = false, children, ...props }, ref) => {
    const variants = {
      default: 'py-8 md:py-12',
      hero: 'py-12 md:py-16',
      minimal: 'py-4 md:py-6',
    }

    return (
      <section
        ref={ref}
        className={cn(
          variants[variant],
          fullWidth ? 'w-full' : 'mx-auto max-w-7xl px-4 sm:px-6 lg:px-8',
          className
        )}
        {...props}
      >
        {children}
      </section>
    )
  }
)
Section.displayName = 'Section'

export interface ContainerProps extends React.HTMLAttributes<HTMLDivElement> {
  size?: 'sm' | 'md' | 'lg' | 'xl' | 'full'
}

export const Container = React.forwardRef<HTMLDivElement, ContainerProps>(
  ({ className, size = 'lg', children, ...props }, ref) => {
    const sizes = {
      sm: 'max-w-3xl',
      md: 'max-w-4xl',
      lg: 'max-w-7xl',
      xl: 'max-w-[90rem]',
      full: 'w-full',
    }

    return (
      <div
        ref={ref}
        className={cn('mx-auto px-4 sm:px-6 lg:px-8', sizes[size], className)}
        {...props}
      >
        {children}
      </div>
    )
  }
)
Container.displayName = 'Container'

