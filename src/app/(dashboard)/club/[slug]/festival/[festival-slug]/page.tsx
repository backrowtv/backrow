import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { getFestivalForSeo } from "@/lib/seo/fetchers";
import { absoluteUrl } from "@/lib/seo/absolute-url";
import { FestivalJsonLd } from "@/components/seo/JsonLd";
import { TourPopup } from "@/components/onboarding/TourPopup";
import { festivalTour } from "@/components/onboarding/tour-content";
import Link from "next/link";
import { resolveClub, resolveFestival } from "@/lib/clubs/resolveClub";
import { ClubNavigation } from "@/components/clubs/ClubNavigation";
import { FestivalThemedBackground } from "@/components/festivals";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Users, SignIn } from "@phosphor-icons/react/dist/ssr";
import { BrandText } from "@/components/ui/brand-text";
import { checkAndAdvanceFestivalPhases } from "@/app/actions/festivals";
import { checkAndRolloverSeasons } from "@/app/actions/seasons";
import type { ClubRatingSettings } from "@/components/festivals/endless/EndlessFestivalSection";
import type { RatingRubric } from "@/types/club-settings";
import { extractFestivalType } from "@/types/supabase-helpers";

// Import client components
import { FestivalPageClient } from "./festival-page-client";

interface FestivalPageProps {
  params: Promise<{ slug: string; "festival-slug": string }>;
}

export async function generateMetadata({ params }: FestivalPageProps): Promise<Metadata> {
  const { slug, "festival-slug": festivalSlug } = await params;
  const data = await getFestivalForSeo(slug, festivalSlug);
  if (!data) {
    return { title: "Festival not found · BackRow", robots: { index: false, follow: false } };
  }
  const { club, festival } = data;
  const url = absoluteUrl(`/club/${club.slug ?? slug}/festival/${festival.slug ?? festivalSlug}`);
  const title = `${festival.theme ?? "Festival"} · ${club.name} · BackRow`;
  const description = festival.theme
    ? `${festival.theme} — a themed film festival hosted by ${club.name} on BackRow.`
    : `A film festival hosted by ${club.name} on BackRow.`;
  const isPublic = club.privacy !== "private";
  return {
    title,
    description,
    alternates: { canonical: url },
    openGraph: {
      title: `${festival.theme ?? "Festival"} · ${club.name}`,
      description,
      url,
      type: "website",
      siteName: "BackRow",
    },
    twitter: {
      card: "summary_large_image",
      title: `${festival.theme ?? "Festival"} · ${club.name}`,
      description,
    },
    robots: isPublic ? { index: true, follow: true } : { index: false, follow: false },
  };
}

// Public privacy types that allow view-only access
const PUBLIC_PRIVACY_TYPES = ["public_open", "public_password", "public_invite", "public_request"];

