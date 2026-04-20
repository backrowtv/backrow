import { Suspense } from "react";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { CircleNotch } from "@phosphor-icons/react/dist/ssr";
import { resolveClub } from "@/lib/clubs/resolveClub";
import { ClubNavigation } from "@/components/clubs/ClubNavigation";
import { LeaderboardCard } from "@/components/standings/LeaderboardCard";
import { ClubAdvancedStats } from "@/components/standings/ClubAdvancedStats";
import { getSeasonStandings, getLifetimeStandings } from "@/app/actions/standings";
import { Card, CardHeader, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

interface ClubStatsPageProps {
  params: Promise<{ slug: string }>;
}

function LeaderboardSkeleton({ title }: { title: string }) {
  return (
    <Card className="overflow-hidden">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between gap-4">
          <Skeleton className="h-5 w-40" />
          {title === "Season Leaderboard" && <Skeleton className="h-8 w-36 rounded-lg" />}
        </div>
      </CardHeader>
      <CardContent className="pt-0">
        <div className="flex items-center justify-center py-12">
          <CircleNotch className="w-6 h-6 animate-spin text-[var(--text-muted)]" />
        </div>
      </CardContent>
    </Card>
  );
}

async function StatsContent({ clubId, userId }: { clubId: string; userId: string }) {
  const supabase = await createClient();

  // Fetch all seasons for the club (ordered by start_date descending - most recent first)
  const { data: seasons } = await supabase
    .from("seasons")
    .select("id, name, start_date, end_date")
    .eq("club_id", clubId)
    .is("deleted_at", null)
    .order("start_date", { ascending: false });

  // Find the current/active season (or most recent if no active season)
  const now = new Date();
  let currentSeason = seasons?.find((s) => {
    const start = new Date(s.start_date);
    const end = new Date(s.end_date);
    return start <= now && end >= now;
  });

  // If no active season, use the most recent one
  if (!currentSeason && seasons && seasons.length > 0) {
    currentSeason = seasons[0];
  }

  // Fetch lifetime standings
  const lifetimeResult = await getLifetimeStandings(clubId);
  const lifetimeEntries = lifetimeResult.data || [];

  // Fetch season standings for the current/active season
  let seasonEntries: Awaited<ReturnType<typeof getSeasonStandings>>["data"] = [];
  if (currentSeason) {
    const seasonResult = await getSeasonStandings(clubId, currentSeason.id);
    seasonEntries = seasonResult.data || [];
  }

  return (
    <div className="space-y-6">
      {/* Season Leaderboard */}
      {seasons && seasons.length > 0 && currentSeason ? (
        <LeaderboardCard
          title="Season Leaderboard"
          entries={seasonEntries || []}
          currentUserId={userId}
          seasons={seasons}
          clubId={clubId}
          initialSeasonId={currentSeason.id}
        />
      ) : (
        <Card className="overflow-hidden">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between gap-4">
              <div className="text-base font-semibold">Season Leaderboard</div>
            </div>
          </CardHeader>
          <CardContent className="pt-0">
            <p className="text-sm text-[var(--text-muted)] text-center py-4">
              No season data yet. Create a season to start tracking standings.
            </p>
          </CardContent>
        </Card>
      )}

      {/* Lifetime Leaderboard */}
      <LeaderboardCard
        title="Lifetime Leaderboard"
        entries={lifetimeEntries}
        currentUserId={userId}
      />
    </div>
  );
}

export default async function ClubStatsPage({ params }: ClubStatsPageProps) {
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
    .select("name, settings")
    .eq("id", clubId)
    .single();
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
      <div className="">
        <div className="max-w-4xl mx-auto px-4 lg:px-6 py-6">
          {/* Header - Desktop only */}
          <div className="hidden md:block mb-6">
            <h1 className="text-lg font-semibold text-[var(--club-accent,var(--text-primary))]">
              Club Statistics
            </h1>
            <p className="text-xs text-[var(--text-muted)]">Leaderboards and performance metrics</p>
          </div>

          <Suspense
            fallback={
              <div className="space-y-6">
                <LeaderboardSkeleton title="Season Leaderboard" />
                <LeaderboardSkeleton title="Lifetime Leaderboard" />
              </div>
            }
          >
            <StatsContent clubId={clubId} userId={user.id} />
          </Suspense>

          {/* Advanced Stats */}
          <div className="mt-8">
            <Suspense
              fallback={
                <div className="space-y-6">
                  <Skeleton className="h-8 w-32" />
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                    {Array.from({ length: 4 }).map((_, i) => (
                      <Skeleton key={i} className="h-28 rounded-lg" />
                    ))}
                  </div>
                </div>
              }
            >
              <ClubAdvancedStats clubId={clubId} />
            </Suspense>
          </div>
        </div>
      </div>
    </>
  );
}
