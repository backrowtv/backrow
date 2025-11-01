import { createClient } from '@/lib/supabase/server'

export async function checkMutualClubMembership(targetUserId: string): Promise<boolean> {
  const supabase = await createClient()
  
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return false

  if (user.id === targetUserId) return true

  const { data, error } = await supabase.rpc('have_mutual_clubs', {
    user_a_id: user.id,
    user_b_id: targetUserId
  })

  if (error) {
    console.error('Error checking mutual clubs:', error)
    return false
  }

  return !!data
}

export async function getMutualClubs(targetUserId: string) {
  const supabase = await createClient()
  
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return []

  // Fetch clubs where both users are members
  const { data, error } = await supabase
    .from('club_members')
    .select('club_id')
    .eq('user_id', user.id)
    .in('club_id', (
      await supabase
        .from('club_members')
        .select('club_id')
        .eq('user_id', targetUserId)
    ).data?.map(m => m.club_id) || [])

  if (error) {
    console.error('Error fetching mutual clubs:', error)
    return []
  }

  return data?.map(d => d.club_id) || []
}

