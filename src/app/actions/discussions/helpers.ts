import { createClient } from '@/lib/supabase/server'

/**
 * Generate a URL-friendly slug from a title
 * @param title - The title to slugify
 * @returns A slug string (max 50 chars)
 */
export function generateSlug(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .substring(0, 50)
}

/**
 * Ensure slug is unique within a club by appending numeric suffix if needed
 */
export async function ensureUniqueSlug(
  supabase: Awaited<ReturnType<typeof createClient>>,
  clubId: string,
  baseSlug: string,
  excludeId?: string
): Promise<string> {
  let finalSlug = baseSlug
  let suffix = 1
  let isUnique = false

  // Handle empty slugs
  if (!baseSlug) {
    baseSlug = 'thread'
    finalSlug = baseSlug
  }

  while (!isUnique && suffix < 100) {
    let query = supabase
      .from('discussion_threads')
      .select('id')
      .eq('club_id', clubId)
      .eq('slug', finalSlug)

    if (excludeId) {
      query = query.neq('id', excludeId)
    }

    const { data: existingThread } = await query.maybeSingle()

    if (!existingThread) {
      isUnique = true
    } else {
      suffix++
      finalSlug = `${baseSlug}-${suffix}`
    }
  }

  return finalSlug
}
