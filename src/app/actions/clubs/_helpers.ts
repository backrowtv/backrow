/**
 * Shared helpers for club actions
 *
 * Internal utilities used across club action modules.
 * Not exported from the main index.
 */

import type { SupabaseClient, User } from '@supabase/supabase-js'

// Re-export centralized file validation for backwards compatibility
export { validateFileUpload, getAllowedTypesString, getMaxFileSizeString } from '@/lib/validation/file-upload'

/**
 * Error thrown when authentication is required but user is not signed in
 */
export class AuthError extends Error {
  constructor(message: string = 'You must be signed in') {
    super(message)
    this.name = 'AuthError'
  }
}

/**
 * Error thrown when user lacks required permissions
 */
export class PermissionError extends Error {
  constructor(message: string = 'You do not have permission to perform this action') {
    super(message)
    this.name = 'PermissionError'
  }
}

/**
 * Require authenticated user - throws AuthError if not signed in
 *
 * @throws {AuthError} If user is not authenticated
 * @returns The authenticated user
 */
export async function requireAuth(supabase: SupabaseClient): Promise<User> {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    throw new AuthError()
  }
  return user
}

/**
 * Safe version of requireAuth that returns an error result instead of throwing
 * Useful for server actions that need to return error states
 */
export async function requireAuthSafe(
  supabase: SupabaseClient
): Promise<{ user: User; error: null } | { user: null; error: string }> {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return { user: null, error: 'You must be signed in' }
  }
  return { user, error: null }
}

/**
 * Require user to be an admin (producer or director) of a club
 *
 * @throws {AuthError} If user is not authenticated
 * @throws {PermissionError} If user is not an admin of the club
 * @returns The user and their role
 */
export async function requireClubAdmin(
  supabase: SupabaseClient,
  clubId: string
): Promise<{ user: User; role: 'producer' | 'director' }> {
  const user = await requireAuth(supabase)
  const { isAdmin, role } = await checkAdminPermission(supabase, clubId, user.id)

  if (!isAdmin || !role) {
    throw new PermissionError('You must be a producer or director of this club')
  }

  return { user, role: role as 'producer' | 'director' }
}

/**
 * Require user to be the producer (owner) of a club
 *
 * @throws {AuthError} If user is not authenticated
 * @throws {PermissionError} If user is not the producer
 */
export async function requireClubProducer(
  supabase: SupabaseClient,
  clubId: string
): Promise<User> {
  const user = await requireAuth(supabase)
  const isProducer = await checkProducerPermission(supabase, clubId, user.id)

  if (!isProducer) {
    throw new PermissionError('You must be the producer of this club')
  }

  return user
}

/**
 * Require user to be a member of a club
 *
 * @throws {AuthError} If user is not authenticated
 * @throws {PermissionError} If user is not a member
 * @returns The user and their role
 */
export async function requireClubMember(
  supabase: SupabaseClient,
  clubId: string
): Promise<{ user: User; role: string }> {
  const user = await requireAuth(supabase)
  const { isMember, role } = await checkMembership(supabase, clubId, user.id)

  if (!isMember || !role) {
    throw new PermissionError('You must be a member of this club')
  }

  return { user, role }
}

/**
 * Get club slug from club ID
 */
export async function getClubSlug(
  supabase: SupabaseClient,
  clubId: string
): Promise<string> {
  const { data: club } = await supabase
    .from('clubs')
    .select('slug')
    .eq('id', clubId)
    .maybeSingle()
  return club?.slug || clubId
}

/**
 * Generate URL-safe slug from text
 */
export function generateClubSlug(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, '') // Remove special characters
    .replace(/\s+/g, '-') // Replace spaces with hyphens
    .replace(/-+/g, '-') // Replace multiple hyphens with single
    .replace(/^-|-$/g, '') // Remove leading/trailing hyphens
}

/**
 * Check if user is an admin (producer or director) of a club
 */
export async function checkAdminPermission(
  supabase: SupabaseClient,
  clubId: string,
  userId: string
): Promise<{ isAdmin: boolean; role: string | null }> {
  const { data: membership } = await supabase
    .from('club_members')
    .select('role')
    .eq('club_id', clubId)
    .eq('user_id', userId)
    .maybeSingle()

  if (!membership) {
    return { isAdmin: false, role: null }
  }

  const isAdmin = membership.role === 'producer' || membership.role === 'director'
  return { isAdmin, role: membership.role }
}

/**
 * Check if user is the producer (owner) of a club
 */
export async function checkProducerPermission(
  supabase: SupabaseClient,
  clubId: string,
  userId: string
): Promise<boolean> {
  const { data: membership } = await supabase
    .from('club_members')
    .select('role')
    .eq('club_id', clubId)
    .eq('user_id', userId)
    .maybeSingle()

  return membership?.role === 'producer'
}

/**
 * Check if user is a member of a club
 */
export async function checkMembership(
  supabase: SupabaseClient,
  clubId: string,
  userId: string
): Promise<{ isMember: boolean; role: string | null }> {
  const { data: membership } = await supabase
    .from('club_members')
    .select('role')
    .eq('club_id', clubId)
    .eq('user_id', userId)
    .maybeSingle()

  if (!membership) {
    return { isMember: false, role: null }
  }

  return { isMember: true, role: membership.role }
}

/**
 * Validate file upload for images
 * @deprecated Use validateFileUpload from '@/lib/validation/file-upload' instead
 */
export async function validateImageUpload(
  file: File,
  maxSizeMB: number = 5
): Promise<{ valid: true } | { valid: false; error: string }> {
  // Import and use the centralized validation
  const { validateFileUpload } = await import('@/lib/validation/file-upload')
  const result = validateFileUpload(file, maxSizeMB <= 5 ? 'background' : 'club')
  return result.valid ? { valid: true } : { valid: false, error: result.error || 'Invalid file' }
}

/**
 * Extract filename from Supabase storage URL
 */
export function extractStorageFilename(url: string, bucket: string): string | null {
  const urlParts = url.split('/')
  const bucketIndex = urlParts.findIndex((part: string) => part === bucket)
  if (bucketIndex !== -1 && urlParts[bucketIndex + 1]) {
    return urlParts[bucketIndex + 1]
  }
  return null
}

