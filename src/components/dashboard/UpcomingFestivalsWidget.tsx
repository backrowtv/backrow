import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Text } from '@/components/ui/typography'
import { DateDisplay } from '@/components/ui/date-display'

interface UpcomingFestival {
  id: string
  slug: string | null
  theme: string | null
  start_date: string
  nomination_deadline: string
  club_id: string
  club_slug: string | null
  club_name: string | null
}

async function getUpcomingFestivals(userId: string): Promise<UpcomingFestival[]> {
  const supabase = await createClient()
  
  // Get user's club memberships
  const { data: memberships } = await supabase
    .from('club_members')
    .select('club_id')
    .eq('user_id', userId)
  
  if (!memberships || memberships.length === 0) {
    return []
  }
  
  const clubIds = memberships.map((m) => m.club_id)
  const now = new Date().toISOString()
  
  // Get upcoming festivals (status: idle, nominating, watching)
  // Order by start_date ascending (soonest first)
  const { data: festivals } = await supabase
    .from('festivals')
    .select(`
      id,
      slug,
      theme,
      start_date,
      nomination_deadline,
      club_id,
      clubs:club_id (
        name,
        slug
      )
    `)
    .in('club_id', clubIds)
    .in('status', ['idle', 'nominating', 'watching'])
    .gte('start_date', now)
    .order('start_date', { ascending: true })
    .limit(5)
  
  if (!festivals || festivals.length === 0) {
    return []
  }
  
  return festivals.map((festival) => ({
    id: festival.id,
    slug: festival.slug,
    theme: festival.theme,
    start_date: festival.start_date,
    nomination_deadline: festival.nomination_deadline,
    club_id: festival.club_id,
    club_slug: (() => {
      const clubsRelation = Array.isArray(festival.clubs) ? festival.clubs[0] : festival.clubs
      return (clubsRelation as { slug?: string | null } | null)?.slug || null
    })(),
    club_name: (() => {
      const clubsRelation = Array.isArray(festival.clubs) ? festival.clubs[0] : festival.clubs
      return (clubsRelation as { name?: string | null } | null)?.name || null
    })(),
  }))
}

export async function UpcomingFestivalsWidget() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  
  if (!user) {
    return null
  }
  
  const festivals = await getUpcomingFestivals(user.id)
  
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle style={{ color: 'var(--text-muted)' }}>Upcoming Festivals</CardTitle>
      </CardHeader>
      <CardContent>
        {festivals.length === 0 ? (
          <Text size="sm" muted>
            No upcoming festivals
          </Text>
        ) : (
          <div className="space-y-3">
            {festivals.map((festival) => {
              const clubSlug = festival.club_slug || festival.club_id
              const festivalSlug = festival.slug || festival.id
              return (
              <Link
                key={festival.id}
                href={`/club/${clubSlug}/festival/${festivalSlug}`}
                className="block group"
              >
                <div className="space-y-1">
                  <Text size="sm" className="font-semibold group-hover:opacity-80 transition-colors">
                    {festival.theme || 'Untitled Festival'}
                  </Text>
                  {festival.club_name && (
                    <Text size="tiny" muted>
                      {festival.club_name}
                    </Text>
                  )}
                  <Text size="tiny" muted>
                    Starts <DateDisplay date={festival.start_date} format="date" />
                  </Text>
                </div>
              </Link>
              )
            })}
          </div>
        )}
      </CardContent>
    </Card>
  )
}

