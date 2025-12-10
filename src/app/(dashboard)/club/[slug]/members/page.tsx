import { redirect, notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getMembersPageData } from '@/app/actions/members/queries'
import { ClubNavigation } from '@/components/clubs/ClubNavigation'
import { MembersPageClient } from './MembersPageClient'

interface MembersPageProps {
  params: Promise<{ slug: string }>
}

export default async function MembersPage({ params }: MembersPageProps) {
  const { slug } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/sign-in')
  }

  const { data, error } = await getMembersPageData(slug)

  if (error === 'Club not found' || !data) {
    notFound()
  }

  if (error) {
    // Handle other errors
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-red-400">{error}</p>
      </div>
    )
  }

  return (
    <>
      <ClubNavigation
        clubSlug={data.clubSlug}
        clubName={data.clubName}
        isAdmin={data.isAdmin}
        isProducer={data.isProducer}
      />
      <MembersPageClient
        clubId={data.clubId}
        clubSlug={data.clubSlug}
        clubName={data.clubName}
        clubPrivacy={data.clubPrivacy}
        clubSettings={data.clubSettings}
        initialMembers={data.members}
        currentUserId={data.currentUserId}
        currentUserRole={data.currentUserRole}
        isAdmin={data.isAdmin}
        joinRequests={data.joinRequests}
        requestsCount={data.requestsCount}
      />
    </>
  )
}
