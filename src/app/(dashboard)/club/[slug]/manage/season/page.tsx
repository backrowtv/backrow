import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { CalendarBlank, Plus, CaretRight } from "@phosphor-icons/react/dist/ssr";
import { resolveClub } from "@/lib/clubs/resolveClub";
import { ClubNavigation } from "@/components/clubs/ClubNavigation";
import { MobileBackButton } from "@/components/profile/MobileBackButton";
import { SeasonCard } from "@/components/seasons/SeasonCard";
import { CreateSeasonModal } from "@/components/seasons/CreateSeasonModal";

interface DirectorSeasonPageProps {
  params: Promise<{ slug: string }>;
}

export default async function DirectorSeasonPage({ params }: DirectorSeasonPageProps) {
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

  // Check if user is a member and admin
  const { data: membership } = await supabase
    .from("club_members")
    .select("role")
    .eq("club_id", clubId)
    .eq("user_id", user.id)
    .maybeSingle();

  if (!membership) {
    redirect("/clubs");
  }

  const isAdmin = membership?.role === "producer" || membership?.role === "director";
  const isProducer = membership?.role === "producer" || false;

  // Only directors and producers can access this page
  if (!isAdmin) {
    redirect(`/club/${clubSlug}`);
  }

  // Get club info
  const { data: club } = await supabase
    .from("clubs")
    .select("name, settings")
    .eq("id", clubId)
    .single();

  // Seasons page is accessible for all clubs — even Endless clubs may have paused seasons to manage
  const _clubSettings = club?.settings as Record<string, unknown> | null;

  // Fetch seasons with festival count
  const { data: seasons } = await supabase
    .from("seasons")
    .select(
      `
      *,
      festivals:festivals(count)
    `
    )
    .eq("club_id", clubId)
    .order("start_date", { ascending: false })
    .limit(20);

  // Transform to include festival count
  const seasonsWithCount =
    seasons?.map((s) => ({
      ...s,
      festival_count: s.festivals?.[0]?.count || 0,
    })) || [];

  // Check for active season
  const now = new Date();
  const activeSeason = seasonsWithCount.find((season) => {
    const start = new Date(season.start_date);
    const end = new Date(season.end_date);
    return start <= now && end >= now;
  });

  // Calculate next season number
  const nextSeasonNumber = (seasons?.length || 0) + 1;

  // Past seasons (not active)
  const pastSeasons = seasonsWithCount.filter((s) => s.id !== activeSeason?.id);

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
          {/* Mobile Back Button */}
          <MobileBackButton href={`/club/${clubSlug}/manage`} label="Manage" />

          {/* Header - Hidden on mobile since TopNav shows club name */}
          <div className="hidden lg:block mb-6">
            <h1 className="text-lg font-semibold text-[var(--club-accent,var(--text-primary))]">
              Season Management
            </h1>
            <p className="text-xs text-[var(--text-muted)]">Organize your festivals into seasons</p>
          </div>

          {/* Active Season */}
          {activeSeason && (
            <section className="mb-6">
              <SeasonCard season={activeSeason} clubId={clubId} isActive />
            </section>
          )}

          {/* Create Season */}
          {!activeSeason && (
            <section className="mb-6">
              <CreateSeasonModal
                clubId={clubId}
                nextSeasonNumber={nextSeasonNumber}
                trigger={
                  <div className="p-4 rounded-xl border border-dashed border-[var(--border)] hover:border-[var(--text-muted)] transition-colors cursor-pointer group">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-[var(--surface-2)] flex items-center justify-center group-hover:bg-[var(--club-accent,var(--primary))]/10 transition-colors">
                        <Plus className="w-5 h-5 text-[var(--text-muted)] group-hover:text-[var(--club-accent,var(--primary))] transition-colors" />
                      </div>
                      <div className="flex-1">
                        <p className="text-sm font-medium text-[var(--text-primary)]">
                          {seasons && seasons.length > 0
                            ? "Start New Season"
                            : "Create First Season"}
                        </p>
                        <p className="text-xs text-[var(--text-muted)]">
                          {seasons && seasons.length > 0
                            ? "Begin a fresh season for your club"
                            : "Seasons organize your festivals into time periods"}
                        </p>
                      </div>
                      <CaretRight className="w-4 h-4 text-[var(--text-muted)] group-hover:text-[var(--text-primary)] transition-colors" />
                    </div>
                  </div>
                }
              />
            </section>
          )}

          {/* Past Seasons */}
          {pastSeasons.length > 0 && (
            <section className="border-t border-[var(--border)] pt-6">
              <h2 className="text-sm font-semibold text-[var(--text-muted)] mb-4">Past Seasons</h2>
              <div className="space-y-2">
                {pastSeasons.map((season) => (
                  <SeasonCard
                    key={season.id}
                    season={season}
                    clubId={clubId}
                    clubSlug={clubSlug}
                    isActive={false}
                    compact
                  />
                ))}
              </div>
            </section>
          )}

          {/* Empty State */}
          {(!seasons || seasons.length === 0) && (
            <div className="text-center py-8 text-[var(--text-muted)]">
              <CalendarBlank className="w-8 h-8 mx-auto mb-2 opacity-50" />
              <p className="text-sm">
                No seasons yet. Create your first season to start organizing festivals.
              </p>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
