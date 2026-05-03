import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { Suspense } from "react";
import { absoluteUrl } from "@/lib/seo/absolute-url";
import { escapeLike } from "@/lib/security/postgrest-escape";

export const metadata: Metadata = {
  title: "Discover Clubs · BackRow",
  description: "Browse public movie clubs and active film festivals on BackRow.",
  alternates: { canonical: absoluteUrl("/discover") },
  openGraph: {
    title: "Discover Movie Clubs",
    description: "Browse public movie clubs and active film festivals on BackRow.",
    url: absoluteUrl("/discover"),
    type: "website",
    siteName: "BackRow",
  },
  twitter: {
    card: "summary_large_image",
    title: "Discover Movie Clubs",
    description: "Browse public movie clubs and active film festivals on BackRow.",
  },
  robots: { index: true, follow: true },
};
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { DiscoverSearchWrapper } from "@/components/discover/DiscoverFiltersWrapper";
import { MagnifyingGlass, Plus, Sparkle } from "@phosphor-icons/react/dist/ssr";
import { EmptyState } from "@/components/shared/EmptyState";
import { ClubViewToggleWrapper } from "./ClubViewToggleWrapper";
import { UnifiedClubCard } from "@/components/clubs/UnifiedClubCard";
import { DiscoverListView } from "@/components/discover/DiscoverListView";
import { DiscoverSortDropdown } from "@/components/discover/DiscoverSortDropdown";
import { GenreTagCloud } from "@/components/discover/GenreTagCloud";
import { CLUB_GENRES } from "@/lib/genres/constants";
import type { ClubViewMode } from "@/components/clubs/ClubViewToggle";
import { TourPopup } from "@/components/onboarding/TourPopup";
import { discoverTour } from "@/components/onboarding/tour-content";

const PUBLIC_PRIVACY_TYPES = ["public_open", "public_moderated"];

// Type for nominations query with joined festivals
type NominationWithFestival = {
  festival_id: string;
  festivals: { club_id: string | null };
};

async function getPublicClubs(
  searchQuery: string | undefined,
  userId: string | null,
  sort: string | undefined,
  keywordFilter: string | undefined
) {
  const supabase = await createClient();

  let query = supabase
    .from("clubs")
    .select(
      "id, name, slug, description, picture_url, settings, theme_color, privacy, created_at, avatar_icon, avatar_color_index, avatar_border_color_index, keywords, genres"
    )
    .eq("archived", false)
    .in("privacy", PUBLIC_PRIVACY_TYPES);

  // Apply search query
  if (searchQuery) {
    const q = escapeLike(searchQuery);
    query = query.or(`name.ilike.%${q}%,description.ilike.%${q}%`);
  }

  const { data: clubs } = await query.order("created_at", { ascending: false }).limit(50);

  if (!clubs || clubs.length === 0) return { clubs: [], availableGenres: [] };

  const clubIds = clubs.map((c) => c.id);

  // Batch query 1: Get all member counts in one query
  const { data: allMemberships } = await supabase
    .from("club_members")
    .select("club_id")
    .in("club_id", clubIds);

  // Count members per club
  const memberCountMap = new Map<string, number>();
  allMemberships?.forEach((m) => {
    memberCountMap.set(m.club_id, (memberCountMap.get(m.club_id) || 0) + 1);
  });

  // Get festival counts per club
  const { data: allFestivals } = await supabase
    .from("festivals")
    .select("club_id")
    .in("club_id", clubIds)
    .is("deleted_at", null);

  const festivalCountMap = new Map<string, number>();
  allFestivals?.forEach((f) => {
    if (f.club_id) {
      festivalCountMap.set(f.club_id, (festivalCountMap.get(f.club_id) || 0) + 1);
    }
  });

  // Get movies watched counts per club
  const { data: allNominations } = await supabase
    .from("nominations")
    .select("festival_id, festivals!inner(club_id)")
    .in("festivals.club_id", clubIds)
    .is("deleted_at", null)
    .returns<NominationWithFestival[]>();

  const moviesWatchedMap = new Map<string, number>();
  allNominations?.forEach((n) => {
    const clubId = n.festivals?.club_id;
    if (clubId) {
      moviesWatchedMap.set(clubId, (moviesWatchedMap.get(clubId) || 0) + 1);
    }
  });

  // Batch query 2: Get user's memberships (only if logged in)
  const userMembershipMap = new Map<string, string>();

  if (userId) {
    const { data: userMemberships } = await supabase
      .from("club_members")
      .select("club_id, role")
      .eq("user_id", userId)
      .in("club_id", clubIds);

    userMemberships?.forEach((m) => {
      userMembershipMap.set(m.club_id, m.role);
    });
  }

  // Collect all unique genres from clubs, ordered by the canonical genre list
  const genreSet = new Set<string>();
  clubs.forEach((club) => {
    const g = club.genres as string[] | null;
    if (g && Array.isArray(g)) {
      g.forEach((slug) => genreSet.add(slug));
    }
  });
  const availableGenres = CLUB_GENRES.map((g) => g.slug).filter((slug) => genreSet.has(slug));

  // Build clubs with metadata
  let clubsWithCounts = clubs.map((club) => {
    return {
      ...club,
      member_count: memberCountMap.get(club.id) || 0,
      festival_count: festivalCountMap.get(club.id) || 0,
      movies_watched: moviesWatchedMap.get(club.id) || 0,
      is_member: userMembershipMap.has(club.id),
      user_role: userMembershipMap.get(club.id),
      avatar_icon: club.avatar_icon,
      avatar_color_index: club.avatar_color_index,
      avatar_border_color_index: club.avatar_border_color_index,
      theme_color: club.theme_color,
      description: club.description,
      privacy: club.privacy,
      keywords: (club.keywords as string[] | null) || null,
      genres: (club.genres as string[] | null) || null,
    };
  });

  // Filter by genre if specified
  if (keywordFilter) {
    clubsWithCounts = clubsWithCounts.filter((c) => c.genres && c.genres.includes(keywordFilter));
  }

  // Sort
  if (sort === "members") {
    clubsWithCounts.sort((a, b) => b.member_count - a.member_count);
  } else if (sort === "festivals") {
    clubsWithCounts.sort((a, b) => b.festival_count - a.festival_count);
  } else if (sort === "movies") {
    clubsWithCounts.sort((a, b) => b.movies_watched - a.movies_watched);
  }
  // Default: newest (already sorted by created_at desc from query)

  return { clubs: clubsWithCounts, availableGenres };
}

