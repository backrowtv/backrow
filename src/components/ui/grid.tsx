import * as React from 'react'
import { cn } from '@/lib/utils'

export interface GridProps extends React.HTMLAttributes<HTMLDivElement> {
  cols?: 1 | 2 | 3 | 4 | 6
  gap?: 'sm' | 'md' | 'lg' | 'xl'
}

export const Grid = React.forwardRef<HTMLDivElement, GridProps>(
  ({ className, cols = 3, gap = 'md', children, ...props }, ref) => {
    const colClasses = {
      1: 'grid-cols-1',
      2: 'grid-cols-1 md:grid-cols-2',
      3: 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3',
      4: 'grid-cols-1 md:grid-cols-2 lg:grid-cols-4',
      6: 'grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6',
    }

    const gapClasses = {
      sm: 'gap-4',
      md: 'gap-6 md:gap-8',
      lg: 'gap-8 md:gap-12',
      xl: 'gap-12 md:gap-16',
    }

    return (
      <div
        ref={ref}
        className={cn('grid', colClasses[cols], gapClasses[gap], className)}
        {...props}
      >
        {children}
      </div>
    )
  }
)
Grid.displayName = 'Grid'

