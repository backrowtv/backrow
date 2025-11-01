/**
 * Auth Middleware for Server Actions
 *
 * Provides authentication wrappers for server actions to eliminate
 * repetitive auth boilerplate code across 215+ action functions.
 *
 * @example
 * // Before (repetitive pattern in every action):
 * export async function createItem(formData: FormData) {
 *   const supabase = await createClient()
 *   const { data: { user } } = await supabase.auth.getUser()
 *   if (!user) return { error: 'You must be signed in' }
 *   // ... implementation
 * }
 *
 * // After (using withAuth):
 * export const createItem = withAuth(async (user, supabase, formData: FormData) => {
 *   // ... implementation (user and supabase are guaranteed)
 * })
 */

import { User } from '@supabase/supabase-js'
import { createClient } from '@/lib/supabase/server'
import type { SupabaseClient } from '@supabase/supabase-js'

// Standard error response type for actions
export type ActionError = { error: string }

// Type for the authenticated action function
type AuthenticatedAction<TArgs extends unknown[], TResult> = (
  user: User,
  supabase: SupabaseClient,
  ...args: TArgs
) => Promise<TResult>

/**
 * Wraps a server action with authentication check.
 * Automatically handles Supabase client creation and user verification.
 *
 * @param action - The authenticated action function that receives user and supabase client
 * @returns A wrapped function that can be used as a server action
 *
 * @example
 * export const updateProfile = withAuth(async (user, supabase, formData: FormData) => {
 *   const name = formData.get('name') as string
 *   const { error } = await supabase
 *     .from('users')
 *     .update({ display_name: name })
 *     .eq('id', user.id)
 *   if (error) return { error: error.message }
 *   return { success: true }
 * })
 */
export function withAuth<TArgs extends unknown[], TResult>(
  action: AuthenticatedAction<TArgs, TResult>
): (...args: TArgs) => Promise<TResult | ActionError> {
  return async (...args: TArgs): Promise<TResult | ActionError> => {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return { error: 'You must be signed in' }
    }

    return action(user, supabase, ...args)
  }
}

/**
 * Wraps a server action with authentication check for form actions using useActionState.
 * The first argument (prevState) is handled automatically.
 *
 * @param action - The authenticated action function that receives user, supabase, and form data
 * @returns A wrapped function compatible with useActionState
 *
 * @example
 * export const createClub = withAuthFormAction(async (user, supabase, formData: FormData) => {
 *   const name = formData.get('name') as string
 *   // ... implementation
 *   return { success: true }
 * })
 *
 * // In component:
 * const [state, formAction, isPending] = useActionState(createClub, null)
 */
export function withAuthFormAction<TResult>(
  action: (user: User, supabase: SupabaseClient, formData: FormData) => Promise<TResult>
): (prevState: unknown, formData: FormData) => Promise<TResult | ActionError> {
  return async (_prevState: unknown, formData: FormData): Promise<TResult | ActionError> => {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return { error: 'You must be signed in' }
    }

    return action(user, supabase, formData)
  }
}

/**
 * Wraps a server action that requires both authentication and ensureUser.
 * Use this when the action needs to ensure the user exists in the public.users table.
 *
 * @param action - The authenticated action function
 * @returns A wrapped function that ensures user exists before executing
 *
 * @example
 * export const createClub = withAuthAndEnsureUser(async (user, supabase, formData) => {
 *   // User is guaranteed to exist in public.users table
 *   const { error } = await supabase.from('clubs').insert({ ... })
 *   return { success: !error }
 * })
 */
export function withAuthAndEnsureUser<TArgs extends unknown[], TResult>(
  action: AuthenticatedAction<TArgs, TResult>,
  ensureUserFn: (supabase: SupabaseClient, userId: string, email: string) => Promise<void>
): (...args: TArgs) => Promise<TResult | ActionError> {
  return async (...args: TArgs): Promise<TResult | ActionError> => {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return { error: 'You must be signed in' }
    }

    try {
      await ensureUserFn(supabase, user.id, user.email || '')
    } catch (error) {
      return {
        error: error instanceof Error ? error.message : 'Failed to load user profile',
      }
    }

    return action(user, supabase, ...args)
  }
}

/**
 * Creates a pre-configured withAuth that includes ensureUser.
 * Import ensureUser and create the configured version once.
 *
 * @example
 * // In your actions file:
 * import { ensureUser } from '@/lib/users/ensureUser'
 * const withAuthUser = createWithAuthAndEnsureUser(ensureUser)
 *
 * export const myAction = withAuthUser(async (user, supabase, data) => {
 *   // ...
 * })
 */
export function createWithAuthAndEnsureUser(
  ensureUserFn: (supabase: SupabaseClient, userId: string, email: string) => Promise<void>
) {
  return <TArgs extends unknown[], TResult>(action: AuthenticatedAction<TArgs, TResult>) =>
    withAuthAndEnsureUser(action, ensureUserFn)
}