function ClubsCardsSkeleton() {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      {[1, 2, 3, 4, 5, 6].map((i) => (
        <div key={i} className="rounded-xl border border-[var(--border)] overflow-hidden">
          <Skeleton className="h-16 w-full" />
          <div className="flex justify-center -mt-7 relative z-10 mb-2">
            <Skeleton className="w-14 h-14 rounded-full" />
          </div>
          <div className="px-4 pb-3 flex flex-col items-center">
            <Skeleton className="h-4 w-28 mb-1.5" />
            <Skeleton className="h-3 w-16 mb-2" />
            <Skeleton className="h-3 w-full mb-1" />
            <Skeleton className="h-3 w-3/4" />
          </div>
          <div className="border-t border-[var(--border)] flex divide-x divide-[var(--border)]">
            <Skeleton className="flex-1 h-9" />
            <Skeleton className="flex-1 h-9" />
            <Skeleton className="flex-1 h-9" />
          </div>
        </div>
      ))}
    </div>
  );
}

function ClubsListSkeleton() {
  return (
    <div className="space-y-2">
      {[1, 2, 3, 4, 5, 6].map((i) => (
        <div
          key={i}
          className="flex items-center gap-3.5 p-3.5 rounded-xl border border-[var(--border)]"
        >
          <Skeleton className="w-3 h-full rounded-sm" />
          <Skeleton className="w-14 h-14 rounded-full flex-shrink-0" />
          <div className="flex-1">
            <Skeleton className="h-4 w-36 mb-1.5" />
            <Skeleton className="h-3 w-full mb-1.5" />
            <Skeleton className="h-3 w-28" />
          </div>
        </div>
      ))}
    </div>
  );
}

