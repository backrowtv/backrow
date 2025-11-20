import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { Section, Container } from "@/components/ui/section";
import { Heading, Text } from "@/components/ui/typography";
import { YearInReviewStats } from "@/components/profile/YearInReviewStats";
import { YearInReviewHighlights } from "@/components/profile/YearInReviewHighlights";
import { Card, CardContent } from "@/components/ui/card";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ArrowLeft, CalendarBlank } from "@phosphor-icons/react/dist/ssr";

interface YearInReviewPageProps {
  params: Promise<{ year: string }>;
}

export default async function YearInReviewPage({ params }: YearInReviewPageProps) {
  const { year: yearParam } = await params;
  const year = parseInt(yearParam, 10);

  // Validate year (reasonable range: 2020-2030)
  if (isNaN(year) || year < 2020 || year > 2030) {
    redirect("/profile");
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/sign-in");
  }

  const yearStart = new Date(year, 0, 1).toISOString();
  const yearEnd = new Date(year + 1, 0, 1).toISOString();

  // Fetch user's movie data for the year
  // Get nominations (movies watched)
  const { data: nominations } = await supabase
    .from("nominations")
    .select("tmdb_id, created_at, movies:tmdb_id(title, poster_url, genres, director, year, slug)")
    .eq("user_id", user.id)
    .gte("created_at", yearStart)
    .lt("created_at", yearEnd)
    .is("deleted_at", null);

  // Get ratings
  const { data: ratings } = await supabase
    .from("ratings")
    .select(
      "rating, created_at, nominations:nomination_id(tmdb_id, movies:tmdb_id(title, poster_url, director, year, slug))"
    )
    .eq("user_id", user.id)
    .gte("created_at", yearStart)
    .lt("created_at", yearEnd);

  // Get festivals participated in
  const { data: userMemberships } = await supabase
    .from("club_members")
    .select("club_id, clubs:club_id(name, slug)")
    .eq("user_id", user.id);

  const clubIds = userMemberships?.map((m) => m.club_id) || [];

  const { data: festivals } = await supabase
    .from("festivals")
    .select("id, theme, status, club_id, clubs:club_id(name, slug)")
    .in("club_id", clubIds)
    .gte("start_date", yearStart)
    .lt("start_date", yearEnd)
    .is("deleted_at", null);

  // Get festivals won
  const festivalIds = festivals?.map((f) => f.id) || [];
  let festivalsWon = 0;
  if (festivalIds.length > 0) {
    const { data: standings } = await supabase
      .from("festival_standings")
      .select("festival_id")
      .in("festival_id", festivalIds)
      .eq("user_id", user.id)
      .eq("rank", 1);

    festivalsWon = standings?.length || 0;
  }

  // Get user profile for favorites
  const { data: userProfile } = await supabase
    .from("users")
    .select("favorite_movie_tmdb_id, favorite_director_tmdb_id, favorite_composer_tmdb_id")
    .eq("id", user.id)
    .single();

  // Fetch favorite movie if exists
  let favoriteMovie: {
    tmdb_id: number;
    title: string;
    poster_url: string | null;
    year: number | null;
    slug: string | null;
  } | null = null;
  if (userProfile?.favorite_movie_tmdb_id) {
    const { data: movie } = await supabase
      .from("movies")
      .select("tmdb_id, title, poster_url, year, slug")
      .eq("tmdb_id", userProfile.favorite_movie_tmdb_id)
      .maybeSingle();

    if (movie) {
      favoriteMovie = {
        tmdb_id: movie.tmdb_id,
        title: movie.title,
        poster_url: movie.poster_url,
        year: movie.year,
        slug: movie.slug || null,
      };
    }
  }

  // Calculate statistics
  const uniqueMovies = new Set(nominations?.map((n) => n.tmdb_id) || []);
  const moviesWatched = uniqueMovies.size;

  const validRatings = ratings?.filter((r) => r.rating !== null && r.rating !== undefined) || [];
  const ratingSum = validRatings.reduce((sum, r) => sum + (Number(r.rating) || 0), 0);
  const averageRating = validRatings.length > 0 ? ratingSum / validRatings.length : 0;

  // Calculate top genres
  const genreCounts: Record<string, number> = {};
  nominations?.forEach((nomination) => {
    const moviesRelation = Array.isArray(nomination.movies)
      ? nomination.movies[0]
      : nomination.movies;
    const movie = moviesRelation as { genres?: string[] } | null;
    if (movie?.genres && Array.isArray(movie.genres)) {
      movie.genres.forEach((genre: string) => {
        genreCounts[genre] = (genreCounts[genre] || 0) + 1;
      });
    }
  });

  const topGenres = Object.entries(genreCounts)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 5)
    .map(([genre, count]) => ({ genre, count }));

  // Calculate most active clubs
  const clubActivity: Record<string, { name: string; slug: string | null; count: number }> = {};
  festivals?.forEach((festival) => {
    const clubsRelation = Array.isArray(festival.clubs) ? festival.clubs[0] : festival.clubs;
    const club = clubsRelation as { name: string; slug: string | null } | null;
    if (club) {
      const clubId = festival.club_id;
      if (!clubActivity[clubId]) {
        clubActivity[clubId] = { name: club.name, slug: club.slug, count: 0 };
      }
      clubActivity[clubId].count++;
    }
  });

  const mostActiveClubs = Object.entries(clubActivity)
    .sort(([, a], [, b]) => b.count - a.count)
    .slice(0, 5)
    .map(([clubId, data]) => ({ clubId, ...data }));

  // Get top rated movies (from ratings)
  const movieRatings: Record<
    number,
    {
      title: string;
      poster_url: string | null;
      rating: number;
      count: number;
      year: number | null;
      slug: string | null;
    }
  > = {};
  ratings?.forEach((rating) => {
    const nominationsRelation = Array.isArray(rating.nominations)
      ? rating.nominations[0]
      : rating.nominations;
    const moviesRelationRaw = (nominationsRelation as { movies?: unknown } | null)?.movies;
    const moviesRelation = moviesRelationRaw
      ? Array.isArray(moviesRelationRaw)
        ? moviesRelationRaw[0]
        : moviesRelationRaw
      : null;
    const nomination = nominationsRelation as { tmdb_id: number } | null;
    if (nomination?.tmdb_id && moviesRelation) {
      const tmdbId = nomination.tmdb_id;
      const movieData = moviesRelation as {
        title: string;
        poster_url: string | null;
        year?: number | null;
        slug?: string | null;
      } | null;
      if (!movieRatings[tmdbId]) {
        movieRatings[tmdbId] = {
          title: movieData?.title || "Unknown",
          poster_url: movieData?.poster_url || null,
          rating: Number(rating.rating) || 0,
          count: 1,
          year: movieData?.year || null,
          slug: movieData?.slug || null,
        };
      } else {
        // Average if multiple ratings
        const current = movieRatings[tmdbId];
        const newRating = Number(rating.rating) || 0;
        movieRatings[tmdbId] = {
          ...current,
          rating: (current.rating * current.count + newRating) / (current.count + 1),
          count: current.count + 1,
        };
      }
    }
  });

  const topRatedMovies = Object.entries(movieRatings)
    .sort(([, a], [, b]) => b.rating - a.rating)
    .slice(0, 10)
    .map(([tmdbId, data]) => ({ tmdbId: parseInt(tmdbId, 10), ...data }));

  // Get top directors (from nominations)
  const directorCounts: Record<string, number> = {};
  nominations?.forEach((nomination) => {
    const moviesRelation = Array.isArray(nomination.movies)
      ? nomination.movies[0]
      : nomination.movies;
    const movie = moviesRelation as { director?: string } | null;
    if (movie?.director) {
      directorCounts[movie.director] = (directorCounts[movie.director] || 0) + 1;
    }
  });

  const topDirectors = Object.entries(directorCounts)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 10)
    .map(([director, count]) => ({ director, count }));

  const stats = {
    moviesWatched,
    festivalsWon,
    festivalsParticipated: festivals?.length || 0,
    topGenres,
    averageRating: Math.round(averageRating * 10) / 10,
    mostActiveClubs,
    totalRatings: validRatings.length,
  };

  const highlights = {
    topRatedMovies,
    topDirectors,
    favoriteMovie,
    festivalsWon,
  };

  return (
    <div className="" style={{ background: "var(--background)" }}>
      <Section>
        <Container>
          {/* Header */}
          <div className="mb-8">
            <Link href="/profile">
              <Button variant="outline" size="sm" className="mb-4">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Profile
              </Button>
            </Link>

            <div className="flex items-center gap-3 mb-2">
              <CalendarBlank className="h-8 w-8" style={{ color: "var(--primary)" }} />
              <Heading level={1}>{year} Year in Review</Heading>
            </div>
            <Text size="small" muted>
              Your movie watching journey in {year}
            </Text>
          </div>

          {/* Empty State */}
          {moviesWatched === 0 && validRatings.length === 0 ? (
            <Card>
              <CardContent className="p-12 text-center">
                <CalendarBlank
                  className="h-16 w-16 mx-auto mb-4"
                  style={{ color: "var(--text-muted)" }}
                />
                <Heading level={2} className="mb-2">
                  No activity in {year}
                </Heading>
                <Text muted>
                  You haven&apos;t watched or rated any movies in {year}. Start participating in
                  festivals to see your year in review!
                </Text>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-8">
              {/* Statistics */}
              <YearInReviewStats stats={stats} year={year} />

              {/* Highlights */}
              <YearInReviewHighlights highlights={highlights} year={year} />
            </div>
          )}
        </Container>
      </Section>
    </div>
  );
}
