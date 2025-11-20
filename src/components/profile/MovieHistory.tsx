import { createClient } from "@/lib/supabase/server";
import { Card, CardContent } from "@/components/ui/card";
import { Heading } from "@/components/ui/typography";
import Image from "next/image";
import { BrandText } from "@/components/ui/brand-text";
import { RatingBadge } from "@/components/dashboard/RatingBadge";

interface MovieHistoryProps {
  userId: string;
}

export async function MovieHistory({ userId }: MovieHistoryProps) {
  const supabase = await createClient();

  // Get all movies user has rated across all clubs
  const { data: ratings } = await supabase
    .from("ratings")
    .select(
      `
      *,
      nominations:nomination_id (
        *,
        movies:tmdb_id (
          tmdb_id,
          title,
          poster_url,
          year
        ),
        festivals:festival_id (
          id,
          theme,
          club_id,
          clubs:club_id (
            id,
            name
          )
        )
      )
    `
    )
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(50);

  if (!ratings || ratings.length === 0) {
    return (
      <Card>
        <CardContent className="p-6 text-center text-[var(--text-secondary)]">
          No movie history yet
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Heading level={2} className="text-lg mb-4">
        Movie History
      </Heading>
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {ratings.map((rating) => {
          const nominationsRelation = Array.isArray(rating.nominations)
            ? rating.nominations[0]
            : rating.nominations;
          const moviesRelationRaw = (nominationsRelation as Record<string, unknown>)?.movies;
          const moviesRelation = moviesRelationRaw
            ? Array.isArray(moviesRelationRaw)
              ? moviesRelationRaw[0]
              : moviesRelationRaw
            : null;
          const festivalsRelationRaw = (nominationsRelation as Record<string, unknown>)?.festivals;
          const festivalsRelation = festivalsRelationRaw
            ? Array.isArray(festivalsRelationRaw)
              ? festivalsRelationRaw[0]
              : festivalsRelationRaw
            : null;
          const clubsRelationRaw = festivalsRelation
            ? (festivalsRelation as Record<string, unknown>)?.clubs
            : null;
          const clubsRelation = clubsRelationRaw
            ? Array.isArray(clubsRelationRaw)
              ? clubsRelationRaw[0]
              : clubsRelationRaw
            : null;
          const movie = moviesRelation as {
            title?: string;
            poster_url?: string;
            year?: number;
          } | null;
          const festival = festivalsRelation as { theme?: string; club_id?: string } | null;
          const club = clubsRelation as { name?: string } | null;

          return (
            <Card key={rating.id}>
              <CardContent className="p-4">
                {movie?.poster_url && (
                  <Image
                    src={movie.poster_url}
                    alt={movie.title || "Movie"}
                    width={200}
                    height={300}
                    className="w-full aspect-[2/3] object-cover rounded mb-2"
                  />
                )}
                <h3 className="font-semibold text-sm text-[var(--text-primary)] mb-1">
                  {movie?.title || "Unknown Movie"}
                </h3>
                {movie?.year && (
                  <p className="text-xs text-[var(--text-muted)] mb-2">{movie.year}</p>
                )}
                {rating.rating && (
                  <div className="mb-2">
                    <RatingBadge rating={rating.rating} />
                  </div>
                )}
                {festival?.theme && (
                  <p className="text-xs text-[var(--text-secondary)] mb-1">{festival.theme}</p>
                )}
                {club?.name && (
                  <p className="text-xs text-[var(--text-muted)]">
                    <BrandText>{club.name}</BrandText>
                  </p>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
