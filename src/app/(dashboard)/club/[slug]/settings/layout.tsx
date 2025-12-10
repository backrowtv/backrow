import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { ClubNavigation } from '@/components/clubs/ClubNavigation'
import { resolveClub } from '@/lib/clubs/resolveClub'

interface ClubSettingsLayoutProps {
  children: React.ReactNode
  params: Promise<{ slug: string }>
}

// Club settings layout - includes navigation
export default async function ClubSettingsLayout({ children, params }: ClubSettingsLayoutProps) {
  const identifier = (await params).slug
  const supabase = await createClient()
  
  const { data: { user } } = await supabase.auth.getUser()
  
  if (!user) {
    redirect('/sign-in')
  }
  
  // Resolve club by slug or ID
  const clubResolution = await resolveClub(supabase, identifier)
  if (!clubResolution) redirect('/clubs')
  
  const clubId = clubResolution.id
  const clubSlug = clubResolution.slug || clubId
  
  // Get club name
  const { data: club } = await supabase
    .from('clubs')
    .select('name')
    .eq('id', clubId)
    .single()
  
  // Check user's role
  const { data: membership } = await supabase
    .from('club_members')
    .select('role')
    .eq('club_id', clubId)
    .eq('user_id', user.id)
    .maybeSingle()
  
  if (!membership) {
    redirect('/clubs')
  }
  
  const isAdmin = membership.role === 'producer' || membership.role === 'director'
  const isProducer = membership.role === 'producer'
  
  return (
    <>
      <ClubNavigation 
        clubSlug={clubSlug} 
        clubName={club?.name || 'Club'} 
        isAdmin={isAdmin} 
        isProducer={isProducer} 
      />
      <div className="animate-fade-in">
        <div className="transition-all duration-200">
          {children}
        </div>
      </div>
    </>
  )
}

