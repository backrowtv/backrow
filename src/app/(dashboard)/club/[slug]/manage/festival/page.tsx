import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { FilmReel, CalendarBlank, Plus, CaretRight } from "@phosphor-icons/react/dist/ssr";
import { resolveClub } from "@/lib/clubs/resolveClub";
import { ClubNavigation } from "@/components/clubs/ClubNavigation";
import { MobileBackButton } from "@/components/profile/MobileBackButton";
import {
  CreateFestivalModal,
  EndlessFestivalSettings,
  FestivalPhaseControls,
} from "@/components/festivals";
import { FestivalRulesSettings } from "@/components/clubs/FestivalRulesSettings";
import { isFestivalTypeLocked } from "@/app/actions/clubs";
import Link from "next/link";
import { mergePreferences } from "@/lib/utils/merge-preferences";
import type { DefaultPhaseDuration } from "@/types/club-settings";
import { EmptyState } from "@/components/shared/EmptyState";

interface ManageFestivalPageProps {
  params: Promise<{ slug: string }>;
}

// Helper to format relative time with negative support
function formatDeadline(dateString: string | null): { text: string; isOverdue: boolean } {
  if (!dateString) return { text: "No deadline", isOverdue: false };

  const deadline = new Date(dateString);
  const now = new Date();
  const diffMs = deadline.getTime() - now.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  const diffHours = Math.floor(Math.abs(diffMs) / (1000 * 60 * 60));

  if (diffMs < 0) {
    // Overdue
    if (diffDays === 0 || diffDays === -1) {
      return { text: `${diffHours}h overdue`, isOverdue: true };
    }
    return { text: `${Math.abs(diffDays)}d overdue`, isOverdue: true };
  } else {
    // Upcoming
    if (diffDays === 0) {
      return { text: `${diffHours}h left`, isOverdue: false };
    }
    return { text: `${diffDays}d left`, isOverdue: false };
  }
}

// Helper to get phase label with dynamic rating label
function getPhaseLabel(phase: string, ratingsEnabled: boolean = true): string {
  switch (phase) {
    case "theme_selection":
      return "Theme Selection";
    case "nomination":
      return "Nominations Open";
    case "watch_rate":
      return ratingsEnabled ? "Watch & Rate" : "Watch";
    case "results":
      return "Results";
    default:
      return phase;
  }
}

// Helper to get deadline for current phase
function getCurrentDeadline(festival: {
  phase: string;
  nomination_deadline: string | null;
  rating_deadline: string | null;
}): string | null {
  if (festival.phase === "nomination") return festival.nomination_deadline;
  if (festival.phase === "watch_rate") return festival.rating_deadline;
  return null;
}