export default async function DiscoverPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; view?: string; sort?: string; genre?: string }>;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const params = await searchParams;
  const searchQuery = params?.q;
  const viewMode: ClubViewMode = params?.view === "table" ? "table" : "cards";
  const sort = params?.sort;
  const genreFilter = params?.genre;

  return (
    <div className="bg-[var(--background)]">
      <TourPopup hintKey="tour-discover" {...discoverTour} />
      <div className="max-w-6xl mx-auto px-4 lg:px-6 py-6">
        {/* Header - hidden on mobile */}
        <div className="hidden md:block mb-6">
          <h1 className="text-lg font-semibold text-[var(--text-primary)] mb-1">Discover</h1>
          <p className="text-sm text-[var(--text-muted)]">
            Find public clubs and communities to join.
          </p>
        </div>

        {/* Toolbar */}
        <div className="flex items-center gap-3 mb-4">
          <div className="flex-1">
            <DiscoverSearchWrapper initialQuery={searchQuery} />
          </div>
          <DiscoverSortDropdown />
          <ClubViewToggleWrapper initialView={viewMode} />
          {user && (
            <Link href="/create-club">
              <Button variant="outline" size="icon-sm" className="h-8 w-8 sm:w-auto sm:px-3">
                <Plus className="w-3.5 h-3.5 sm:mr-1.5" />
                <span className="hidden sm:inline text-xs">Create</span>
              </Button>
            </Link>
          )}
        </div>

        {/* Results */}
        <Suspense fallback={viewMode === "table" ? <ClubsListSkeleton /> : <ClubsCardsSkeleton />}>
          <ClubsDisplay
            searchQuery={searchQuery}
            userId={user?.id || null}
            viewMode={viewMode}
            sort={sort}
            genreFilter={genreFilter}
          />
        </Suspense>
      </div>
    </div>
  );
}

async function ClubsDisplay({
  searchQuery,
  userId,
  viewMode,
  sort,
  genreFilter,
}: {
  searchQuery?: string;
  userId: string | null;
  viewMode: ClubViewMode;
  sort?: string;
  genreFilter?: string;
}) {
  const { clubs, availableGenres } = await getPublicClubs(searchQuery, userId, sort, genreFilter);

  // When searching, show search results
  if (searchQuery) {
    if (clubs.length === 0) {
      return (
        <EmptyState
          icon={MagnifyingGlass}
          title="No clubs found"
          message="Try a different search term"
          variant="inline"
        />
      );
    }

    return (
      <>
        {availableGenres.length > 0 && (
          <div className="mb-4">
            <GenreTagCloud genres={availableGenres} />
          </div>
        )}
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wide flex items-center gap-1.5">
            <MagnifyingGlass className="w-3 h-3" />
            Search Results
          </h2>
          <span className="text-[11px] text-[var(--text-muted)]">
            {clubs.length} {clubs.length === 1 ? "club" : "clubs"}
          </span>
        </div>
        <ClubsList clubs={clubs} viewMode={viewMode} />
      </>
    );
  }

  // No clubs at all
  if (clubs.length === 0 && !genreFilter) {
    return (
      <EmptyState
        icon={Sparkle}
        title="No clubs yet"
        message="Be the first to create a club!"
        variant="inline"
        action={
          userId ? (
            <Link href="/create-club">
              <Button size="sm">Create Club</Button>
            </Link>
          ) : undefined
        }
      />
    );
  }

  return (
    <>
      {availableGenres.length > 0 && (
        <div className="mb-4">
          <GenreTagCloud genres={availableGenres} />
        </div>
      )}
      {clubs.length > 0 && (
        <div className="mb-3">
          <span className="text-[11px] text-[var(--text-muted)]">
            {clubs.length} {clubs.length === 1 ? "club" : "clubs"}
          </span>
        </div>
      )}
      {clubs.length === 0 && genreFilter ? (
        <div className="py-12 text-center">
          <p className="text-sm font-medium text-[var(--text-primary)] mb-1">
            No clubs match this genre
          </p>
          <p className="text-xs text-[var(--text-muted)]">Try removing the filter</p>
        </div>
      ) : (
        <ClubsList clubs={clubs} viewMode={viewMode} />
      )}
    </>
  );
}

// Helper component to render club cards/list
function ClubsList({
  clubs,
  viewMode,
}: {
  clubs: Array<{
    id: string;
    slug: string | null;
    name: string;
    description?: string | null;
    picture_url: string | null;
    member_count: number;
    festival_count?: number;
    movies_watched?: number;
    is_member: boolean;
    user_role?: string;
    avatar_color_index?: number | null;
    theme_color?: string | null;
    privacy?: string | null;
    settings?: unknown;
    keywords?: string[] | null;
    genres?: string[] | null;
  }>;
  viewMode: ClubViewMode;
}) {
  // Prepare clubs with non-null slugs
  const preparedClubs = clubs.map((club) => ({
    ...club,
    slug: club.slug || club.id,
  }));

  if (viewMode === "table") {
    return <DiscoverListView clubs={preparedClubs} />;
  }

  // Cards view — 3-column grid on desktop
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      {preparedClubs.map((club) => (
        <UnifiedClubCard key={club.id} club={club} />
      ))}
    </div>
  );
}
