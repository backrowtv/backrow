import * as React from 'react'
import { cn } from '@/lib/utils'

export interface MobileCardProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Whether the card has a press/tap effect */
  pressable?: boolean
  /** Additional variant styling */
  variant?: 'default' | 'outlined' | 'elevated'
}

/**
 * Mobile-optimized card component with Warby Parker-inspired clean design.
 * Features: 16px rounded corners, subtle border, generous padding, press feedback.
 */
const MobileCard = React.forwardRef<HTMLDivElement, MobileCardProps>(
  ({ className, pressable = false, variant = 'default', children, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn(
          // Base styles
          'rounded-2xl',
          'transition-all duration-200',
          
          // Variant styles
          variant === 'default' && [
            'bg-[var(--surface-1)]',
            'border border-[var(--border)]',
          ],
          variant === 'outlined' && [
            'bg-transparent',
            'border border-[var(--border)]',
          ],
          variant === 'elevated' && [
            'bg-[var(--surface-1)]',
            'shadow-lg shadow-black/10',
          ],
          
          // Pressable styles
          pressable && [
            'cursor-pointer',
            'active:scale-[0.98]',
            'active:opacity-90',
          ],
          
          className
        )}
        {...props}
      >
        {children}
      </div>
    )
  }
)
MobileCard.displayName = 'MobileCard'

export type MobileCardHeaderProps = React.HTMLAttributes<HTMLDivElement>

const MobileCardHeader = React.forwardRef<HTMLDivElement, MobileCardHeaderProps>(
  ({ className, ...props }, ref) => (
    <div
      ref={ref}
      className={cn('p-5 pb-0', className)}
      {...props}
    />
  )
)
MobileCardHeader.displayName = 'MobileCardHeader'

export type MobileCardContentProps = React.HTMLAttributes<HTMLDivElement>

const MobileCardContent = React.forwardRef<HTMLDivElement, MobileCardContentProps>(
  ({ className, ...props }, ref) => (
    <div
      ref={ref}
      className={cn('p-5', className)}
      {...props}
    />
  )
)
MobileCardContent.displayName = 'MobileCardContent'

export type MobileCardFooterProps = React.HTMLAttributes<HTMLDivElement>

const MobileCardFooter = React.forwardRef<HTMLDivElement, MobileCardFooterProps>(
  ({ className, ...props }, ref) => (
    <div
      ref={ref}
      className={cn(
        'p-5 pt-0',
        'border-t border-[var(--border)]',
        className
      )}
      {...props}
    />
  )
)
MobileCardFooter.displayName = 'MobileCardFooter'

export type MobileCardTitleProps = React.HTMLAttributes<HTMLHeadingElement>

const MobileCardTitle = React.forwardRef<HTMLHeadingElement, MobileCardTitleProps>(
  ({ className, ...props }, ref) => (
    <h3
      ref={ref}
      className={cn(
        'text-base font-semibold text-[var(--text-primary)]',
        className
      )}
      {...props}
    />
  )
)
MobileCardTitle.displayName = 'MobileCardTitle'

export type MobileCardDescriptionProps = React.HTMLAttributes<HTMLParagraphElement>

const MobileCardDescription = React.forwardRef<HTMLParagraphElement, MobileCardDescriptionProps>(
  ({ className, ...props }, ref) => (
    <p
      ref={ref}
      className={cn(
        'text-sm text-[var(--text-muted)]',
        className
      )}
      {...props}
    />
  )
)
MobileCardDescription.displayName = 'MobileCardDescription'

export { 
  MobileCard, 
  MobileCardHeader, 
  MobileCardContent, 
  MobileCardFooter,
  MobileCardTitle,
  MobileCardDescription
}






