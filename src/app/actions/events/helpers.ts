'use server'

/**
 * Event Helpers
 *
 * Shared utilities for event actions.
 */

import { createClient } from '@/lib/supabase/server'

export async function getClubSlug(clubId: string): Promise<string> {
  const supabase = await createClient()
  const { data: club } = await supabase
    .from('clubs')
    .select('slug')
    .eq('id', clubId)
    .maybeSingle()
  return club?.slug || clubId
}

export async function checkAdminPermission(clubId: string, userId: string): Promise<boolean> {
  const supabase = await createClient()
  const { data: membership } = await supabase
    .from('club_members')
    .select('role')
    .eq('club_id', clubId)
    .eq('user_id', userId)
    .maybeSingle()

  return membership?.role === 'producer' || membership?.role === 'director'
}

export async function checkMemberPermission(clubId: string, userId: string): Promise<boolean> {
  const supabase = await createClient()
  const { data: membership } = await supabase
    .from('club_members')
    .select('club_id')
    .eq('club_id', clubId)
    .eq('user_id', userId)
    .maybeSingle()

  return !!membership
}
