import { createClient } from '@/lib/supabase/server'
import type { RatingWithNomination } from '@/types/supabase-relations'
import Image from 'next/image'
import Link from 'next/link'
import { Card, CardContent } from '@/components/ui/card'
import { Text } from '@/components/ui/typography'
import { DateDisplay } from '@/components/ui/date-display'
import { RatingBadge } from '@/components/dashboard/RatingBadge'

interface ReviewGridProps {
  userId: string
}

export async function ReviewGrid({ userId }: ReviewGridProps) {
  const supabase = await createClient()
  
  // Get ratings with movie and festival info
  const { data: ratings } = await supabase
    .from('ratings')
    .select(`
      *,
      nominations:nomination_id (
        tmdb_id,
        festivals:festival_id (
          id,
          slug,
          theme,
          clubs:club_id (
            id,
            name,
            slug
          )
        )
      )
    `)
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(24)
  
  if (!ratings || ratings.length === 0) {
    return (
      <Card variant="default" className="border-dashed">
        <CardContent className="p-4 text-center">
          <Text size="md" muted>
            No reviews yet. Rate movies in festivals to see them here!
          </Text>
        </CardContent>
      </Card>
    )
  }
  
  // Get movie details for all unique tmdb_ids
  const tmdbIds = [...new Set(
    (ratings as RatingWithNomination[])
      .map((r) => r.nominations?.tmdb_id)
      .filter((id): id is number => id != null)
  )]
  
  const { data: movies } = await supabase
    .from('movies')
    .select('tmdb_id, title, poster_url, year')
    .in('tmdb_id', tmdbIds)
  
  const moviesMap = new Map(
    (movies || []).map((m) => [m.tmdb_id, m])
  )
  
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
      {ratings.map((rating) => {
        const nominationsRelation = Array.isArray(rating.nominations) ? rating.nominations[0] : rating.nominations
        const nomination = nominationsRelation as { tmdb_id?: number | null; festivals?: { id?: string; slug?: string | null; clubs?: { id?: string; name?: string | null; slug?: string | null } | null } | null } | null
        const festivals = nomination?.festivals
        const festival = Array.isArray(festivals) ? festivals[0] : festivals
        const clubsRelation = festival?.clubs
        const club = Array.isArray(clubsRelation) ? clubsRelation[0] : clubsRelation
        const movie = nomination?.tmdb_id ? moviesMap.get(nomination.tmdb_id) : null
        
        if (!movie) return null
        
        const clubSlug = club?.slug || club?.id
        const festivalSlug = festival?.slug || festival?.id
        
        return (
          <Link
            key={rating.id}
            href={`/club/${clubSlug}/festival/${festivalSlug}`}
            className="group"
          >
            <Card variant="default" className="h-full">
              <CardContent className="p-0">
                {/* Movie poster */}
                <div className="relative aspect-[2/3] overflow-hidden rounded-t-md">
                  {movie.poster_url ? (
                    <Image
                      src={movie.poster_url}
                      alt={movie.title || 'Movie poster'}
                      fill
                      sizes="(max-width: 640px) 100vw, (max-width: 768px) 50vw, (max-width: 1024px) 33vw, 25vw"
                      className="object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                  ) : (
                    <div className="w-full h-full bg-zinc-800 flex items-center justify-center">
                      <Text size="sm" muted>No poster</Text>
                    </div>
                  )}
                  
                  {/* Rating badge */}
                  <div className="absolute top-2 right-2">
                    <RatingBadge rating={Number(rating.rating)} variant="overlay" />
                  </div>
                </div>
                
                {/* Movie info */}
                <div className="p-3">
                  <Text size="sm" className="font-semibold mb-1 line-clamp-1">
                    {movie.title}
                  </Text>
                  {movie.year && (
                    <Text size="tiny" muted className="mb-2">
                      {movie.year}
                    </Text>
                  )}
                  {club && (
                    <Text size="tiny" muted className="line-clamp-1">
                      {club.name}
                    </Text>
                  )}
                  {rating.created_at && (
                    <Text size="tiny" muted className="mt-1">
                      <DateDisplay date={rating.created_at} format="date" />
                    </Text>
                  )}
                </div>
              </CardContent>
            </Card>
          </Link>
        )
      })}
    </div>
  )
}