export default async function ManageFestivalPage({ params }: ManageFestivalPageProps) {
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

  // Get club info - include all dedicated festival setting columns
  const { data: club } = await supabase
    .from("clubs")
    .select(
      `
      name, settings, theme_color, theme_submissions_locked,
      themes_enabled, blind_nominations_enabled, allow_non_admin_nominations,
      max_nominations_per_user, max_themes_per_user, theme_governance, theme_voting_enabled,
      club_ratings_enabled, rating_min, rating_max, rating_increment,
      scoring_enabled, nomination_guessing_enabled, season_standings_enabled,
      auto_start_next_festival, results_reveal_type, results_reveal_direction, rubric_enforcement
    `
    )
    .eq("id", clubId)
    .single();

  // Merge dedicated columns into settings object for FestivalRulesSettings component
  const baseSettings = (club?.settings as Record<string, unknown>) || {};
  const clubSettings: Record<string, unknown> = {
    ...baseSettings,
    // Override with dedicated column values (these take precedence)
    ...mergePreferences(club as Record<string, unknown> | null, baseSettings, {
      themes_enabled: true,
      blind_nominations_enabled: false,
      allow_non_admin_nominations: true,
      max_nominations_per_user: 1,
      max_themes_per_user: 5,
      theme_governance: "democracy",
      theme_voting_enabled: true,
      club_ratings_enabled: true,
      rating_min: 0,
      rating_max: 10,
      rating_increment: 0.5,
      scoring_enabled: false,
      nomination_guessing_enabled: false,
      season_standings_enabled: true,
      auto_start_next_festival: false,
      results_reveal_type: "manual",
      results_reveal_direction: "backward",
      rubric_enforcement: "off",
    }),
  };
  const isEndlessFestival = clubSettings?.festival_type === "endless";
  const guessingEnabled = clubSettings?.nomination_guessing_enabled === true;
  const ratingsEnabled = clubSettings?.club_ratings_enabled !== false; // Default true

  // Check if festival type is locked for this season
  const festivalTypeLocked = await isFestivalTypeLocked(clubId);

  // Check for active festival
  const { data: activeFestival } = await supabase
    .from("festivals")
    .select(
      "id, theme, phase, status, start_date, nomination_deadline, rating_deadline, slug, auto_advance"
    )
    .eq("club_id", clubId)
    .neq("status", "completed")
    .neq("status", "cancelled")
    .limit(1)
    .maybeSingle();

  // Get nomination and rating counts for active festival
  let nominationCount = 0;
  let ratingCount = 0;
  let memberCount = 0;
  let participantProgress = { complete: 0, incomplete: 0 };

  if (activeFestival) {
    const [nominationsResult, ratingsResult, membersResult] = await Promise.all([
      supabase
        .from("nominations")
        .select("*", { count: "exact", head: true })
        .eq("festival_id", activeFestival.id)
        .is("deleted_at", null),
      supabase
        .from("ratings")
        .select("*", { count: "exact", head: true })
        .eq("festival_id", activeFestival.id),
      supabase.from("club_members").select("user_id").eq("club_id", clubId),
    ]);

    nominationCount = nominationsResult.count || 0;
    ratingCount = ratingsResult.count || 0;
    memberCount = membersResult.data?.length || 0;

    // Get participant progress if in watch_rate phase
    if (activeFestival.phase === "watch_rate" && nominationCount > 0) {
      const { data: userRatings } = await supabase
        .from("ratings")
        .select("user_id")
        .eq("festival_id", activeFestival.id);

      // Group by user and count
      const ratingsByUser: Record<string, number> = {};
      userRatings?.forEach((r) => {
        ratingsByUser[r.user_id] = (ratingsByUser[r.user_id] || 0) + 1;
      });

      const completeCount = Object.values(ratingsByUser).filter(
        (count) => count >= nominationCount
      ).length;
      participantProgress = { complete: completeCount, incomplete: memberCount - completeCount };
    }
  }

  // Fetch seasons
  const { data: seasons } = await supabase
    .from("seasons")
    .select("*")
    .eq("club_id", clubId)
    .order("start_date", { ascending: false })
    .limit(10);

  // Fetch themes
  const { data: themes } = await supabase
    .from("theme_pool")
    .select("*, added_by_user:added_by(id, display_name, username, avatar_url)")
    .eq("club_id", clubId)
    .order("created_at", { ascending: false });

  // Get deadline info for active festival
  const currentDeadline = activeFestival ? getCurrentDeadline(activeFestival) : null;
  const deadlineInfo = formatDeadline(currentDeadline);

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
              Festival Management
            </h1>
            <p className="text-xs text-[var(--text-muted)]">
              Create and manage your club&apos;s film festivals
            </p>
          </div>

          {/* Active Festival Section */}
          {activeFestival && (
            <section className="mb-6 space-y-4">
              {/* Festival Header - only for standard festivals */}
              {!isEndlessFestival && (
                <Link
                  href={`/club/${clubSlug}/festival/${activeFestival.slug || activeFestival.id}`}
                  className="block group"
                >
                  <div className="p-4 rounded-xl border border-[var(--border)] hover:border-[var(--text-muted)] transition-colors">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-[var(--surface-2)] text-[var(--text-muted)]">
                            {getPhaseLabel(activeFestival.phase, ratingsEnabled)}
                          </span>
                          {deadlineInfo.isOverdue && !activeFestival.auto_advance && (
                            <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-amber-600 text-white">
                              Ready to advance
                            </span>
                          )}
                        </div>
                        <h3 className="text-lg font-semibold text-[var(--text-primary)] group-hover:text-[var(--club-accent,var(--primary))] transition-colors truncate">
                          {activeFestival.theme || "Open Festival"}
                        </h3>
                        <p className="text-sm text-[var(--text-muted)] mt-0.5">
                          Started{" "}
                          {new Date(activeFestival.start_date).toLocaleDateString("en-US", {
                            month: "short",
                            day: "numeric",
                          })}
                          {currentDeadline && (
                            <span
                              className={
                                deadlineInfo.isOverdue ? "text-amber-600 dark:text-amber-400" : ""
                              }
                            >
                              {" · "}
                              {deadlineInfo.text}
                            </span>
                          )}
                        </p>
                      </div>
                      <CaretRight className="w-5 h-5 text-[var(--text-muted)] group-hover:text-[var(--text-primary)] transition-colors flex-shrink-0 mt-1" />
                    </div>

                    {/* Quick stats row */}
                    <div className="flex items-center gap-4 mt-3 pt-3 border-t border-[var(--border)]">
                      <div className="flex items-center gap-1.5 text-sm text-[var(--text-muted)]">
                        <FilmReel className="w-3.5 h-3.5" />
                        <span>
                          {nominationCount} movie{nominationCount !== 1 ? "s" : ""}
                        </span>
                      </div>
                      {activeFestival.phase === "watch_rate" && (
                        <div className="flex items-center gap-1.5 text-sm text-[var(--text-muted)]">
                          <span>
                            {participantProgress.complete}/{memberCount} finished
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                </Link>
              )}

              {/* Phase Controls - only for standard festivals */}
              {!isEndlessFestival && (
                <FestivalPhaseControls
                  festivalId={activeFestival.id}
                  currentPhase={
                    activeFestival.phase as
                      | "theme_selection"
                      | "nomination"
                      | "watch_rate"
                      | "results"
                  }
                  hasTheme={!!activeFestival.theme}
                  nominationCount={nominationCount}
                  ratingCount={ratingCount}
                  guessingEnabled={guessingEnabled}
                />
              )}

              {/* Festival Settings - for endless festivals */}
              {isEndlessFestival && (
                <EndlessFestivalSettings
                  festivalId={activeFestival.id}
                  currentTheme={activeFestival.theme}
                  clubSlug={clubSlug}
                  clubId={clubId}
                  themePoolEnabled={clubSettings?.theme_pool_enabled !== false}
                  showTitleEnabled={clubSettings?.endless_festival_show_title !== false}
                  festivalLink={`/club/${clubSlug}/endless`}
                  phaseLabel={getPhaseLabel(activeFestival.phase, ratingsEnabled)}
                  startDate={activeFestival.start_date}
                  nominationCount={nominationCount}
                  memberCount={memberCount}
                  participantProgress={participantProgress}
                  phase={activeFestival.phase}
                />
              )}
            </section>
          )}

          {/* Create Festival Section — only for standard festivals (endless clubs don't create festivals here) */}
          {!activeFestival && !isEndlessFestival && (
            <section className="mb-6">
              {seasons && seasons.length > 0 ? (
                <CreateFestivalModal
                  seasons={seasons}
                  themes={themes || []}
                  clubId={clubId}
                  clubSettings={{
                    default_nomination_duration: baseSettings.default_nomination_duration as
                      | DefaultPhaseDuration
                      | undefined,
                    default_watch_rate_duration: baseSettings.default_watch_rate_duration as
                      | DefaultPhaseDuration
                      | undefined,
                    theme_governance: baseSettings.theme_governance as
                      | "democracy"
                      | "random"
                      | "autocracy"
                      | undefined,
                    themes_enabled: baseSettings.themes_enabled as boolean | undefined,
                    rubric_enforcement: baseSettings.rubric_enforcement as "off" | "suggested" | "required" | undefined,
                    nomination_guessing_enabled: baseSettings.nomination_guessing_enabled as boolean | undefined,
                  }}
                  trigger={
                    <div className="p-4 rounded-xl border border-dashed border-[var(--border)] hover:border-[var(--text-muted)] transition-colors cursor-pointer group">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-[var(--surface-2)] flex items-center justify-center group-hover:bg-[var(--club-accent,var(--primary))]/10 transition-colors">
                          <Plus className="w-5 h-5 text-[var(--text-muted)] group-hover:text-[var(--club-accent,var(--primary))] transition-colors" />
                        </div>
                        <div className="flex-1">
                          <p className="text-sm font-medium text-[var(--text-primary)]">
                            Create New Festival
                          </p>
                          <p className="text-xs text-[var(--text-muted)]">
                            Start a new festival for your club
                          </p>
                        </div>
                        <CaretRight className="w-4 h-4 text-[var(--text-muted)] group-hover:text-[var(--text-primary)] transition-colors" />
                      </div>
                    </div>
                  }
                />
              ) : (
                <Link href={`/club/${clubSlug}/manage/season`}>
                  <div className="p-4 rounded-xl border border-dashed border-[var(--border)] hover:border-[var(--text-muted)] transition-colors cursor-pointer group">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-[var(--surface-2)] flex items-center justify-center">
                        <CalendarBlank className="w-5 h-5 text-[var(--text-muted)]" />
                      </div>
                      <div className="flex-1">
                        <p className="text-sm font-medium text-[var(--text-primary)]">
                          Create a Season First
                        </p>
                        <p className="text-xs text-[var(--text-muted)]">
                          Seasons organize your festivals
                        </p>
                      </div>
                      <CaretRight className="w-4 h-4 text-[var(--text-muted)] group-hover:text-[var(--text-primary)] transition-colors" />
                    </div>
                  </div>
                </Link>
              )}
            </section>
          )}

          {/* Empty State */}
          {!activeFestival && (
            <div className="mb-6">
              <EmptyState
                icon={FilmReel}
                title="No active festival"
                message="Create a festival to get started"
                variant="inline"
              />
            </div>
          )}

          {/* Festival Rules Settings */}
          <section className="border-t border-[var(--border)] pt-6">
            <FestivalRulesSettings
              clubId={clubId}
              clubSlug={clubSlug}
              settings={clubSettings}
              festivalType={(clubSettings?.festival_type as string) ?? "standard"}
              themeSubmissionsLocked={club?.theme_submissions_locked || false}
              festivalTypeLocked={festivalTypeLocked}
            />
          </section>
        </div>
      </div>
    </>
  );
}
