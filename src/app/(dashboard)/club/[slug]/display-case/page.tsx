import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Trophy } from "@phosphor-icons/react/dist/ssr";
import { resolveClub } from "@/lib/clubs/resolveClub";
import { ClubNavigation } from "@/components/clubs/ClubNavigation";
import { ClubChallengesSection } from "@/components/badges/ClubChallengesSection";
import { getClubBadgeData } from "@/app/actions/club-badges";
import { FestivalWinnersList, type FestivalWinner } from "@/components/clubs/FestivalWinnersList";
import type { FestivalResults } from "@/types/festival-results";

interface ClubDisplayCasePageProps {
  params: Promise<{ slug: string }>;
}

// Fetch festival winners
async function getFestivalWinners(
  supabase: Awaited<ReturnType<typeof createClient>>,
  clubId: string
): Promise<FestivalWinner[]> {
  // Get completed festivals (no hard cap — pagination happens client-side after 5)
  const { data: festivals } = await supabase
    .from("festivals")
    .select("id, slug, theme, results_date")
    .eq("club_id", clubId)
    .eq("status", "completed")
    .order("results_date", { ascending: false });

  if (!festivals || festivals.length === 0) {
    return [];
  }

  const festivalIds = festivals.map((f) => f.id);

  // Get festival results
  const { data: resultsData } = await supabase
    .from("festival_results")
    .select("festival_id, results")
    .in("festival_id", festivalIds);

  if (!resultsData || resultsData.length === 0) {
    return [];
  }

  // Extract winners from JSONB standings (top 1 per festival)
  const winners: FestivalWinner[] = [];

  for (const result of resultsData) {
    const festival = festivals.find((f) => f.id === result.festival_id);
    if (!festival) continue;

    const results = result.results as FestivalResults;
    if (!results.standings || results.standings.length === 0) continue;

    // Get top winner (rank 1)
    const topWinner = results.standings[0];
    if (!topWinner) continue;

    // Find the winning movie - get highest rated nomination or winner's nomination
    let winningMovie: FestivalWinner["winningMovie"] = null;

    if (results.nominations && results.nominations.length > 0) {
      // Find highest rated nomination
      const highestRated = results.nominations.reduce((prev, current) => {
        return current.average_rating > prev.average_rating ? current : prev;
      });

      // Get movie details from nominations table
      const { data: nomination } = await supabase
        .from("nominations")
        .select(
          `
          tmdb_id,
          movies:tmdb_id (
            tmdb_id,
            title,
            poster_url
          )
        `
        )
        .eq("id", highestRated.nomination_id)
        .maybeSingle();

      if (nomination && nomination.movies) {
        const movie = Array.isArray(nomination.movies) ? nomination.movies[0] : nomination.movies;
        winningMovie = {
          tmdbId: movie.tmdb_id,
          title: movie.title,
          posterPath: movie.poster_url,
          averageRating: highestRated.average_rating,
        };
      }
    }

    // Get user avatar
    const { data: user } = await supabase
      .from("users")
      .select("id, display_name, avatar_url")
      .eq("id", topWinner.user_id)
      .maybeSingle();

    winners.push({
      festivalId: festival.id,
      festivalSlug: festival.slug,
      festivalTheme: festival.theme,
      resultsDate: festival.results_date,
      winner: {
        userId: topWinner.user_id,
        userName: user?.display_name || topWinner.user_name || "Unknown",
        avatarUrl: user?.avatar_url || null,
      },
      winningMovie,
    });
  }

  return winners;
}

export default async function ClubDisplayCasePage({ params }: ClubDisplayCasePageProps) {
  const identifier = (await params).slug;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/sign-in");
  }

  // Resolve club by slug or ID
  const clubResolution = await resolveClub(supabase, identifier);
  if (!clubResolution) redirect("/clubs");

  const clubId = clubResolution.id;
  const clubSlug = clubResolution.slug || clubId;

  // Check if user is a member
  const { data: membership } = await supabase
    .from("club_members")
    .select("role")
    .eq("club_id", clubId)
    .eq("user_id", user.id)
    .maybeSingle();

  if (!membership) {
    redirect("/clubs");
  }

  // Get club info
  const { data: club } = await supabase
    .from("clubs")
    .select("name, featured_badge_ids")
    .eq("id", clubId)
    .single();

  const isAdmin = membership?.role === "producer" || membership?.role === "director";
  const isProducer = membership?.role === "producer" || false;

  // Fetch data in parallel
  const [winners, badgeDataResult] = await Promise.all([
    getFestivalWinners(supabase, clubId),
    getClubBadgeData(clubId),
  ]);

  // Handle badge data (may have error)
  const badgeData = "data" in badgeDataResult ? badgeDataResult.data : null;
  const featuredBadgeIds = (club?.featured_badge_ids as string[]) || [];

  return (
    <>
      <ClubNavigation
        clubSlug={clubSlug}
        clubName={club?.name || "Club"}
        isAdmin={isAdmin}
        isProducer={isProducer}
      />
      <div className="bg-[var(--background)]">
        <div className="max-w-3xl mx-auto px-4 lg:px-6 py-6">
          {/* Header - Desktop only */}
          <div className="hidden md:block mb-6">
            <h1 className="text-lg font-semibold text-[var(--club-accent,var(--text-primary))]">
              Display Case
            </h1>
            <p className="text-xs text-[var(--text-muted)]">
              Showcase achievements, awards, and milestones
            </p>
          </div>

          <div className="space-y-6">
            {/* Festival Winners Section */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Trophy className="h-5 w-5" />
                  Festival Winners
                </CardTitle>
              </CardHeader>
              <CardContent>
                {winners.length > 0 ? (
                  <FestivalWinnersList winners={winners} clubSlug={clubSlug} />
                ) : (
                  <div className="py-8 text-center">
                    <Trophy
                      className="h-12 w-12 mx-auto mb-3"
                      style={{ color: "var(--text-muted)" }}
                    />
                    <div className="text-sm text-[var(--text-muted)]">No completed festivals</div>
                    <div className="text-xs text-[var(--text-muted)] mt-1">
                      Winners appear here after festivals complete
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Challenges Section */}
            {badgeData && (
              <ClubChallengesSection
                clubId={clubId}
                badgeData={badgeData}
                currentFeaturedIds={featuredBadgeIds}
                canEdit={isAdmin}
              />
            )}
          </div>
        </div>
      </div>
    </>
  );
}
