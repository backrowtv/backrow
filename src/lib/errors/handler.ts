/**
 * Centralized Error Handling for Server Actions
 *
 * Provides standardized error handling utilities to replace 271+ scattered
 * console.error calls with consistent, traceable error logging.
 *
 * @example
 * // Before (inconsistent error handling):
 * catch (error) {
 *   console.error('Error creating club:', error)
 *   return { error: 'Failed to create club' }
 * }
 *
 * // After (standardized):
 * catch (error) {
 *   return handleActionError(error, 'createClub')
 * }
 */

// Standard action result types
export type ActionSuccessWithData<T> = { success: true; data: T }
export type ActionSuccessVoid = { success: true }
export type ActionSuccess<T = void> = T extends void
  ? ActionSuccessVoid
  : ActionSuccessWithData<T>

export type ActionFailure = { error: string; code?: string }

export type ActionResult<T = void> = ActionSuccess<T> | ActionFailure

/**
 * Error context for tracking and debugging
 */
interface ErrorContext {
  /** The action or function name where the error occurred */
  action: string
  /** Optional additional metadata for debugging */
  metadata?: Record<string, unknown>
  /** Whether to suppress console logging (useful for expected errors) */
  silent?: boolean
}

/**
 * Handles errors in server actions with consistent logging and response format.
 *
 * @param error - The caught error (unknown type for try/catch compatibility)
 * @param context - Error context (string for simple case, object for detailed)
 * @returns Standardized error response object
 *
 * @example
 * // Simple usage
 * catch (error) {
 *   return handleActionError(error, 'createClub')
 * }
 *
 * // With metadata
 * catch (error) {
 *   return handleActionError(error, {
 *     action: 'updateFestival',
 *     metadata: { festivalId, phase }
 *   })
 * }
 */
export function handleActionError(
  error: unknown,
  context: string | ErrorContext
): ActionFailure {
  const ctx = typeof context === 'string' ? { action: context } : context
  const message = extractErrorMessage(error)

  if (!ctx.silent) {
    const logPrefix = `[${ctx.action}]`
    if (ctx.metadata) {
      console.error(logPrefix, message, ctx.metadata)
    } else {
      console.error(logPrefix, message)
    }
  }

  // In the future, this is where you'd send to error tracking (Sentry, etc.)
  // trackError(error, ctx)

  return { error: message }
}

/**
 * Creates a standardized error response without logging.
 * Use for validation errors or expected error conditions.
 *
 * @param message - The error message to return
 * @param code - Optional error code for client-side handling
 * @returns Standardized error response object
 *
 * @example
 * if (!name || name.length < 3) {
 *   return createError('Name must be at least 3 characters', 'VALIDATION_ERROR')
 * }
 */
export function createError(message: string, code?: string): ActionFailure {
  return code ? { error: message, code } : { error: message }
}

/**
 * Creates a standardized success response.
 *
 * @param data - Optional data to include in response
 * @returns Standardized success response object
 *
 * @example
 * // Without data
 * return createSuccess()
 * // Returns: { success: true }
 *
 * // With data
 * return createSuccess({ id: newClub.id, slug: newClub.slug })
 * // Returns: { success: true, data: { id: '...', slug: '...' } }
 */
export function createSuccess(): ActionSuccessVoid
export function createSuccess<T>(data: T): ActionSuccessWithData<T>
export function createSuccess<T>(data?: T): ActionSuccessVoid | ActionSuccessWithData<T> {
  if (data === undefined) {
    return { success: true }
  }
  return { success: true, data }
}

/**
 * Extracts a user-friendly message from an unknown error.
 *
 * @param error - The error to extract message from
 * @returns A string message suitable for display
 */
export function extractErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message
  }
  if (typeof error === 'string') {
    return error
  }
  if (error && typeof error === 'object' && 'message' in error) {
    return String((error as { message: unknown }).message)
  }
  return 'An unexpected error occurred'
}

/**
 * Type guard to check if a result is an error
 *
 * @param result - The action result to check
 * @returns True if the result is an error
 *
 * @example
 * const result = await createClub(formData)
 * if (isActionError(result)) {
 *   toast.error(result.error)
 *   return
 * }
 * // result is now typed as success
 */
export function isActionError(result: ActionResult<unknown>): result is ActionFailure {
  return 'error' in result
}

/**
 * Type guard to check if a result is successful
 *
 * @param result - The action result to check
 * @returns True if the result is successful
 */
export function isActionSuccess<T>(result: ActionResult<T>): result is ActionSuccess<T> {
  return 'success' in result && result.success === true
}

/**
 * Common error messages for consistent user-facing errors
 */
export const ErrorMessages = {
  // Authentication
  NOT_AUTHENTICATED: 'You must be signed in',
  SESSION_EXPIRED: 'Your session has expired. Please sign in again.',

  // Authorization
  NOT_AUTHORIZED: 'You do not have permission to perform this action',
  NOT_CLUB_MEMBER: 'You must be a member of this club',
  NOT_CLUB_OWNER: 'Only the club owner can perform this action',
  NOT_PRODUCER: 'Only producers can perform this action',
  NOT_DIRECTOR_OR_ABOVE: 'Only directors and producers can perform this action',

  // Validation
  INVALID_INPUT: 'Invalid input provided',
  REQUIRED_FIELD: (field: string) => `${field} is required`,
  MIN_LENGTH: (field: string, min: number) => `${field} must be at least ${min} characters`,
  MAX_LENGTH: (field: string, max: number) => `${field} must be at most ${max} characters`,

  // Resources
  NOT_FOUND: (resource: string) => `${resource} not found`,
  ALREADY_EXISTS: (resource: string) => `${resource} already exists`,

  // Operations
  OPERATION_FAILED: 'Operation failed. Please try again.',
  NETWORK_ERROR: 'Network error. Please check your connection.',

  // Database
  DATABASE_ERROR: 'A database error occurred',
} as const

/**
 * Error codes for programmatic error handling
 */
export const ErrorCodes = {
  // Authentication & Authorization
  AUTH_REQUIRED: 'AUTH_REQUIRED',
  AUTH_EXPIRED: 'AUTH_EXPIRED',
  FORBIDDEN: 'FORBIDDEN',

  // Validation
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  INVALID_INPUT: 'INVALID_INPUT',

  // Resources
  NOT_FOUND: 'NOT_FOUND',
  CONFLICT: 'CONFLICT',

  // Server
  INTERNAL_ERROR: 'INTERNAL_ERROR',
  DATABASE_ERROR: 'DATABASE_ERROR',
} as const
