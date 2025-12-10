'use client'

import { useState, useCallback } from 'react'

/**
 * Configuration for the confirm dialog
 */
export interface ConfirmDialogConfig {
  /** Title of the dialog */
  title?: string
  /** Description/message of the dialog */
  description?: string
  /** Text for the confirm button */
  confirmText?: string
  /** Text for the cancel button */
  cancelText?: string
  /** Whether the action is destructive (affects styling) */
  destructive?: boolean
}

/**
 * Hook for managing confirm dialogs with async actions
 *
 * Provides a standardized interface for confirmation dialogs including:
 * - Open/close state management
 * - Pending state during async actions
 * - Configurable dialog content
 * - Promise-based action handling
 *
 * @example
 * ```tsx
 * const {
 *   isOpen,
 *   config,
 *   isPending,
 *   open,
 *   close,
 *   confirm,
 * } = useConfirmDialog()
 *
 * const handleDelete = () => {
 *   open({
 *     title: 'Delete Club',
 *     description: 'Are you sure? This cannot be undone.',
 *     confirmText: 'Delete',
 *     destructive: true,
 *   })
 * }
 *
 * const handleConfirm = async () => {
 *   await confirm(async () => {
 *     await deleteClub(clubId)
 *     router.push('/clubs')
 *   })
 * }
 *
 * return (
 *   <>
 *     <button onClick={handleDelete}>Delete Club</button>
 *
 *     <AlertDialog open={isOpen} onOpenChange={close}>
 *       <AlertDialogContent>
 *         <AlertDialogHeader>
 *           <AlertDialogTitle>{config.title}</AlertDialogTitle>
 *           <AlertDialogDescription>{config.description}</AlertDialogDescription>
 *         </AlertDialogHeader>
 *         <AlertDialogFooter>
 *           <AlertDialogCancel disabled={isPending}>
 *             {config.cancelText}
 *           </AlertDialogCancel>
 *           <AlertDialogAction
 *             onClick={handleConfirm}
 *             disabled={isPending}
 *             className={config.destructive ? 'bg-destructive' : ''}
 *           >
 *             {isPending ? 'Loading...' : config.confirmText}
 *           </AlertDialogAction>
 *         </AlertDialogFooter>
 *       </AlertDialogContent>
 *     </AlertDialog>
 *   </>
 * )
 * ```
 */
export function useConfirmDialog(defaultConfig?: ConfirmDialogConfig) {
  const [isOpen, setIsOpen] = useState(false)
  const [isPending, setIsPending] = useState(false)
  const [config, setConfig] = useState<ConfirmDialogConfig>({
    title: defaultConfig?.title ?? 'Are you sure?',
    description: defaultConfig?.description ?? 'This action cannot be undone.',
    confirmText: defaultConfig?.confirmText ?? 'Confirm',
    cancelText: defaultConfig?.cancelText ?? 'Cancel',
    destructive: defaultConfig?.destructive ?? false,
  })

  /**
   * Open the dialog with optional custom configuration
   */
  const open = useCallback((customConfig?: ConfirmDialogConfig) => {
    if (customConfig) {
      setConfig(prev => ({
        ...prev,
        ...customConfig,
      }))
    }
    setIsOpen(true)
  }, [])

  /**
   * Close the dialog (only if not pending)
   */
  const close = useCallback(() => {
    if (!isPending) {
      setIsOpen(false)
    }
  }, [isPending])

  /**
   * Execute the confirm action
   * Handles loading state and closes dialog on success
   */
  const confirm = useCallback(async (action: () => Promise<void>) => {
    setIsPending(true)
    try {
      await action()
      setIsOpen(false)
    } finally {
      setIsPending(false)
    }
  }, [])

  /**
   * Reset the dialog to default state
   */
  const reset = useCallback(() => {
    setIsOpen(false)
    setIsPending(false)
    setConfig({
      title: defaultConfig?.title ?? 'Are you sure?',
      description: defaultConfig?.description ?? 'This action cannot be undone.',
      confirmText: defaultConfig?.confirmText ?? 'Confirm',
      cancelText: defaultConfig?.cancelText ?? 'Cancel',
      destructive: defaultConfig?.destructive ?? false,
    })
  }, [defaultConfig])

  return {
    /** Whether the dialog is open */
    isOpen,
    /** Whether an action is pending */
    isPending,
    /** Current dialog configuration */
    config,
    /** Open the dialog */
    open,
    /** Close the dialog */
    close,
    /** Execute the confirm action */
    confirm,
    /** Reset to default state */
    reset,
    /** Set dialog open state directly */
    setIsOpen,
  }
}

/**
 * Simple hook for delete confirmation dialogs
 *
 * Pre-configured for destructive actions
 *
 * @example
 * ```tsx
 * const deleteDialog = useDeleteConfirmDialog('club')
 *
 * // Opens dialog with "Delete club? This cannot be undone."
 * deleteDialog.open()
 *
 * // Custom message
 * deleteDialog.open({ description: 'This will remove all members.' })
 * ```
 */
export function useDeleteConfirmDialog(itemName: string = 'item') {
  return useConfirmDialog({
    title: `Delete ${itemName}?`,
    description: `This will permanently delete the ${itemName}. This action cannot be undone.`,
    confirmText: 'Delete',
    cancelText: 'Cancel',
    destructive: true,
  })
}
