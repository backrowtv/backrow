import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { getClubForMetadata } from "@/lib/seo/fetchers";
import { absoluteUrl } from "@/lib/seo/absolute-url";
import { ClubJsonLd } from "@/components/seo/JsonLd";
import { PublicClubLanding } from "@/components/clubs/PublicClubLanding";
import { notFound } from "next/navigation";
import Link from "next/link";
import { Suspense } from "react";
import { BrandText } from "@/components/ui/brand-text";
import { CaretRight, Gear, Sliders } from "@phosphor-icons/react/dist/ssr";
import { UnifiedClubCard } from "@/components/clubs/UnifiedClubCard";
import { FestivalHeroCardSkeleton } from "@/components/festivals/display/FestivalHeroCard";

import { resolveClub } from "@/lib/clubs/resolveClub";
import { ClubNavigation } from "@/components/clubs/ClubNavigation";
import { ClubThemedBackground } from "@/components/clubs/ClubThemedBackground";
import { AnnouncementsList } from "@/components/clubs/AnnouncementsList";
import { ClubCalendar } from "@/components/calendar/ClubCalendar";
import { CollapsibleUpcomingDates } from "@/components/calendar/CollapsibleUpcomingDates";
import {
  CollapsibleThemePool,
  CollapsibleMoviePool,
  CreateFestivalModal,
  FestivalHeroCardClient,
  NoActiveFestivalCard,
  RecentlyPlayedShelf,
} from "@/components/festivals";
// Server Components - import directly
import { FestivalCarouselSection } from "@/components/festivals/display/FestivalCarouselSection";
import { EndlessFestivalSection } from "@/components/festivals/endless/EndlessFestivalSection";
import { getEndlessFestivalData } from "@/app/actions/endless-festival";
import type { EndlessMovie } from "@/app/actions/endless-festival";
import { PollsList } from "@/components/clubs/PollsList";
import { JoinClubButton } from "@/components/clubs/JoinClubButton";
import { CollapsibleRecentActivity } from "@/components/activity/CollapsibleRecentActivity";
import {
  getClubActivityFeed,
  groupActivities,
  enrichWithMoviePosters,
  type GroupedActivity,
} from "@/lib/activity/club-activity-feed";
import { CollapsibleRecentDiscussions } from "@/components/discussions/CollapsibleRecentDiscussions";
import { CollapsibleClubResources } from "@/components/clubs/CollapsibleClubResources";
import { getClubResources } from "@/app/actions/club-resources";
import { getThemePoolVotes } from "@/app/actions/themes";
import type { DiscussionAvatarType } from "@/components/discussions/DiscussionAvatar";
import type { FestivalType, ThemeGovernance, DefaultPhaseDuration } from "@/types/club-settings";
import type { ClubEvent, RSVPStatus } from "@/app/actions/events";
// extractFestivalType is available from "@/types/supabase-helpers" if needed

interface ClubPageProps {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: ClubPageProps): Promise<Metadata> {
  const { slug } = await params;
  const club = await getClubForMetadata(slug);
  if (!club) {
    return { title: "Club not found · BackRow", robots: { index: false, follow: false } };
  }
  const url = absoluteUrl(`/club/${club.slug ?? slug}`);
  const description = club.description?.slice(0, 160) || `${club.name} — a BackRow movie club.`;
  const isPublic = club.privacy !== "private";
  return {
    title: `${club.name} · BackRow`,
    description,
    alternates: { canonical: url },
    openGraph: {
      title: club.name,
      description,
      url,
      type: "website",
      siteName: "BackRow",
    },
    twitter: { card: "summary_large_image", title: club.name, description },
    robots: isPublic ? { index: true, follow: true } : { index: false, follow: false },
  };
}

