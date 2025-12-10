'use server'

/**
 * Club Moderation Actions
 * 
 * Server actions for managing blocked users and word blacklists.
 */

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { getClubSlug, checkAdminPermission } from './_helpers'

// ============================================
// BLOCKED USERS
// ============================================

export async function unblockUser(clubId: string, userId: string) {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return { error: 'You must be signed in' }
  }

  // Check admin permissions
  const { isAdmin } = await checkAdminPermission(supabase, clubId, user.id)
  if (!isAdmin) {
    return { error: 'You do not have permission to unblock users' }
  }

  const { error } = await supabase
    .from('blocked_users')
    .delete()
    .eq('club_id', clubId)
    .eq('user_id', userId)

  if (error) {
    return { error: error.message }
  }

  const clubSlug = await getClubSlug(supabase, clubId)
  revalidatePath(`/club/${clubSlug}`)
  return { success: true }
}

// ============================================
// WORD BLACKLIST
// ============================================

export async function addWordToBlacklist(clubId: string, word: string) {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return { error: 'You must be signed in' }
  }

  if (!word || word.trim().length === 0) {
    return { error: 'Word is required' }
  }

  // Check admin permissions
  const { isAdmin } = await checkAdminPermission(supabase, clubId, user.id)
  if (!isAdmin) {
    return { error: 'You do not have permission to add words to blacklist' }
  }

  const { data, error } = await supabase
    .from('club_word_blacklist')
    .insert({
      club_id: clubId,
      word: word.trim().toLowerCase(),
      added_by: user.id,
    })
    .select()
    .single()

  if (error) {
    // Check if word already exists
    if (error.code === '23505') {
      return { error: 'This word is already in the blacklist' }
    }
    return { error: error.message }
  }

  const clubSlug = await getClubSlug(supabase, clubId)
  revalidatePath(`/club/${clubSlug}`)
  return { success: true, data }
}

export async function removeWordFromBlacklist(clubId: string, wordId: string) {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return { error: 'You must be signed in' }
  }

  // Check admin permissions
  const { isAdmin } = await checkAdminPermission(supabase, clubId, user.id)
  if (!isAdmin) {
    return { error: 'You do not have permission to remove words from blacklist' }
  }

  const { error } = await supabase
    .from('club_word_blacklist')
    .delete()
    .eq('id', wordId)
    .eq('club_id', clubId)

  if (error) {
    return { error: error.message }
  }

  const clubSlug = await getClubSlug(supabase, clubId)
  revalidatePath(`/club/${clubSlug}`)
  return { success: true }
}

