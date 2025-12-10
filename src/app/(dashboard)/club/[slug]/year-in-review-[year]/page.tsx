import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { Section, Container } from "@/components/ui/section";
import { Heading, Text } from "@/components/ui/typography";
import { ClubYearInReviewStats } from "@/components/clubs/ClubYearInReviewStats";
import { ClubYearInReviewHighlights } from "@/components/clubs/ClubYearInReviewHighlights";
import { Card, CardContent } from "@/components/ui/card";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ArrowLeft, CalendarBlank } from "@phosphor-icons/react/dist/ssr";
import { BrandText } from "@/components/ui/brand-text";
import { resolveClub } from "@/lib/clubs/resolveClub";
import { ClubNavigation } from "@/components/clubs/ClubNavigation";

interface ClubYearInReviewPageProps {
  params: Promise<{ slug: string; year: string }>;
}

export default async function ClubYearInReviewPage({ params }: ClubYearInReviewPageProps) {
  const { slug: identifier, year: yearParam } = await params;
  const year = parseInt(yearParam, 10);

  // Validate year (reasonable range: 2020-2030)
  if (isNaN(year) || year < 2020 || year > 2030) {
    redirect("/clubs");
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/sign-in");
  }

  // Resolve club by slug or ID
  const clubResolution = await resolveClub(supabase, identifier);
  if (!clubResolution) {
    redirect("/clubs");
  }

  const clubId = clubResolution.id;
  const clubSlug = clubResolution.slug || clubId;

  // Check club membership
  const { data: membership } = await supabase
    .from("club_members")
    .select("role")
    .eq("club_id", clubId)
    .eq("user_id", user.id)
    .maybeSingle();

  // Get club info
  const { data: club } = await supabase
    .from("clubs")
    .select("id, name, slug")
    .eq("id", clubId)
    .single();

  if (!club) {
    redirect("/clubs");
  }

  const yearStart = new Date(year, 0, 1).toISOString();
  const yearEnd = new Date(year + 1, 0, 1).toISOString();

  // Fetch club's festival data for the year (including slugs)
  const { data: festivals } = await supabase
    .from("festivals")
    .select("id, slug, theme, status, start_date, results_date, phase")
    .eq("club_id", clubId)
    .gte("start_date", yearStart)
    .lt("start_date", yearEnd)
    .is("deleted_at", null)
    .order("start_date", { ascending: false });

  const completedFestivals = festivals?.filter((f) => f.status === "completed") || [];
  const festivalIds = completedFestivals.map((f) => f.id);

  // Get all nominations from completed festivals
  const { data: nominations } = await supabase
    .from("nominations")
    .select("tmdb_id, user_id, movies:tmdb_id(title, poster_url, genres, director, year, slug)")
    .in(
      "festival_id",
      festivalIds.length > 0 ? festivalIds : ["00000000-0000-0000-0000-000000000000"]
    )
    .is("deleted_at", null);

  // Get all ratings from completed festivals
  const { data: ratings } = await supabase
    .from("ratings")
    .select(
      "rating, user_id, nominations:nomination_id(tmdb_id, movies:tmdb_id(title, poster_url, director, year, slug))"
    )
    .in(
      "festival_id",
      festivalIds.length > 0 ? festivalIds : ["00000000-0000-0000-0000-000000000000"]
    );

  // Get member participation
  const { data: members } = await supabase
    .from("club_members")
    .select("user_id, users:user_id(display_name, avatar_url)")
    .eq("club_id", clubId);

  // Calculate member activity
  const memberActivity: Record<
    string,
    {
      displayName: string;
      avatarUrl: string | null;
      nominations: number;
      ratings: number;
      festivalsWon: number;
    }
  > = {};

  members?.forEach((member) => {
    const userId = member.user_id;
    // Handle users relation - can be object or array depending on Supabase response
    const usersRelation = Array.isArray(member.users) ? member.users[0] : member.users;
    const user = usersRelation as
      | { display_name: string; avatar_url: string | null }
      | null
      | undefined;
    if (user) {
      memberActivity[userId] = {
        displayName: user.display_name || "User",
        avatarUrl: user.avatar_url,
        nominations: 0,
        ratings: 0,
        festivalsWon: 0,
      };
    }
  });

  // Count nominations per member
  nominations?.forEach((nomination) => {
    const userId = nomination.user_id;
    if (memberActivity[userId]) {
      memberActivity[userId].nominations++;
    }
  });

  // Count ratings per member
  ratings?.forEach((rating) => {
    const userId = rating.user_id;
    if (memberActivity[userId]) {
      memberActivity[userId].ratings++;
    }
  });

  // Get festival winners
  if (festivalIds.length > 0) {
    const { data: standings } = await supabase
      .from("festival_standings")
      .select("festival_id, user_id")
      .in("festival_id", festivalIds)
      .eq("rank", 1);

    standings?.forEach((standing) => {
      const userId = standing.user_id;
      if (memberActivity[userId]) {
        memberActivity[userId].festivalsWon++;
      }
    });
  }

  // Calculate statistics
  const uniqueMovies = new Set(nominations?.map((n) => n.tmdb_id) || []);
  const totalMoviesWatched = uniqueMovies.size;

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

  // Most active members
  const mostActiveMembers = Object.entries(memberActivity)
    .map(([userId, data]) => ({ userId, ...data }))
    .sort((a, b) => b.nominations + b.ratings - (a.nominations + a.ratings))
    .slice(0, 10);

  // Most popular themes
  const themeCounts: Record<string, number> = {};
  completedFestivals.forEach((festival) => {
    themeCounts[festival.theme] = (themeCounts[festival.theme] || 0) + 1;
  });

  const mostPopularThemes = Object.entries(themeCounts)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 5)
    .map(([theme, count]) => ({ theme, count }));

  // Top rated movies
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
    // Handle nominations relation - can be object or array depending on Supabase response
    const nominationsRelation = Array.isArray(rating.nominations)
      ? rating.nominations[0]
      : rating.nominations;
    // Handle movies relation - can be object or array
    const moviesRelationRaw = (nominationsRelation as { movies?: unknown } | null)?.movies;
    const moviesRelation = moviesRelationRaw
      ? Array.isArray(moviesRelationRaw)
        ? moviesRelationRaw[0]
        : moviesRelationRaw
      : null;
    const nomination = nominationsRelation as { tmdb_id: number } | null | undefined;
    if (nomination?.tmdb_id && moviesRelation) {
      const tmdbId = nomination.tmdb_id;
      if (!movieRatings[tmdbId]) {
        movieRatings[tmdbId] = {
          title: moviesRelation.title,
          poster_url: moviesRelation.poster_url,
          rating: Number(rating.rating) || 0,
          count: 1,
          year: moviesRelation.year || null,
          slug: moviesRelation.slug || null,
        };
      } else {
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

  // Top directors
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
    totalFestivalsCompleted: completedFestivals.length,
    totalMoviesWatched,
    averageRating: Math.round(averageRating * 10) / 10,
    topGenres,
    mostActiveMembers,
    mostPopularThemes,
    totalRatings: validRatings.length,
    totalMembers: members?.length || 0,
  };

  const highlights = {
    topRatedMovies,
    topDirectors,
    completedFestivals: completedFestivals.slice(0, 10),
    topMembers: mostActiveMembers.slice(0, 5),
  };

  const isAdmin = membership?.role === "producer" || membership?.role === "director";
  const isProducer = membership?.role === "producer" || false;

  return (
    <>
      <ClubNavigation
        clubSlug={clubSlug}
        clubName={club?.name || "Club"}
        isAdmin={isAdmin}
        isProducer={isProducer}
      />
      <div className="" style={{ background: "var(--background)" }}>
        <Section>
          <Container>
            {/* Header */}
            <div className="mb-8">
              <Link href={`/club/${clubSlug}`}>
                <Button variant="outline" size="sm" className="mb-4">
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Back to <BrandText>{club.name}</BrandText>
                </Button>
              </Link>

              <div className="flex items-center gap-3 mb-2">
                <CalendarBlank
                  className="h-8 w-8"
                  style={{ color: "var(--club-accent, var(--primary))" }}
                />
                <Heading level={1}>
                  <BrandText>{club.name}</BrandText> - {year} Year in Review
                </Heading>
              </div>
              <Text size="small" muted>
                <BrandText>{club.name}</BrandText>&apos;s festival journey in {year}
              </Text>
            </div>

            {/* Empty State */}
            {completedFestivals.length === 0 ? (
              <Card>
                <CardContent className="p-12 text-center">
                  <CalendarBlank
                    className="h-16 w-16 mx-auto mb-4"
                    style={{ color: "var(--text-muted)" }}
                  />
                  <Heading level={2} className="mb-2">
                    No festivals completed in {year}
                  </Heading>
                  <Text muted>
                    This club didn&apos;t complete any festivals in {year}. Check back next year!
                  </Text>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-8">
                {/* Statistics */}
                <ClubYearInReviewStats stats={stats} year={year} clubName={club.name} />

                {/* Highlights */}
                <ClubYearInReviewHighlights
                  highlights={highlights}
                  year={year}
                  clubId={clubId}
                  clubSlug={clubSlug}
                />
              </div>
            )}
          </Container>
        </Section>
      </div>
    </>
  );
}
