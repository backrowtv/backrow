'use client'

import * as React from 'react'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { cn } from '@/lib/utils'
import { CircleNotch } from '@phosphor-icons/react'

export interface ConfirmationDialogProps {
  /** Whether the dialog is open */
  open: boolean
  /** Callback when the dialog open state changes */
  onOpenChange: (open: boolean) => void
  /** Dialog title */
  title: string
  /** Dialog description/message */
  description: React.ReactNode
  /** Text for the confirm button */
  confirmText?: string
  /** Text for the cancel button */
  cancelText?: string
  /** Callback when confirm is clicked */
  onConfirm: () => void | Promise<void>
  /** Visual variant - 'danger' shows red confirm button, 'warning' shows yellow */
  variant?: 'default' | 'danger' | 'warning'
  /** Whether the confirm action is in progress */
  isLoading?: boolean
  /** Whether to disable the confirm button */
  disabled?: boolean
}

/**
 * A reusable confirmation dialog component that wraps AlertDialog
 * with consistent styling for the BackRow design system.
 * 
 * Use this instead of native browser confirm() dialogs.
 * 
 * @example
 * ```tsx
 * <ConfirmationDialog
 *   open={showConfirm}
 *   onOpenChange={setShowConfirm}
 *   title="Delete Club?"
 *   description="This action cannot be undone. The club will be permanently deleted."
 *   confirmText="Delete"
 *   onConfirm={handleDelete}
 *   variant="danger"
 *   isLoading={isPending}
 * />
 * ```
 */
export function ConfirmationDialog({
  open,
  onOpenChange,
  title,
  description,
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  onConfirm,
  variant = 'default',
  isLoading = false,
  disabled = false,
}: ConfirmationDialogProps) {
  const handleConfirm = async (e: React.MouseEvent) => {
    e.preventDefault()
    await onConfirm()
  }

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{title}</AlertDialogTitle>
          <AlertDialogDescription asChild>
            <div>{description}</div>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isLoading}>
            {cancelText}
          </AlertDialogCancel>
          <AlertDialogAction
            onClick={handleConfirm}
            disabled={isLoading || disabled}
            className={cn(
              variant === 'danger' && 'bg-[var(--error)] hover:bg-[var(--error)]/90 focus-visible:ring-[var(--error)]',
              variant === 'warning' && 'bg-[var(--warning)] hover:bg-[var(--warning)]/90 focus-visible:ring-[var(--warning)] text-black'
            )}
          >
            {isLoading && <CircleNotch className="h-4 w-4 animate-spin" />}
            {confirmText}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}

