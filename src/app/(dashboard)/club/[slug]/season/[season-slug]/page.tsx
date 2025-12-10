import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { FestivalCard } from "@/components/festivals";
import { Section, Container } from "@/components/ui/section";
import { Heading, Text } from "@/components/ui/typography";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { DateDisplay } from "@/components/ui/date-display";
import { EmptyState } from "@/components/shared/EmptyState";
import { FilmReel } from "@phosphor-icons/react/dist/ssr";
import { checkAndRolloverSeasons, getSeasonWrapStats } from "@/app/actions/seasons";
import { SeasonWrap } from "@/components/clubs/SeasonWrap";
import { resolveClub } from "@/lib/clubs/resolveClub";
import { resolveSeason } from "@/lib/clubs/resolveSeason";
import { ClubNavigation } from "@/components/clubs/ClubNavigation";

interface SeasonDetailPageProps {
  params: Promise<{ slug: string; "season-slug": string }>;
}

export default async function SeasonDetailPage({ params }: SeasonDetailPageProps) {
  const { slug: clubIdentifier, "season-slug": seasonIdentifier } = await params;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/sign-in");
  }

  // Resolve club by slug or ID
  const clubResolution = await resolveClub(supabase, clubIdentifier);
  if (!clubResolution) redirect("/clubs");

  const clubId = clubResolution.id;
  const clubSlug = clubResolution.slug || clubId;

  // Check if user is a member
  const { data: membership } = await supabase
    .from("club_members")
    .select("role")
    .eq("club_id", clubId)
    .eq("user_id", user.id)
    .single();

  if (!membership) {
    redirect("/clubs");
  }

  // Resolve season by slug or ID
  const seasonResolution = await resolveSeason(supabase, clubId, seasonIdentifier);
  if (!seasonResolution) redirect(`/club/${clubSlug}/history`);

  const seasonId = seasonResolution.id;
  const seasonSlug = seasonResolution.slug || seasonId;

  // Check and auto-rollover seasons if needed
  await checkAndRolloverSeasons();

  // Get club name
  const { data: club } = await supabase.from("clubs").select("name").eq("id", clubId).single();

  // Get season
  const { data: season } = await supabase
    .from("seasons")
    .select("name, subtitle, start_date, end_date")
    .eq("id", seasonId)
    .eq("club_id", clubId)
    .single();

  if (!season) {
    redirect(`/club/${clubSlug}/history`);
  }

  // Get festivals in this season
  const { data: festivals } = await supabase
    .from("festivals")
    .select("*")
    .eq("season_id", seasonId)
    .eq("club_id", clubId)
    .order("start_date", { ascending: false });

  // Calculate season status
  const startDate = new Date(season.start_date);
  const endDate = new Date(season.end_date);
  const now = new Date();

  const isActive = now >= startDate && now <= endDate;
  const isUpcoming = now < startDate;
  const isCompleted = now > endDate;

  let statusVariant: "default" | "success" | "primary" = "default";
  let statusText = "Completed";

  if (isActive) {
    statusVariant = "success";
    statusText = "Active";
  } else if (isUpcoming) {
    statusVariant = "primary";
    statusText = "Upcoming";
  }

  // Get season wrap stats if season is completed
  const wrapStatsResult = isCompleted ? await getSeasonWrapStats(clubId, seasonId) : null;
  const wrapStats = wrapStatsResult?.data;

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
      <Section variant="default" fullWidth>
        <Container className="p-6 md:p-8">
          <div className="mb-6 animate-fade-in">
            <div
              className="flex items-center gap-2 mb-4 animate-fade-in"
              style={{ animationDelay: "100ms" }}
            >
              <div
                className="w-1 h-8 rounded-full transition-all duration-200"
                style={{
                  background:
                    "linear-gradient(to bottom, var(--club-accent, var(--primary)), var(--club-accent, var(--primary-500)))",
                }}
              />
              <div className="flex-1">
                <Heading level={1}>{season.name}</Heading>
                {season.subtitle && (
                  <Text size="small" muted className="mt-1">
                    {season.subtitle}
                  </Text>
                )}
              </div>
              <Badge
                variant={statusVariant}
                className="transition-all duration-200 hover:scale-105"
              >
                {statusText}
              </Badge>
            </div>
            {club && (
              <Text
                size="small"
                muted
                className="ml-3 animate-fade-in"
                style={{ animationDelay: "200ms" }}
              >
                {club.name}
              </Text>
            )}
          </div>

          <div className="mb-6 animate-fade-in" style={{ animationDelay: "300ms" }}>
            <Card variant="default" hover className="transition-all duration-200">
              <CardHeader>
                <CardTitle>Season Information</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-6">
                  <Text size="small" muted>
                    <span className="font-medium">Start Date:</span>{" "}
                    <DateDisplay date={season.start_date} format="date" />
                  </Text>
                  <Text size="small" muted>
                    <span className="font-medium">End Date:</span>{" "}
                    <DateDisplay date={season.end_date} format="date" />
                  </Text>
                  <Text size="small" muted>
                    <span className="font-medium">Festivals:</span> {festivals?.length || 0}
                  </Text>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Season Wrap (only show for completed seasons) */}
          {isCompleted && wrapStats && (
            <div className="mb-6">
              <SeasonWrap
                seasonSlug={seasonSlug}
                clubSlug={clubSlug}
                seasonName={season.name}
                startDate={season.start_date}
                endDate={season.end_date}
                stats={wrapStats}
              />
            </div>
          )}

          <div className="mb-6 animate-fade-in" style={{ animationDelay: "400ms" }}>
            <div className="flex items-center gap-2 mb-4">
              <div
                className="w-1 h-8 rounded-full transition-all duration-200"
                style={{
                  background:
                    "linear-gradient(to bottom, var(--club-accent, var(--primary)), var(--club-accent, var(--primary-500)))",
                }}
              />
              <Heading level={2}>Festivals</Heading>
            </div>
          </div>

          {!festivals || festivals.length === 0 ? (
            <EmptyState
              icon={FilmReel}
              title="No festivals yet"
              message="Festivals created for this season will appear here."
              variant="card"
            />
          ) : (
            <div
              className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6 animate-fade-in"
              style={{ animationDelay: "500ms" }}
            >
              {festivals.map((festival, index) => (
                <div
                  key={festival.id}
                  className="animate-fade-in"
                  style={{ animationDelay: `${600 + index * 50}ms` }}
                >
                  <FestivalCard festival={festival} clubSlug={clubSlug} />
                </div>
              ))}
            </div>
          )}
        </Container>
      </Section>
    </>
  );
}