export default async function ClubPage({ params }: ClubPageProps) {
  const identifier = (await params).slug;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Anonymous visitor (crawler, shared link, first-time landing):
  // render a public landing for PUBLIC clubs so the OG/JSON-LD unfurl; redirect
  // to sign-in for PRIVATE clubs so we never leak their existence.
  if (!user) {
    // Branch on UUID vs slug instead of .or(slug.eq,id.eq): PostgREST casts the
    // right-hand side of id.eq to uuid and errors the whole query when we pass
    // a slug string. That error path used to return null → notFound() → 404 +
    // meta robots="noindex" for every anon visit, breaking the public landing
    // and SEO.
    const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
      identifier
    );
    const clubQuery = supabase
      .from("clubs")
      .select("id, name, slug, description, theme_color, picture_url, privacy, archived");
    const { data: publicClub } = isUUID
      ? await clubQuery.eq("id", identifier).maybeSingle()
      : await clubQuery.eq("slug", identifier).maybeSingle();

    if (!publicClub || publicClub.archived) notFound();
    if (publicClub.privacy === "private") {
      redirect(`/sign-in?redirectTo=${encodeURIComponent(`/club/${identifier}`)}`);
    }

    // Parallel fetch of the teaser data RLS permits for public clubs.
    const [{ count: memberCount }, { data: activeFestivalRow }, { data: recentNoms }] =
      await Promise.all([
        supabase
          .from("club_members")
          .select("user_id", { count: "exact", head: true })
          .eq("club_id", publicClub.id),
        supabase
          .from("festivals")
          .select("theme, slug, status, phase, poster_url, picture_url")
          .eq("club_id", publicClub.id)
          .is("deleted_at", null)
          .not("status", "in", "(completed,cancelled)")
          .order("start_date", { ascending: false })
          .limit(1)
          .maybeSingle(),
        supabase
          .from("nominations")
          .select("tmdb_id, festivals!inner(club_id)")
          .eq("festivals.club_id", publicClub.id)
          .is("deleted_at", null)
          .order("created_at", { ascending: false })
          .limit(24),
      ]);

    const recentTmdbIds = Array.from(
      new Set((recentNoms ?? []).map((n) => n.tmdb_id).filter((id): id is number => !!id))
    ).slice(0, 8);
    const posterStrip: string[] = [];
    if (recentTmdbIds.length > 0) {
      const { data: movies } = await supabase
        .from("movies")
        .select("tmdb_id, poster_url")
        .in("tmdb_id", recentTmdbIds)
        .not("poster_url", "is", null);
      const byId = new Map<number, string>();
      for (const m of movies ?? []) {
        if (m.poster_url) byId.set(m.tmdb_id, m.poster_url);
      }
      for (const id of recentTmdbIds) {
        const url = byId.get(id);
        if (url) posterStrip.push(url);
      }
    }

    return (
      <PublicClubLanding
        club={{
          id: publicClub.id,
          name: publicClub.name,
          slug: publicClub.slug,
          description: publicClub.description,
          theme_color: publicClub.theme_color,
          picture_url: publicClub.picture_url,
        }}
        clubUrlSlug={publicClub.slug ?? identifier}
        memberCount={memberCount ?? 0}
        activeFestival={
          activeFestivalRow
            ? {
                theme: activeFestivalRow.theme,
                slug: activeFestivalRow.slug,
                status: activeFestivalRow.status,
                phase: activeFestivalRow.phase,
                posterUrl: activeFestivalRow.poster_url ?? activeFestivalRow.picture_url,
              }
            : null
        }
        posterStrip={posterStrip.slice(0, 6)}
      />
    );
  }

  // Resolve club by slug or ID
  const clubResolution = await resolveClub(supabase, identifier);
  if (!clubResolution) redirect("/clubs");

  const clubId = clubResolution.id;
  const clubSlug = clubResolution.slug || clubId;

  // Fetch all data in parallel
  const [{ data: club, error: clubError }, { data: membership }] = await Promise.all([
    supabase.from("clubs").select("*, users:producer_id(*)").eq("id", clubId).single(),
    supabase
      .from("club_members")
      .select("*")
      .eq("club_id", clubId)
      .eq("user_id", user.id)
      .maybeSingle(),
  ]);

  if (clubError || !club) redirect("/clubs");

  const isMember = !!membership;
  const isAdmin = membership?.role === "producer" || membership?.role === "director";
  const memberPrefs = (membership?.preferences as Record<string, unknown>) || {};
  const cardCollapsed = memberPrefs.card_collapsed === true;

  // Fetch additional data (including favorite check) in parallel
  const now = new Date().toISOString();
  const [
    { data: favorite },
    { data: activeFestival },
    { data: members },
    { data: announcements },
    { data: completedFestivals },
    { data: themes },
    { count: _totalFestivals },
    { count: completedFestivalsCount },
    { data: seasons },
    { data: upcomingEvents },
    { data: activePolls },
    { data: recentDiscussions },
  ] = await Promise.all([
    supabase
      .from("favorite_clubs")
      .select("club_id")
      .eq("user_id", user.id)
      .eq("club_id", clubId)
      .maybeSingle(),
    supabase
      .from("festivals")
      .select("*")
      .eq("club_id", clubId)
      .neq("status", "completed")
      .neq("status", "cancelled")
      .order("start_date", { ascending: false })
      .limit(1)
      .maybeSingle(),
    supabase.from("club_members").select("*, user:user_id(*)").eq("club_id", clubId),
    supabase
      .from("club_announcements")
      .select("*")
      .eq("club_id", clubId)
      .or("expires_at.is.null,expires_at.gte.now()")
      .order("created_at", { ascending: false })
      .limit(3),
    supabase
      .from("festivals")
      .select("id, slug, theme, results_date")
      .eq("club_id", clubId)
      .eq("status", "completed")
      .order("results_date", { ascending: false })
      .limit(5),
    supabase
      .from("theme_pool")
      .select("*, added_by_user:added_by(id, display_name, username, avatar_url)")
      .eq("club_id", clubId)
      .order("created_at", { ascending: false }),
    supabase.from("festivals").select("*", { count: "exact", head: true }).eq("club_id", clubId),
    supabase
      .from("festivals")
      .select("*", { count: "exact", head: true })
      .eq("club_id", clubId)
      .eq("status", "completed"),
    supabase
      .from("seasons")
      .select("*")
      .eq("club_id", clubId)
      .order("start_date", { ascending: false })
      .limit(10),
    supabase
      .from("club_events")
      .select(
        "*, creator:created_by(id, display_name, avatar_url), movie:tmdb_id(tmdb_id, title, poster_url)"
      )
      .eq("club_id", clubId)
      .in("status", ["upcoming", "ongoing"])
      .gte("event_date", now)
      .order("event_date", { ascending: true })
      .limit(3),
    supabase
      .from("club_polls")
      .select("*, user:user_id(id, display_name, avatar_url)")
      .eq("club_id", clubId)
      .or(`expires_at.is.null,expires_at.gte.${now}`)
      .order("created_at", { ascending: false })
      .limit(3),
    supabase
      .from("discussion_threads")
      .select(
        `
      id, slug, title, content, thread_type, is_pinned, is_locked, is_spoiler, comment_count, created_at, updated_at,
      tmdb_id, festival_id,
      author:author_id(id, display_name, avatar_url),
      movie:tmdb_id(poster_url),
      festival:festival_id(theme, poster_url)
    `
      )
      .eq("club_id", clubId)
      .order("is_pinned", { ascending: false })
      .order("updated_at", { ascending: false })
      .limit(5),
  ]);

  const isFavorite = !!favorite;

  // Fetch activities using the standardized activity feed system
  // Fetch 50 raw items to ensure enough remain after grouping (displays 5)
  const rawActivities = await getClubActivityFeed(user.id, { clubId, limit: 50 });
  const groupedRaw = groupActivities(rawActivities);
  const activities: GroupedActivity[] = await enrichWithMoviePosters(groupedRaw);

  // Fetch club resources
  const clubResources = await getClubResources(clubId);

  // Fetch theme pool votes if theme voting is enabled
  const themeVotingEnabled =
    (club.settings as Record<string, unknown>)?.theme_voting_enabled !== false;
  const themeVotes =
    themeVotingEnabled && themes && themes.length > 0
      ? await getThemePoolVotes(clubId)
      : { data: null };
  const initialThemeVotes = themeVotes.data || undefined;

  // Fetch movies watched count from completed festivals
  let moviesWatchedCount = 0;

  if (completedFestivals && completedFestivals.length > 0) {
    const festivalIds = completedFestivals.map((f) => f.id);

    const { data: nominations } = await supabase
      .from("nominations")
      .select("tmdb_id")
      .in("festival_id", festivalIds)
      .not("tmdb_id", "is", null)
      .is("deleted_at", null);

    if (nominations) {
      moviesWatchedCount = new Set(nominations.map((n) => n.tmdb_id)).size;
    }
  }

  // Get user's RSVPs - fetch user RSVPs and all RSVPs in parallel
  const userRsvpMap = new Map<string, RSVPStatus>();
  if (upcomingEvents && upcomingEvents.length > 0) {
    const eventIds = upcomingEvents.map((e) => e.id);

    // Fetch both user RSVPs and all RSVPs in parallel
    const [{ data: rsvps }, { data: allRsvps }] = await Promise.all([
      supabase
        .from("club_event_rsvps")
        .select("event_id, status")
        .eq("user_id", user.id)
        .in("event_id", eventIds),
      supabase.from("club_event_rsvps").select("event_id, status").in("event_id", eventIds),
    ]);

    rsvps?.forEach((r) => userRsvpMap.set(r.event_id, r.status as RSVPStatus));

    // Build RSVP count map in a single pass instead of filtering per-event
    const rsvpCounts = new Map<string, { going: number; maybe: number; not_going: number }>();
    allRsvps?.forEach((r) => {
      if (!rsvpCounts.has(r.event_id)) {
        rsvpCounts.set(r.event_id, { going: 0, maybe: 0, not_going: 0 });
      }
      const counts = rsvpCounts.get(r.event_id)!;
      if (r.status === "going") counts.going++;
      else if (r.status === "maybe") counts.maybe++;
      else if (r.status === "not_going") counts.not_going++;
    });
    upcomingEvents.forEach((event: ClubEvent) => {
      event.rsvp_counts = rsvpCounts.get(event.id) || { going: 0, maybe: 0, not_going: 0 };
    });
  }

  const clubSettings = (club.settings as Record<string, unknown>) || {};
  const festivalType = (clubSettings.festival_type || "standard") as FestivalType;
  const themeGovernance = (clubSettings.theme_governance || "democracy") as ThemeGovernance;

  // Breadcrumb visibility settings
  const themesEnabled = clubSettings.themes_enabled !== false; // Default true
  const scoringEnabled = clubSettings.club_ratings_enabled !== false; // Default true
  const guessingEnabled = clubSettings.nomination_guessing_enabled === true; // Default false

  // Check if current phase auto-advances (scheduled timing)
  const nominationTiming = clubSettings.nomination_timing as { type?: string } | undefined;
  const watchRateTiming = clubSettings.watch_rate_timing as { type?: string } | undefined;
  const isAutoAdvance = (() => {
    if (!activeFestival) return false;
    const phase = activeFestival.phase;
    if (phase === "theme_selection" || phase === "nomination") {
      return nominationTiming?.type === "scheduled";
    }
    if (phase === "watch_rate") {
      return watchRateTiming?.type === "scheduled";
    }
    return false;
  })();

  // Fetch recently played movies for endless mode clubs (for sidebar display)
  let recentlyPlayedMovies: EndlessMovie[] = [];
  const recentlyPlayedDiscussionThreads: Record<number, { id: string; slug: string | null }> = {};

  if (festivalType === "endless") {
    const endlessData = await getEndlessFestivalData(clubId);
    if (!("error" in endlessData) && endlessData.recentlyPlayed.length > 0) {
      recentlyPlayedMovies = endlessData.recentlyPlayed;

      // Fetch discussion threads for recently played movies
      const recentlyPlayedTmdbIds = endlessData.recentlyPlayed.map((m) => m.tmdb_id);
      const { data: threadData } = await supabase
        .from("discussion_threads")
        .select("id, slug, tmdb_id")
        .eq("club_id", clubId)
        .in("tmdb_id", recentlyPlayedTmdbIds);

      if (threadData) {
        for (const thread of threadData) {
          if (thread.tmdb_id) {
            recentlyPlayedDiscussionThreads[thread.tmdb_id] = { id: thread.id, slug: thread.slug };
          }
        }
      }
    }
  }

  // Get nomination and rating counts for active festival
  let nominationCount = 0;
  let ratingCount = 0;
  let userHasNominated = false;
  let userHasRated = false;
  let topNominations: Array<{
    id: string;
    tmdb_id: number;
    movie_title: string;
    poster_url: string | null;
    nominator_name: string;
  }> = [];
  let topThemes: Array<{ id: string; theme_name: string; votes: number }> = [];

  if (activeFestival) {
    const [nominationsResult, ratingsResult, userNominationResult, topNomsResult] =
      await Promise.all([
        supabase
          .from("nominations")
          .select("id", { count: "exact", head: true })
          .eq("festival_id", activeFestival.id)
          .is("deleted_at", null),
        supabase
          .from("ratings")
          .select("id", { count: "exact", head: true })
          .eq("festival_id", activeFestival.id),
        supabase
          .from("nominations")
          .select("id")
          .eq("festival_id", activeFestival.id)
          .eq("user_id", user.id)
          .is("deleted_at", null)
          .maybeSingle(),
        supabase
          .from("nominations")
          .select("id, tmdb_id, movies:tmdb_id(title, poster_url), users:user_id(display_name)")
          .eq("festival_id", activeFestival.id)
          .is("deleted_at", null)
          .order("created_at", { ascending: false })
          .limit(5),
      ]);

    nominationCount = nominationsResult.count || 0;
    ratingCount = ratingsResult.count || 0;
    userHasNominated = !!userNominationResult.data;

    topNominations = (topNomsResult.data || []).map((nom) => {
      const movie = Array.isArray(nom.movies) ? nom.movies[0] : nom.movies;
      const nominator = Array.isArray(nom.users) ? nom.users[0] : nom.users;
      return {
        id: nom.id,
        tmdb_id: nom.tmdb_id,
        movie_title: movie?.title || "Unknown",
        poster_url: movie?.poster_url || null,
        nominator_name: nominator?.display_name || "Member",
      };
    });

    const { data: userRating } = await supabase
      .from("ratings")
      .select("id")
      .eq("festival_id", activeFestival.id)
      .eq("user_id", user.id)
      .limit(1)
      .maybeSingle();
    userHasRated = !!userRating;

    // Populate themes for theme selection phase from already fetched themes
    // Use all unused themes, sorted by upvotes (highest first)
    if (activeFestival.phase === "theme_selection" && themes) {
      topThemes = themes
        .filter((t) => !t.is_used)
        .sort(
          (a, b) => (b.upvotes || 0) - (b.downvotes || 0) - ((a.upvotes || 0) - (a.downvotes || 0))
        )
        .map((t) => ({
          id: t.id,
          theme_name: t.theme_name,
          votes: (t.upvotes || 0) - (t.downvotes || 0),
        }));
    }
  }

  return (
    <>
      <ClubJsonLd
        club={{
          name: club.name,
          slug: club.slug ?? clubSlug,
          description: club.description,
          picture_url: club.picture_url,
        }}
        festivals={completedFestivals ?? undefined}
      />
      <ClubNavigation
        clubSlug={clubSlug}
        clubName={club.name}
        isAdmin={isAdmin}
        isProducer={membership?.role === "producer" || false}
      />
      <div className="relative">
        {/* Club Theme Color - sets CSS variables for accent colors */}
        <ClubThemedBackground
          themeColor={club.theme_color}
          backgroundType={club.background_type}
          backgroundValue={club.background_value}
        />
        {/* Main Content - 3 Column Layout - z-10 to render above background */}
        <div className="relative z-10 max-w-7xl mx-auto px-4 lg:px-6 py-4 lg:py-6">
          {/* Non-member CTA */}
          {!isMember && (
            <div className="mb-4 p-3 rounded-lg bg-[var(--surface-1)] flex items-center justify-between">
              <div>
                <h3 className="font-semibold text-[var(--text-primary)] mb-0.5">
                  Join <BrandText>{club.name}</BrandText>
                </h3>
                <p className="text-xs text-[var(--text-muted)]">
                  Become a member to participate in festivals
                </p>
              </div>
              <JoinClubButton
                clubId={clubId}
                clubName={club.name}
                clubSlug={clubSlug}
                privacy={club.privacy}
                variant="club-accent"
                size="sm"
              />
            </div>
          )}

          {/* Member Content - 3 Column Grid */}
          {isMember && (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 lg:gap-6">
              {/* Left Sidebar - Desktop Only */}
              <aside className="hidden lg:block lg:col-span-3 space-y-4">
                {/* Club Card */}
                <UnifiedClubCard
                  club={{
                    id: club.id,
                    name: club.name,
                    slug: clubSlug,
                    description: club.description,
                    picture_url: club.picture_url,
                    privacy: club.privacy,
                    settings: club.settings,
                    avatar_icon: club.avatar_icon,
                    avatar_color_index: club.avatar_color_index,
                    avatar_border_color_index: club.avatar_border_color_index,
                    theme_color: club.theme_color,
                    is_member: isMember,
                    is_favorite: isFavorite,
                    user_role: membership?.role,
                    member_count: members?.length || 0,
                    movies_watched: moviesWatchedCount,
                    festival_count: completedFestivalsCount || 0,
                  }}
                  showFavorite={true}
                  disableLink
                  initialCollapsed={cardCollapsed}
                />

                {/* Theme Pool - Always visible */}
                <CollapsibleThemePool
                  themes={themes || []}
                  clubId={clubId}
                  canManage={isAdmin}
                  themeSubmissionsLocked={club.theme_submissions_locked || false}
                  themeVotingEnabled={themeVotingEnabled}
                  defaultExpanded={false}
                  currentUserId={user.id}
                  initialVotes={initialThemeVotes}
                />

                {/* Movie Pool - Available for all clubs */}
                <CollapsibleMoviePool
                  clubId={clubId}
                  canManage={isAdmin}
                  votingEnabled={
                    (club.settings as Record<string, unknown>)?.movie_pool_voting_enabled !== false
                  }
                  governance={
                    ((club.settings as Record<string, unknown>)?.movie_pool_governance as
                      | "democracy"
                      | "random"
                      | "autocracy") || "autocracy"
                  }
                  autoPromoteThreshold={
                    ((club.settings as Record<string, unknown>)
                      ?.movie_pool_auto_promote_threshold as number) || 5
                  }
                  allowNonAdminAdd={
                    (club.settings as Record<string, unknown>)?.allow_non_admin_movie_pool !== false
                  }
                  defaultExpanded={false}
                  currentUserId={user.id}
                  instanceId="desktop"
                />
              </aside>

              {/* Main Column - Deadlines & Content */}
              <div className="lg:col-span-6 space-y-4 lg:space-y-6 min-w-0">
                {/* Mobile Club Header */}
                <div className="lg:hidden">
                  <UnifiedClubCard
                    club={{
                      id: club.id,
                      name: club.name,
                      slug: clubSlug,
                      description: club.description,
                      picture_url: club.picture_url,
                      privacy: club.privacy,
                      settings: club.settings,
                      avatar_icon: club.avatar_icon,
                      avatar_color_index: club.avatar_color_index,
                      avatar_border_color_index: club.avatar_border_color_index,
                      theme_color: club.theme_color,
                      is_member: isMember,
                      is_favorite: isFavorite,
                      user_role: membership?.role,
                      member_count: members?.length || 0,
                      movies_watched: moviesWatchedCount,
                      festival_count: completedFestivalsCount || 0,
                    }}
                    showFavorite={true}
                    disableLink
                    initialCollapsed={cardCollapsed}
                  />
                </div>

                {/* Announcements - Above Festival Hero (only if there are any) */}
                {announcements && announcements.length > 0 && (
                  <AnnouncementsList
                    clubId={clubId}
                    announcements={announcements}
                    isAdmin={isAdmin}
                  />
                )}

                {/* Active Festival Hero / Deadline Alert */}
                {festivalType === "endless" ? (
                  <Suspense fallback={<FestivalHeroCardSkeleton phase="watch_rate" />}>
                    <EndlessFestivalSection
                      clubId={clubId}
                      clubSlug={clubSlug}
                      clubName={club.name}
                      isAdmin={isAdmin}
                      isMember={isMember}
                      currentUserId={user.id}
                      festivalType={festivalType}
                      hideRecentlyPlayedOnDesktop={true}
                    />
                  </Suspense>
                ) : activeFestival && activeFestival.phase === "watch_rate" ? (
                  /* Use MovieCarousel for Watch & Rate phase - same as Endless Festival */
                  <Suspense fallback={<FestivalHeroCardSkeleton phase="watch_rate" />}>
                    <FestivalCarouselSection
                      festivalId={activeFestival.id}
                      festivalSlug={activeFestival.slug}
                      clubId={clubId}
                      clubSlug={clubSlug}
                      clubName={club.name}
                      isAdmin={isAdmin}
                      isMember={isMember}
                      currentUserId={user.id}
                      festivalType={festivalType}
                    />
                  </Suspense>
                ) : activeFestival ? (
                  <FestivalHeroCardClient
                    festival={{
                      ...activeFestival,
                      picture_url: activeFestival.picture_url || null,
                      background_type: activeFestival.background_type || null,
                      background_value: activeFestival.background_value || null,
                      keywords: activeFestival.keywords || null,
                    }}
                    clubSlug={clubSlug}
                    clubName={club.name}
                    clubId={clubId}
                    festivalType={festivalType}
                    themeGovernance={themeGovernance}
                    topThemes={topThemes}
                    nominationCount={nominationCount}
                    ratingCount={ratingCount}
                    participantCount={members?.length || 0}
                    userHasNominated={userHasNominated}
                    userHasRated={userHasRated}
                    isAdmin={isAdmin}
                    topNominations={topNominations}
                    themesEnabled={themesEnabled}
                    scoringEnabled={scoringEnabled}
                    guessingEnabled={guessingEnabled}
                    autoAdvance={isAutoAdvance}
                  />
                ) : isAdmin && seasons && seasons.length > 0 ? (
                  <div className="flex flex-col sm:flex-row justify-between items-center gap-3 py-4 px-4 rounded-lg bg-[var(--surface-1)]/50 border border-dashed border-[var(--border)]">
                    <div>
                      <h2 className="text-base font-semibold text-[var(--text-primary)] mb-0.5">
                        No Active Festival
                      </h2>
                      <p className="text-xs text-[var(--text-muted)]">
                        Start a new festival for your club
                      </p>
                    </div>
                    <CreateFestivalModal
                      seasons={seasons}
                      themes={[]}
                      clubId={clubId}
                      clubSettings={{
                        default_nomination_duration: clubSettings.default_nomination_duration as
                          | DefaultPhaseDuration
                          | undefined,
                        default_watch_rate_duration: clubSettings.default_watch_rate_duration as
                          | DefaultPhaseDuration
                          | undefined,
                      }}
                      disabled={!!activeFestival}
                      disabledMessage={
                        activeFestival
                          ? `Cannot create a new festival while "${activeFestival.name || "an active festival"}" is in progress`
                          : undefined
                      }
                    />
                  </div>
                ) : (
                  <NoActiveFestivalCard clubSlug={clubSlug} isAdmin={isAdmin} />
                )}

                {/* Active Polls */}
                {activePolls && activePolls.length > 0 && (
                  <section>
                    <div className="flex items-center justify-between mb-2">
                      <h2 className="text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wide">
                        Active Polls
                      </h2>
                    </div>
                    <PollsList
                      clubId={clubId}
                      polls={activePolls.map((poll) => ({
                        id: poll.id,
                        question: poll.question,
                        options: poll.options as string[],
                        created_at: poll.created_at,
                        expires_at: poll.expires_at,
                        user: Array.isArray(poll.user) ? poll.user[0] : poll.user,
                      }))}
                    />
                  </section>
                )}

                {/* Mobile Only: Recently Played - after polls, before discussions */}
                {recentlyPlayedMovies.length > 0 && (
                  <section className="lg:hidden">
                    <RecentlyPlayedShelf
                      movies={recentlyPlayedMovies}
                      clubSlug={clubSlug}
                      isAdmin={isAdmin}
                      discussionThreads={recentlyPlayedDiscussionThreads}
                    />
                  </section>
                )}

                {/* Desktop Only: Discussions */}
                <section className="hidden lg:block">
                  <CollapsibleRecentDiscussions
                    discussions={(recentDiscussions || []).map((thread) => {
                      const author = Array.isArray(thread.author)
                        ? thread.author[0]
                        : thread.author;
                      const movie = Array.isArray(thread.movie) ? thread.movie[0] : thread.movie;
                      const festival = Array.isArray(thread.festival)
                        ? thread.festival[0]
                        : thread.festival;

                      // Determine avatar based on thread type and available data
                      let avatarType: DiscussionAvatarType = "generic";
                      let avatarUrl: string | null = null;
                      let avatarText: string | null = null;

                      if (thread.tmdb_id && movie?.poster_url) {
                        avatarType = "movie";
                        avatarUrl = movie.poster_url;
                      } else if (thread.festival_id && festival) {
                        avatarType = "festival";
                        avatarUrl = festival.poster_url || null;
                        avatarText = festival.theme || null;
                      }

                      return {
                        id: thread.id,
                        slug: thread.slug,
                        title: thread.title,
                        content: thread.content,
                        thread_type: thread.thread_type,
                        is_pinned: thread.is_pinned,
                        is_locked: thread.is_locked,
                        is_spoiler: thread.is_spoiler,
                        comment_count: thread.comment_count,
                        created_at: thread.created_at,
                        updated_at: thread.updated_at,
                        author: author
                          ? {
                              id: author.id,
                              display_name: author.display_name,
                              avatar_url: author.avatar_url,
                            }
                          : null,
                        avatar_type: avatarType,
                        avatar_url: avatarUrl,
                        avatar_text: avatarText,
                      };
                    })}
                    clubSlug={clubSlug}
                  />
                </section>

                {/* Mobile Only: Discussions */}
                <section className="lg:hidden">
                  <CollapsibleRecentDiscussions
                    discussions={(recentDiscussions || []).map((thread) => {
                      const author = Array.isArray(thread.author)
                        ? thread.author[0]
                        : thread.author;
                      const movie = Array.isArray(thread.movie) ? thread.movie[0] : thread.movie;
                      const festival = Array.isArray(thread.festival)
                        ? thread.festival[0]
                        : thread.festival;

                      // Determine avatar based on thread type and available data
                      let avatarType: DiscussionAvatarType = "generic";
                      let avatarUrl: string | null = null;
                      let avatarText: string | null = null;

                      if (thread.tmdb_id && movie?.poster_url) {
                        avatarType = "movie";
                        avatarUrl = movie.poster_url;
                      } else if (thread.festival_id && festival) {
                        avatarType = "festival";
                        avatarUrl = festival.poster_url || null;
                        avatarText = festival.theme || null;
                      }

                      return {
                        id: thread.id,
                        slug: thread.slug,
                        title: thread.title,
                        content: thread.content,
                        thread_type: thread.thread_type,
                        is_pinned: thread.is_pinned,
                        is_locked: thread.is_locked,
                        is_spoiler: thread.is_spoiler,
                        comment_count: thread.comment_count,
                        created_at: thread.created_at,
                        updated_at: thread.updated_at,
                        author: author
                          ? {
                              id: author.id,
                              display_name: author.display_name,
                              avatar_url: author.avatar_url,
                            }
                          : null,
                        avatar_type: avatarType,
                        avatar_url: avatarUrl,
                        avatar_text: avatarText,
                      };
                    })}
                    clubSlug={clubSlug}
                  />
                </section>

                {/* Mobile Only: Upcoming Dates */}
                <section className="lg:hidden">
                  <CollapsibleUpcomingDates clubSlug={clubSlug}>
                    <ClubCalendar clubId={clubId} userId={user.id} showClubInfo={false} />
                  </CollapsibleUpcomingDates>
                </section>

                {/* Mobile Only: Theme Pool - Always visible */}
                <section className="lg:hidden">
                  <CollapsibleThemePool
                    themes={themes || []}
                    clubId={clubId}
                    canManage={isAdmin}
                    themeSubmissionsLocked={club.theme_submissions_locked || false}
                    themeVotingEnabled={themeVotingEnabled}
                    defaultExpanded={false}
                    currentUserId={user.id}
                    initialVotes={initialThemeVotes}
                  />
                </section>

                {/* Mobile Only: Movie Pool - Available for all clubs */}
                <section className="lg:hidden">
                  <CollapsibleMoviePool
                    clubId={clubId}
                    canManage={isAdmin}
                    votingEnabled={
                      (club.settings as Record<string, unknown>)?.movie_pool_voting_enabled !==
                      false
                    }
                    governance={
                      ((club.settings as Record<string, unknown>)?.movie_pool_governance as
                        | "democracy"
                        | "random"
                        | "autocracy") || "autocracy"
                    }
                    autoPromoteThreshold={
                      ((club.settings as Record<string, unknown>)
                        ?.movie_pool_auto_promote_threshold as number) || 5
                    }
                    allowNonAdminAdd={
                      (club.settings as Record<string, unknown>)?.allow_non_admin_movie_pool !==
                      false
                    }
                    defaultExpanded={false}
                    currentUserId={user.id}
                    instanceId="mobile"
                  />
                </section>

                {/* Mobile Only: Recent Activity */}
                <section className="lg:hidden">
                  <CollapsibleRecentActivity
                    activities={activities}
                    clubSlug={clubSlug}
                    clubId={clubId}
                    clubName={club.name}
                    currentUserId={user.id}
                  />
                </section>

                {/* Mobile Only: Club Resources */}
                <section className="lg:hidden">
                  <CollapsibleClubResources
                    resources={clubResources}
                    clubId={clubId}
                    canManage={isAdmin}
                    defaultExpanded={false}
                  />
                </section>

                {/* Quick Links - Settings (all members) + Manage (admins only) */}
                <section className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-4 border-t border-[var(--border)]">
                  {/* Settings - visible to all members */}
                  <Link
                    href={`/club/${clubSlug}/settings`}
                    className="flex items-center gap-3 p-3 rounded-lg border border-[var(--border)] hover:border-[var(--text-muted)] transition-colors group"
                  >
                    <div className="w-9 h-9 rounded-lg bg-[var(--surface-2)] flex items-center justify-center group-hover:bg-[var(--club-accent,var(--primary))]/10 transition-colors">
                      <Gear className="w-4 h-4 text-[var(--text-muted)] group-hover:text-[var(--club-accent,var(--primary))] transition-colors" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-[var(--text-primary)] group-hover:text-[var(--club-accent,var(--primary))] transition-colors">
                        Settings
                      </p>
                      <p className="text-xs text-[var(--text-muted)] truncate">
                        Notifications and personalization
                      </p>
                    </div>
                    <CaretRight className="w-4 h-4 text-[var(--text-muted)] group-hover:text-[var(--text-primary)] transition-colors flex-shrink-0" />
                  </Link>

                  {/* Manage - visible to admins only */}
                  {isAdmin && (
                    <Link
                      href={`/club/${clubSlug}/manage`}
                      className="flex items-center gap-3 p-3 rounded-lg border border-[var(--border)] hover:border-[var(--text-muted)] transition-colors group"
                    >
                      <div className="w-9 h-9 rounded-lg bg-[var(--surface-2)] flex items-center justify-center group-hover:bg-[var(--club-accent,var(--primary))]/10 transition-colors">
                        <Sliders className="w-4 h-4 text-[var(--text-muted)] group-hover:text-[var(--club-accent,var(--primary))] transition-colors" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-[var(--text-primary)] group-hover:text-[var(--club-accent,var(--primary))] transition-colors">
                          Manage
                        </p>
                        <p className="text-xs text-[var(--text-muted)] truncate">
                          Festivals, seasons, and club settings
                        </p>
                      </div>
                      <CaretRight className="w-4 h-4 text-[var(--text-muted)] group-hover:text-[var(--text-primary)] transition-colors flex-shrink-0" />
                    </Link>
                  )}
                </section>
              </div>

              {/* Right Sidebar - Desktop Only */}
              <aside className="hidden lg:block lg:col-span-3 space-y-4">
                {/* Upcoming Dates / Calendar - Collapsible */}
                <CollapsibleUpcomingDates clubSlug={clubSlug}>
                  <ClubCalendar clubId={clubId} userId={user.id} showClubInfo={false} />
                </CollapsibleUpcomingDates>

                {/* Recently Played - Endless mode only */}
                {recentlyPlayedMovies.length > 0 && (
                  <RecentlyPlayedShelf
                    movies={recentlyPlayedMovies}
                    clubSlug={clubSlug}
                    isAdmin={isAdmin}
                    discussionThreads={recentlyPlayedDiscussionThreads}
                  />
                )}

                {/* Activity Feed */}
                <CollapsibleRecentActivity
                  activities={activities}
                  clubSlug={clubSlug}
                  clubId={clubId}
                  clubName={club.name}
                  currentUserId={user.id}
                />

                {/* Club Resources */}
                <CollapsibleClubResources
                  resources={clubResources}
                  clubId={clubId}
                  canManage={isAdmin}
                  defaultExpanded={false}
                />
              </aside>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
