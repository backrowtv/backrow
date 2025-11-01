'use client'

import * as React from 'react'
import * as DialogPrimitive from '@radix-ui/react-dialog'
import { cn } from '@/lib/utils'

const ActionSheet = DialogPrimitive.Root

const ActionSheetTrigger = DialogPrimitive.Trigger

const ActionSheetPortal = DialogPrimitive.Portal

const ActionSheetClose = DialogPrimitive.Close

const ActionSheetOverlay = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Overlay>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Overlay>
>(({ className, ...props }, ref) => (
  <DialogPrimitive.Overlay
    ref={ref}
    className={cn(
      'fixed inset-0 z-[100]',
      'bg-black/60 backdrop-blur-sm',
      'data-[state=open]:animate-in data-[state=closed]:animate-out',
      'data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0',
      className
    )}
    {...props}
  />
))
ActionSheetOverlay.displayName = DialogPrimitive.Overlay.displayName

const ActionSheetContent = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Content> & {
    showHandle?: boolean
  }
>(({ className, children, showHandle = true, ...props }, ref) => (
  <ActionSheetPortal>
    <ActionSheetOverlay />
    <DialogPrimitive.Content
      ref={ref}
      className={cn(
        'fixed inset-x-0 bottom-0 z-[100]',
        'bg-[var(--background)]',
        'rounded-t-3xl',
        'border-t border-[var(--border)]',
        'shadow-2xl',
        'max-h-[85dvh]',
        'overflow-hidden',
        'data-[state=open]:animate-in data-[state=closed]:animate-out',
        'data-[state=closed]:slide-out-to-bottom data-[state=open]:slide-in-from-bottom',
        'data-[state=closed]:duration-200 data-[state=open]:duration-300',
        className
      )}
      {...props}
    >
      {showHandle && (
        <div className="flex justify-center py-3">
          <div className="w-10 h-1 rounded-full bg-[var(--border)]" />
        </div>
      )}
      {children}
    </DialogPrimitive.Content>
  </ActionSheetPortal>
))
ActionSheetContent.displayName = DialogPrimitive.Content.displayName

const ActionSheetHeader = ({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) => (
  <div
    className={cn(
      'px-5 pb-4',
      'border-b border-[var(--border)]',
      className
    )}
    {...props}
  />
)
ActionSheetHeader.displayName = 'ActionSheetHeader'

const ActionSheetTitle = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Title>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Title>
>(({ className, ...props }, ref) => (
  <DialogPrimitive.Title
    ref={ref}
    className={cn(
      'text-lg font-semibold text-[var(--text-primary)]',
      className
    )}
    {...props}
  />
))
ActionSheetTitle.displayName = DialogPrimitive.Title.displayName

const ActionSheetDescription = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Description>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Description>
>(({ className, ...props }, ref) => (
  <DialogPrimitive.Description
    ref={ref}
    className={cn(
      'text-sm text-[var(--text-muted)] mt-1',
      className
    )}
    {...props}
  />
))
ActionSheetDescription.displayName = DialogPrimitive.Description.displayName

const ActionSheetBody = ({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) => (
  <div
    className={cn(
      'px-3 py-2',
      'overflow-y-auto',
      'max-h-[60dvh]',
      className
    )}
    {...props}
  />
)
ActionSheetBody.displayName = 'ActionSheetBody'

const ActionSheetFooter = ({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) => (
  <div
    className={cn(
      'px-5 py-4',
      'border-t border-[var(--border)]',
      'safe-area-inset-bottom',
      className
    )}
    style={{
      paddingBottom: 'max(1rem, env(safe-area-inset-bottom))',
    }}
    {...props}
  />
)
ActionSheetFooter.displayName = 'ActionSheetFooter'

interface ActionSheetItemProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  /** Icon to show on the left */
  icon?: React.ReactNode
  /** Whether this is a destructive action */
  destructive?: boolean
}

const ActionSheetItem = React.forwardRef<HTMLButtonElement, ActionSheetItemProps>(
  ({ className, icon, destructive, children, ...props }, ref) => (
    <button
      ref={ref}
      className={cn(
        'flex items-center gap-3 w-full',
        'h-14 px-4 mx-2 my-0.5',
        'rounded-xl',
        'text-left font-medium',
        'transition-all duration-200',
        'active:scale-[0.98]',
        destructive
          ? 'text-[var(--error)] hover:bg-[var(--error)]/10'
          : 'text-[var(--text-primary)] hover:bg-[var(--surface-1)]',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)]',
        className
      )}
      {...props}
    >
      {icon && (
        <span className="flex-shrink-0 w-6 h-6 flex items-center justify-center">
          {icon}
        </span>
      )}
      <span className="flex-1">{children}</span>
    </button>
  )
)
ActionSheetItem.displayName = 'ActionSheetItem'

const ActionSheetSeparator = ({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) => (
  <div
    className={cn(
      'h-px mx-5 my-2',
      'bg-[var(--border)]',
      className
    )}
    {...props}
  />
)
ActionSheetSeparator.displayName = 'ActionSheetSeparator'

export {
  ActionSheet,
  ActionSheetTrigger,
  ActionSheetClose,
  ActionSheetContent,
  ActionSheetHeader,
  ActionSheetTitle,
  ActionSheetDescription,
  ActionSheetBody,
  ActionSheetFooter,
  ActionSheetItem,
  ActionSheetSeparator,
}






