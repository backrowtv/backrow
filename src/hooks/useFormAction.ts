'use client'

import { useActionState, useCallback, useState, useTransition } from 'react'

/**
 * Result type for server actions
 */
export type ActionResult<T = void> =
  | { success: true; data?: T }
  | { error: string; code?: string }

/**
 * Server action type
 */
export type ServerAction<T = void> = (
  prevState: ActionResult<T> | null,
  formData: FormData
) => Promise<ActionResult<T>>

/**
 * Hook for handling form submissions with server actions
 *
 * Provides a standardized interface for form handling including:
 * - Action state management
 * - Loading state via isPending
 * - Error and success state extraction
 * - Optional callback on success
 *
 * @example
 * ```tsx
 * const { state, formAction, isPending, error, isSuccess } = useFormAction(
 *   createClub,
 *   { onSuccess: (data) => router.push(`/club/${data.slug}`) }
 * )
 *
 * return (
 *   <form action={formAction}>
 *     <input name="name" />
 *     <button disabled={isPending}>
 *       {isPending ? 'Creating...' : 'Create Club'}
 *     </button>
 *     {error && <p className="text-red-500">{error}</p>}
 *   </form>
 * )
 * ```
 */
export function useFormAction<T = void>(
  action: ServerAction<T>,
  options?: {
    onSuccess?: (data?: T) => void
    onError?: (error: string) => void
  }
) {
  const [state, formAction, isPending] = useActionState<ActionResult<T> | null, FormData>(
    async (prevState, formData) => {
      const result = await action(prevState, formData)

      // Handle callbacks
      if ('success' in result && result.success) {
        options?.onSuccess?.((result as { success: true; data?: T }).data)
      } else if ('error' in result) {
        options?.onError?.(result.error)
      }

      return result
    },
    null
  )

  return {
    /** Current state of the action (null before first submission) */
    state,
    /** Form action to pass to form's action prop */
    formAction,
    /** Whether the action is currently executing */
    isPending,
    /** Error message if the action failed */
    error: state && 'error' in state ? state.error : null,
    /** Error code if provided */
    errorCode: state && 'error' in state ? state.code : null,
    /** Whether the action succeeded */
    isSuccess: state ? 'success' in state && state.success : false,
    /** Data returned on success */
    data: state && 'success' in state ? (state as { success: true; data?: T }).data : undefined,
  }
}

/**
 * Hook for handling non-form server actions with loading state
 *
 * Useful for buttons that trigger server actions without forms
 *
 * @example
 * ```tsx
 * const { execute, isPending, error, isSuccess } = useServerAction(deleteClub)
 *
 * return (
 *   <button onClick={() => execute(clubId)} disabled={isPending}>
 *     {isPending ? 'Deleting...' : 'Delete Club'}
 *   </button>
 * )
 * ```
 */
export function useServerAction<TArgs extends unknown[], TResult>(
  action: (...args: TArgs) => Promise<TResult>,
  options?: {
    onSuccess?: (result: TResult) => void
    onError?: (error: string) => void
  }
) {
  const [isPending, startTransition] = useTransition()
  const [state, setState] = useState<{
    result?: TResult
    error?: string
  } | null>(null)

  const execute = useCallback(
    (...args: TArgs) => {
      startTransition(async () => {
        try {
          const result = await action(...args)

          // Check if result has error property
          if (result && typeof result === 'object' && 'error' in result) {
            const error = (result as { error: string }).error
            options?.onError?.(error)
            setState({ error })
          } else {
            options?.onSuccess?.(result)
            setState({ result })
          }
        } catch (err) {
          const error = err instanceof Error ? err.message : 'An error occurred'
          options?.onError?.(error)
          setState({ error })
        }
      })
    },
    [action, options]
  )

  return {
    /** Execute the server action */
    execute,
    /** Whether the action is currently executing */
    isPending,
    /** Error message if the action failed */
    error: state?.error ?? null,
    /** Whether the action succeeded */
    isSuccess: state ? !state.error && state.result !== undefined : false,
    /** Result of the action */
    result: state?.result,
  }
}
