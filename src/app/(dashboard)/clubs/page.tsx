import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getUserClubs } from '@/app/actions/clubs'
import { ClubsPageClient } from './ClubsPageClient'

export default async function ClubsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/sign-in')
  }

  const { memberClubs, followingClubs } = await getUserClubs()

  return (
    <ClubsPageClient
      memberClubs={memberClubs}
      followingClubs={followingClubs}
    />
  )
}
