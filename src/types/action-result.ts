/**
 * Unified result types for server actions
 * 
 * All server actions should return one of these types for consistency.
 * This enables type-safe error handling across the application.
 */

/**
 * Base success result with optional data
 */
export type ActionSuccess<T = void> = T extends void
  ? { success: true }
  : { success: true; data: T }

/**
 * Error result with message and optional error code
 */
export interface ActionError {
  success: false
  error: string
  code?: ActionErrorCode
  /** Field-level validation errors */
  fieldErrors?: Record<string, string>
}

/**
 * Combined action result type
 */
export type ActionResult<T = void> = ActionSuccess<T> | ActionError

/**
 * Standard error codes for categorizing errors
 */
export type ActionErrorCode =
  | 'UNAUTHORIZED'      // User not authenticated
  | 'FORBIDDEN'         // User lacks permission
  | 'NOT_FOUND'         // Resource not found
  | 'VALIDATION_ERROR'  // Input validation failed
  | 'CONFLICT'          // Resource already exists
  | 'RATE_LIMITED'      // Too many requests
  | 'DATABASE_ERROR'    // Database operation failed
  | 'EXTERNAL_ERROR'    // External API failed
  | 'UNKNOWN_ERROR'     // Unexpected error

/**
 * Helper to create success result
 */
export function success(): ActionSuccess<void>
export function success<T>(data: T): ActionSuccess<T>
export function success<T>(data?: T): ActionSuccess<T> | ActionSuccess<void> {
  if (data === undefined) {
    return { success: true } as ActionSuccess<void>
  }
  return { success: true, data } as ActionSuccess<T>
}

/**
 * Helper to create error result
 */
export function failure(
  error: string,
  code?: ActionErrorCode,
  fieldErrors?: Record<string, string>
): ActionError {
  return {
    success: false,
    error,
    ...(code && { code }),
    ...(fieldErrors && { fieldErrors }),
  }
}

/**
 * Type guard to check if result is success
 */
export function isSuccess<T>(result: ActionResult<T>): result is ActionSuccess<T> {
  return result.success === true
}

/**
 * Type guard to check if result is error
 */
export function isError<T>(result: ActionResult<T>): result is ActionError {
  return result.success === false
}

/**
 * Map Supabase error codes to ActionErrorCode
 */
export function mapSupabaseError(code: string | undefined): ActionErrorCode {
  switch (code) {
    case 'PGRST116': // Row not found
      return 'NOT_FOUND'
    case '23505': // Unique violation
      return 'CONFLICT'
    case '42501': // Insufficient privilege
      return 'FORBIDDEN'
    case '23503': // Foreign key violation
      return 'VALIDATION_ERROR'
    default:
      return 'DATABASE_ERROR'
  }
}

// Re-export for convenience
export type { ActionSuccess as Success, ActionError as Error }