// Join Club Banner component for non-members
function JoinClubBanner({
  clubSlug,
  clubName,
  isLoggedIn,
  privacy,
}: {
  clubSlug: string;
  clubName: string;
  isLoggedIn: boolean;
  privacy: string;
}) {
  const privacyLabels: Record<string, string> = {
    public_open: "Open to join",
    public_password: "Password required",
    public_invite: "Invite only",
    public_request: "Request to join",
  };

  return (
    <div className="mb-6 p-4 rounded-xl bg-gradient-to-r from-[var(--club-accent,var(--primary))]/10 to-[var(--accent)]/10 border border-[var(--club-accent,var(--primary))]/20">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-start gap-3">
          <div className="p-2 rounded-lg bg-[var(--club-accent,var(--primary))]/20">
            <Users className="w-5 h-5 text-[var(--club-accent,var(--primary))]" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-[var(--text-primary)]">
              Join <BrandText>{clubName}</BrandText> to participate
            </h3>
            <p className="text-xs text-[var(--text-muted)] mt-0.5">
              You&apos;re viewing this festival in read-only mode. Join the club to nominate movies,
              rate films, and compete with other members.
            </p>
            <Badge variant="secondary" className="mt-2 text-[10px]">
              {privacyLabels[privacy] || "Public Club"}
            </Badge>
          </div>
        </div>
        <div className="flex gap-2 w-full sm:w-auto">
          {isLoggedIn ? (
            <Button size="sm" variant="club-accent" asChild className="flex-1 sm:flex-none">
              <Link href={`/club/${clubSlug}`}>View Club & Join</Link>
            </Button>
          ) : (
            <>
              <Button size="sm" variant="club-accent" asChild className="flex-1 sm:flex-none">
                <Link href="/sign-in">
                  <SignIn className="w-4 h-4 mr-1.5" />
                  Sign In
                </Link>
              </Button>
              <Button size="sm" variant="outline" asChild className="flex-1 sm:flex-none">
                <Link href="/sign-up">Sign Up</Link>
              </Button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

export default async function FestivalPage({ params }: FestivalPageProps) {
  const { slug: clubIdentifier, "festival-slug": festivalIdentifier } = await params;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Resolve club by slug or ID
  const clubResolution = await resolveClub(supabase, clubIdentifier);
  if (!clubResolution) redirect("/clubs");

  const clubId = clubResolution.id;
  const clubSlug = clubResolution.slug || clubId;

  // Get club data including privacy settings and mode
  const { data: clubData } = await supabase
    .from("clubs")
    .select("name, settings, privacy")
    .eq("id", clubId)
    .single();

  const clubSettings = clubData?.settings as Record<string, unknown> | null;
  const clubPrivacy = clubData?.privacy || "private";
  const isPublicClub = PUBLIC_PRIVACY_TYPES.includes(clubPrivacy);
  const festivalType = extractFestivalType(clubSettings);
  const themesEnabled = clubSettings?.themes_enabled !== false;
  const scoringEnabled = clubSettings?.scoring_enabled !== false;
  const guessingEnabled = clubSettings?.nomination_guessing_enabled === true;

  // Extract rating settings for rating modal
  const ratingSettings: ClubRatingSettings = {
    club_ratings_enabled: (clubSettings?.club_ratings_enabled as boolean) ?? true,
    rating_min: (clubSettings?.rating_min as number) ?? 0,
    rating_max: (clubSettings?.rating_max as number) ?? 10,
    rating_increment: (clubSettings?.rating_increment as number) ?? 0.1,
    rating_slider_icon:
      (clubSettings?.rating_slider_icon as ClubRatingSettings["rating_slider_icon"]) ?? "default",
    rating_rubrics: (clubSettings?.rating_rubrics as RatingRubric[]) ?? [],
    rubric_enforcement:
      (clubSettings?.rubric_enforcement as ClubRatingSettings["rubric_enforcement"]) ?? "off",
    rating_rubric_name: clubSettings?.rating_rubric_name as string | undefined,
  };

  // Check if this is an endless festival club - redirect to club page
  if (clubSettings?.festival_type === "endless") {
    redirect(`/club/${clubSlug}`);
  }

  // Check if user is a member (only if logged in)
  let membership: { role: string } | null = null;
  if (user) {
    const { data: membershipData } = await supabase
      .from("club_members")
      .select("role")
      .eq("club_id", clubId)
      .eq("user_id", user.id)
      .maybeSingle();
    membership = membershipData;
  }

  const isMember = !!membership;
  const isAdmin = membership?.role === "producer" || membership?.role === "director";
  const isProducer = membership?.role === "producer" || false;

  // Access control: Allow members OR public clubs (view-only for non-members)
  if (!isMember && !isPublicClub) {
    if (user) {
      redirect("/clubs");
    } else {
      redirect("/sign-in");
    }
  }

  const isViewOnly = !isMember;

  // Resolve festival by slug or ID
  const festivalResolution = await resolveFestival(supabase, clubId, festivalIdentifier);
  if (!festivalResolution) redirect(`/club/${clubSlug}/history`);

  const festivalId = festivalResolution.id;
  const festivalSlug = festivalResolution.slug || festivalId;

  // Check and auto-advance phases if needed (only if member)
  if (isMember) {
    await checkAndAdvanceFestivalPhases();
    await checkAndRolloverSeasons();
  }

  // Get festival
  const { data: festival, error: festivalError } = await supabase
    .from("festivals")
    .select("*")
    .eq("id", festivalId)
    .single();

  if (festivalError || !festival) {
    redirect(`/club/${clubSlug}/history`);
  }

  // Check if current phase auto-advances (scheduled timing)
  const nominationTiming = clubSettings?.nomination_timing as { type?: string } | undefined;
  const watchRateTiming = clubSettings?.watch_rate_timing as { type?: string } | undefined;
  const isAutoAdvance = (() => {
    const phase = festival.phase;
    if (phase === "theme_selection" || phase === "nomination") {
      return nominationTiming?.type === "scheduled";
    }
    if (phase === "watch_rate") {
      return watchRateTiming?.type === "scheduled";
    }
    return false;
  })();

  // Fetch all required data in parallel
  const [
    nominationsResult,
    _ratingsResult,
    membersResult,
    nominationsData,
    userNominationResult,
    userRatingsResult,
    watchHistoryResult,
  ] = await Promise.all([
    // Counts
    supabase
      .from("nominations")
      .select("id", { count: "exact", head: true })
      .eq("festival_id", festivalId)
      .is("deleted_at", null),
    supabase
      .from("ratings")
      .select("id", { count: "exact", head: true })
      .eq("festival_id", festivalId),
    supabase
      .from("club_members")
      .select(
        "user_id, role, club_display_name, users:user_id(id, display_name, username, avatar_url, avatar_icon, avatar_color_index, avatar_border_color_index)"
      )
      .eq("club_id", clubId),
    // Nominations with movie and user data
    supabase
      .from("nominations")
      .select(
        `
        id,
        tmdb_id,
        pitch,
        user_id,
        created_at,
        movies:tmdb_id (
          title,
          poster_url,
          year,
          director,
          genres,
          slug,
          runtime
        ),
        users:user_id (
          display_name,
          avatar_url
        )
      `
      )
      .eq("festival_id", festivalId)
      .is("deleted_at", null)
      .order("created_at", { ascending: false }),
    // User's nomination (if member)
    isMember && user
      ? supabase
          .from("nominations")
          .select(
            `
            id,
            tmdb_id,
            pitch,
            movies:tmdb_id (
              title,
              poster_url,
              year,
              director,
              slug
            )
          `
          )
          .eq("festival_id", festivalId)
          .eq("user_id", user.id)
          .is("deleted_at", null)
          .maybeSingle()
      : Promise.resolve({ data: null }),
    // User's ratings (if member)
    isMember && user
      ? supabase
          .from("ratings")
          .select("nomination_id, rating")
          .eq("festival_id", festivalId)
          .eq("user_id", user.id)
      : Promise.resolve({ data: [] }),
    // User's watch history (if member)
    isMember && user
      ? supabase.from("watch_history").select("tmdb_id").eq("user_id", user.id)
      : Promise.resolve({ data: [] }),
  ]);

  const movieCount = nominationsResult.count || 0;
  const participantCount = membersResult.data?.length || 0;

  // Process member data for admin panel
  const members = (membersResult.data || []).map((m) => {
    const userData = Array.isArray(m.users) ? m.users[0] : m.users;
    return {
      id: m.user_id,
      user_id: m.user_id,
      role: m.role,
      display_name: userData?.display_name || null,
      username: userData?.username || null,
      avatar_url: userData?.avatar_url || null,
      avatar_icon: userData?.avatar_icon || null,
      avatar_color_index: userData?.avatar_color_index ?? null,
      avatar_border_color_index: userData?.avatar_border_color_index ?? null,
    };
  });

  // Member watch progress (count of festival movies each member has watched).
  // Only the count is exposed — never which specific movies.
  const memberWatchProgress: Array<{
    userId: string;
    displayName: string;
    avatarUrl: string | null;
    avatarIcon: string | null;
    avatarColorIndex: number | null;
    avatarBorderColorIndex: number | null;
    watchedCount: number;
  }> = [];
  if (membersResult.data && membersResult.data.length > 0 && nominationsData.data) {
    const allTmdbIds = (nominationsData.data || []).map((n) => n.tmdb_id);
    const allMemberIds = membersResult.data.map((m) => m.user_id);
    if (allTmdbIds.length > 0 && allMemberIds.length > 0) {
      const { data: watchRows } = await supabase
        .from("watch_history")
        .select("user_id, tmdb_id")
        .in("user_id", allMemberIds)
        .in("tmdb_id", allTmdbIds);
      const counts = new Map<string, number>();
      (watchRows || []).forEach((w) => {
        if (!w.user_id) return;
        counts.set(w.user_id, (counts.get(w.user_id) || 0) + 1);
      });
      for (const m of membersResult.data) {
        const userData = Array.isArray(m.users) ? m.users[0] : m.users;
        const userRow = userData as
          | {
              display_name?: string | null;
              avatar_url?: string | null;
              avatar_icon?: string | null;
              avatar_color_index?: number | null;
              avatar_border_color_index?: number | null;
            }
          | null
          | undefined;
        const memberRow = m as { club_display_name?: string | null };
        memberWatchProgress.push({
          userId: m.user_id,
          displayName: memberRow.club_display_name || userRow?.display_name || "Unknown",
          avatarUrl: userRow?.avatar_url ?? null,
          avatarIcon: userRow?.avatar_icon ?? null,
          avatarColorIndex: userRow?.avatar_color_index ?? null,
          avatarBorderColorIndex: userRow?.avatar_border_color_index ?? null,
          watchedCount: counts.get(m.user_id) || 0,
        });
      }
    }
  }

  // Process nominations data
  const nominations = (nominationsData.data || []).map((nom) => {
    const movie = Array.isArray(nom.movies) ? nom.movies[0] : nom.movies;
    const nominator = Array.isArray(nom.users) ? nom.users[0] : nom.users;
    return {
      id: nom.id,
      tmdb_id: nom.tmdb_id,
      user_id: nom.user_id,
      movie_title: movie?.title || null,
      poster_url: movie?.poster_url || null,
      year: movie?.year || null,
      director: movie?.director || null,
      slug: movie?.slug || null,
      runtime: movie?.runtime || null,
      nominator_name: nominator?.display_name || null,
      nominator_avatar: nominator?.avatar_url || null,
      pitch: nom.pitch,
    };
  });

  // User's nomination data
  const userNomination = userNominationResult?.data
    ? {
        id: userNominationResult.data.id,
        tmdb_id: userNominationResult.data.tmdb_id,
        pitch: userNominationResult.data.pitch,
        movie: Array.isArray(userNominationResult.data.movies)
          ? userNominationResult.data.movies[0]
          : userNominationResult.data.movies,
      }
    : null;

  // User's ratings and watch progress
  const userRatings = (userRatingsResult?.data || []) as {
    nomination_id: string;
    rating: number;
  }[];
  const ratedCount = userRatings.length;
  const watchedTmdbIds = new Set((watchHistoryResult?.data || []).map((w) => w.tmdb_id));
  const watchedCount = nominations.filter((n) => watchedTmdbIds.has(n.tmdb_id)).length;
  const averageRating =
    ratedCount > 0 ? userRatings.reduce((sum, r) => sum + r.rating, 0) / ratedCount : null;

  const hasUserNominated = !!userNomination;

  // Fetch private notes for all festival movies (if member)
  interface PrivateNote {
    id: string;
    tmdb_id: number;
    note: string;
    created_at: string;
    updated_at: string | null;
  }
  let privateNotes: PrivateNote[] = [];
  if (isMember && user && nominations.length > 0) {
    const tmdbIds = nominations.map((n) => n.tmdb_id);
    const { data: notesData } = await supabase
      .from("private_notes")
      .select("id, tmdb_id, note, created_at, updated_at")
      .eq("user_id", user.id)
      .in("tmdb_id", tmdbIds);
    privateNotes = (notesData || []) as PrivateNote[];
  }

  // Fetch festival-level private notes (if member)
  interface FestivalNote {
    id: string;
    note: string;
    created_at: string;
    updated_at: string | null;
  }
  let festivalNotes: FestivalNote[] = [];
  if (isMember && user) {
    const { data: festivalNotesData } = await supabase
      .from("private_notes")
      .select("id, note, created_at, updated_at")
      .eq("user_id", user.id)
      .eq("festival_id", festivalId)
      .order("created_at", { ascending: false });
    festivalNotes = (festivalNotesData || []) as FestivalNote[];
  }

  // Get top themes for theme selection phase (only for members)
  type ThemeWithVotes = {
    id: string;
    theme_name: string;
    votes: number;
  };
  let topThemes: ThemeWithVotes[] = [];
  if (festival.phase === "theme_selection" && isMember) {
    const { data: themesData } = await supabase
      .from("theme_pool")
      .select("id, theme_name")
      .eq("club_id", clubId)
      .order("created_at", { ascending: false })
      .limit(10);

    if (themesData) {
      // Count votes for each theme
      const { data: votesData } = await supabase
        .from("theme_votes")
        .select("theme_id")
        .eq("festival_id", festivalId);

      const voteCounts = new Map<string, number>();
      votesData?.forEach((v) => {
        voteCounts.set(v.theme_id, (voteCounts.get(v.theme_id) || 0) + 1);
      });

      topThemes = themesData
        .map((t) => ({
          id: t.id,
          theme_name: t.theme_name,
          votes: voteCounts.get(t.id) || 0,
        }))
        .sort((a, b) => b.votes - a.votes);
    }
  }

  // Fetch theme submitter info if theme came from pool
  let themeSubmitter: { name: string; id: string } | null = null;
  if (festival.theme) {
    const { data: themePoolEntry } = await supabase
      .from("theme_pool")
      .select("added_by, users:added_by(display_name)")
      .eq("club_id", clubId)
      .eq("theme_name", festival.theme)
      .maybeSingle();

    if (themePoolEntry?.added_by) {
      const userData = Array.isArray(themePoolEntry.users)
        ? themePoolEntry.users[0]
        : themePoolEntry.users;
      themeSubmitter = {
        id: themePoolEntry.added_by,
        name: (userData as { display_name: string } | null)?.display_name || "Member",
      };
    }
  }

  // Fetch theme selector info
  let themeSelector: { name: string; id: string } | null = null;
  if (festival.theme_selected_by) {
    const { data: selectorData } = await supabase
      .from("users")
      .select("id, display_name")
      .eq("id", festival.theme_selected_by)
      .single();

    if (selectorData) {
      themeSelector = {
        id: selectorData.id,
        name: selectorData.display_name || "Member",
      };
    }
  }

  // Fetch season info
  let seasonInfo: { name: string; number: number } | null = null;
  if (festival.season_id) {
    const { data: seasonData } = await supabase
      .from("seasons")
      .select("id, name")
      .eq("id", festival.season_id)
      .single();

    if (seasonData) {
      // Get the season number (count of seasons in this club created before or at this one)
      const { count: seasonNumber } = await supabase
        .from("seasons")
        .select("id", { count: "exact", head: true })
        .eq("club_id", clubId)
        .lte("created_at", festival.created_at || new Date().toISOString());

      seasonInfo = {
        name: seasonData.name,
        number: seasonNumber || 1,
      };
    }
  }

  // Determine user role for admin panel
  const userRole: "producer" | "director" =
    membership?.role === "producer" ? "producer" : "director";

  // Fetch results data for results phase
  interface MovieRanking {
    rank: number;
    nomination_id: string;
    movie_title: string;
    poster_url: string | null;
    average_rating: number;
    rating_count: number;
    nominator_name: string;
    nominator_id: string | null;
    nominator_avatar: string | null;
    nominator_avatar_icon: string | null;
    nominator_avatar_color_index: number | null;
    nominator_avatar_border_color_index: number | null;
  }
  interface StandingsEntry {
    user_id: string;
    user_name: string;
    points: number;
  }
  let resultsData: {
    movieRankings: MovieRanking[];
    standings: StandingsEntry[];
  } | null = null;

  let resultsRatings: Array<{
    id: string;
    nomination_id: string;
    user_id: string;
    rating: number;
    user: { id: string; display_name: string | null; email: string } | null;
  }> = [];

  let resultsGuesses: Array<{
    id: string;
    user_id: string;
    guesses: Record<string, string>;
    user: { id: string; display_name: string | null; email: string } | null;
  }> = [];

  let resultsNominations: Array<{
    id: string;
    tmdb_id: number;
    user_id: string;
    movie_title: string | null;
    poster_url: string | null;
    user_name: string | null;
  }> = [];

  let resultsMembers: Array<{
    user_id: string;
    display_name: string;
    email: string;
  }> = [];

  if (festival.phase === "results") {
    const { data: festivalResults } = await supabase
      .from("festival_results")
      .select("results")
      .eq("festival_id", festivalId)
      .maybeSingle();

    if (festivalResults?.results) {
      const results = festivalResults.results as {
        nominations?: Array<{
          nomination_id: string;
          tmdb_id: number | null;
          movie_title: string | null;
          average_rating: number;
          rating_count: number;
          nominator_user_id: string | null;
        }>;
        standings?: StandingsEntry[];
      };

      // Create member lookup for nominator info
      const memberLookup = new Map<
        string,
        {
          name: string;
          avatar: string | null;
          avatar_icon: string | null;
          avatar_color_index: number | null;
          avatar_border_color_index: number | null;
        }
      >();
      members.forEach((m) => {
        memberLookup.set(m.user_id, {
          name: m.display_name || m.username || "Member",
          avatar: m.avatar_url,
          avatar_icon: m.avatar_icon,
          avatar_color_index: m.avatar_color_index,
          avatar_border_color_index: m.avatar_border_color_index,
        });
      });

      // Create nomination lookup for poster URLs
      const nominationLookup = new Map<string, { poster_url: string | null }>();
      nominations.forEach((n) => {
        nominationLookup.set(n.id, { poster_url: n.poster_url });
      });

      // Process movie rankings
      const movieRankings: MovieRanking[] = (results.nominations || [])
        .filter((n) => n.tmdb_id !== null)
        .sort((a, b) => b.average_rating - a.average_rating)
        .map((n, index) => {
          const nominatorInfo = n.nominator_user_id ? memberLookup.get(n.nominator_user_id) : null;
          const nominationInfo = nominationLookup.get(n.nomination_id);
          return {
            rank: index + 1,
            nomination_id: n.nomination_id,
            movie_title: n.movie_title || "Unknown Movie",
            poster_url: nominationInfo?.poster_url || null,
            average_rating: n.average_rating,
            rating_count: n.rating_count,
            nominator_name: nominatorInfo?.name || "Member",
            nominator_id: n.nominator_user_id,
            nominator_avatar: nominatorInfo?.avatar || null,
            nominator_avatar_icon: nominatorInfo?.avatar_icon || null,
            nominator_avatar_color_index: nominatorInfo?.avatar_color_index ?? null,
            nominator_avatar_border_color_index: nominatorInfo?.avatar_border_color_index ?? null,
          };
        });

      resultsData = {
        movieRankings,
        standings: results.standings || [],
      };
    }

    // Also fetch per-user ratings and guesses for the tabs
    const [{ data: allRatings }, { data: allGuesses }] = await Promise.all([
      supabase
        .from("ratings")
        .select("id, nomination_id, user_id, rating, users:user_id(id, display_name, email)")
        .eq("festival_id", festivalId),
      supabase
        .from("nomination_guesses")
        .select("id, user_id, guesses, users:user_id(id, display_name, email)")
        .eq("festival_id", festivalId),
    ]);

    resultsRatings = (allRatings || []).map((r: Record<string, unknown>) => {
      const userRel = Array.isArray(r.users) ? r.users[0] : r.users;
      return {
        id: r.id as string,
        nomination_id: r.nomination_id as string,
        user_id: r.user_id as string,
        rating: r.rating as number,
        user: userRel as { id: string; display_name: string | null; email: string } | null,
      };
    });

    resultsGuesses = (allGuesses || []).map((g: Record<string, unknown>) => {
      const userRel = Array.isArray(g.users) ? g.users[0] : g.users;
      return {
        id: g.id as string,
        user_id: g.user_id as string,
        guesses: (g.guesses || {}) as Record<string, string>,
        user: userRel as { id: string; display_name: string | null; email: string } | null,
      };
    });

    resultsNominations = nominations.map((n) => ({
      id: n.id,
      tmdb_id: n.tmdb_id,
      user_id: n.user_id,
      movie_title: n.movie_title,
      poster_url: n.poster_url,
      user_name: n.nominator_name,
    }));

    resultsMembers = members.map((m) => ({
      user_id: m.user_id,
      display_name: m.display_name || m.username || "Member",
      email: "",
    }));
  }

  // Prepare data for client component
  const festivalData = {
    id: festival.id,
    slug: festival.slug,
    theme: festival.theme,
    phase: festival.phase as "theme_selection" | "nomination" | "watch_rate" | "results",
    status: festival.status,
    start_date: festival.start_date,
    created_at: festival.created_at,
    nomination_deadline: festival.nomination_deadline,
    watch_deadline: festival.watch_deadline,
    rating_deadline: festival.rating_deadline,
    results_date: festival.results_date,
    member_count_at_creation: festival.member_count_at_creation,
    picture_url: festival.picture_url,
    poster_url: festival.poster_url,
    background_type: festival.background_type,
    background_value: festival.background_value,
    keywords: festival.keywords,
    theme_source: festival.theme_source as "pool" | "custom" | "random" | null,
  };

  return (
    <>
      <FestivalJsonLd
        club={{
          name: clubData?.name ?? "Club",
          slug: clubSlug,
        }}
        festival={{
          theme: festival.theme,
          slug: festival.slug,
          start_date: festival.start_date,
          results_date: festival.results_date,
          watch_deadline: festival.watch_deadline,
          picture_url: festival.picture_url,
          poster_url: festival.poster_url,
        }}
      />
      <ClubNavigation
        clubSlug={clubSlug}
        clubName={clubData?.name || "Club"}
        isAdmin={isAdmin}
        isProducer={isProducer}
      />
      {isMember && <TourPopup hintKey="tour-festival" {...festivalTour} />}
      <div className="bg-[var(--background)] relative">
        {/* Festival Background */}
        <FestivalThemedBackground
          backgroundType={festival.background_type}
          backgroundValue={festival.background_value}
        />

        <div className="max-w-3xl mx-auto px-4 py-6 relative z-10">
          {/* Join Club Banner for non-members */}
          {isViewOnly && (
            <JoinClubBanner
              clubSlug={clubSlug}
              clubName={clubData?.name || "Club"}
              isLoggedIn={!!user}
              privacy={clubPrivacy}
            />
          )}

          {/* Client Component handles all interactive content */}
          <FestivalPageClient
            festival={festivalData}
            clubSlug={clubSlug}
            clubId={clubId}
            clubName={clubData?.name || "Club"}
            festivalSlug={festivalSlug}
            festivalType={festivalType}
            themesEnabled={themesEnabled}
            scoringEnabled={scoringEnabled}
            guessingEnabled={guessingEnabled}
            ratingSettings={ratingSettings}
            isAdmin={isAdmin}
            isMember={isMember}
            isViewOnly={isViewOnly}
            userId={user?.id || null}
            userRole={userRole}
            members={members}
            nominations={nominations}
            topThemes={topThemes}
            movieCount={movieCount}
            participantCount={participantCount}
            userNomination={userNomination}
            hasUserNominated={hasUserNominated}
            watchedCount={watchedCount}
            ratedCount={ratedCount}
            averageRating={averageRating}
            watchedTmdbIds={Array.from(watchedTmdbIds)}
            userRatings={userRatings}
            themeSubmitter={themeSubmitter}
            themeSelector={themeSelector}
            seasonInfo={seasonInfo}
            resultsData={resultsData}
            resultsRatings={resultsRatings}
            resultsGuesses={resultsGuesses}
            resultsNominations={resultsNominations}
            resultsMembers={resultsMembers}
            privateNotes={privateNotes}
            festivalNotes={festivalNotes}
            memberWatchProgress={memberWatchProgress}
            autoAdvance={isAutoAdvance}
            revealSettings={{
              type: (clubSettings?.results_reveal_type as "automatic" | "manual") ?? "manual",
              direction:
                (clubSettings?.results_reveal_direction as "forward" | "backward") ?? "forward",
              delaySeconds: (clubSettings?.results_reveal_delay_seconds as number) ?? 5,
            }}
          />
        </div>
      </div>
    </>
  );
}
