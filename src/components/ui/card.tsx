import * as React from 'react'
import { cn } from '@/lib/utils'

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  hover?: boolean
  interactive?: boolean
  variant?: 'default' | 'elevated' | 'outlined' | 'ghost'
}

const Card = React.forwardRef<HTMLDivElement, CardProps>(
  ({ className, hover = false, interactive = false, variant = 'default', ...props }, ref) => {
    const variants = {
      default: 'bg-[var(--background)] border border-[var(--border)]',
      elevated: 'bg-[var(--background)] border border-[var(--border)] shadow-[var(--shadow-md)]',
      outlined: 'bg-transparent border border-[var(--border)]',
      ghost: 'bg-transparent border-none',
    }
    
    return (
      <div
        ref={ref}
        className={cn(
          'rounded-lg transition-all duration-150',
          variants[variant],
          hover && [
            'hover:border-[var(--border-hover)]',
            'hover:shadow-[var(--shadow-md)]',
            'cursor-pointer',
          ],
          interactive && 'cursor-pointer',
          className
        )}
        {...props}
      >
        {props.children}
      </div>
    )
  }
)
Card.displayName = 'Card'

const CardHeader = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn(
      'flex flex-col gap-1.5 p-4',
      className
    )}
    {...props}
  />
))
CardHeader.displayName = 'CardHeader'

const CardTitle = React.forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLHeadingElement>
>(({ className, ...props }, ref) => (
  <h3
    ref={ref}
    className={cn(
      'text-base font-semibold text-[var(--text-primary)] leading-none tracking-tight',
      className
    )}
    {...props}
  />
))
CardTitle.displayName = 'CardTitle'

const CardDescription = React.forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLParagraphElement>
>(({ className, ...props }, ref) => (
  <p
    ref={ref}
    className={cn(
      'text-sm text-[var(--text-secondary)]',
      className
    )}
    {...props}
  />
))
CardDescription.displayName = 'CardDescription'

const CardContent = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn('p-4 pt-0', className)}
    {...props}
  />
))
CardContent.displayName = 'CardContent'

const CardFooter = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn(
      'flex items-center p-4 pt-0',
      className
    )}
    {...props}
  />
))
CardFooter.displayName = 'CardFooter'

export { Card, CardHeader, CardFooter, CardTitle, CardDescription, CardContent }
