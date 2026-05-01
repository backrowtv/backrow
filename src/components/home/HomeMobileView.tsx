import { createClient } from "@/lib/supabase/server";
import Link from "next/link";
import Image from "next/image";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { EntityAvatar } from "@/components/ui/entity-avatar";
import { clubToAvatarData } from "@/lib/avatar-helpers";
import { BrandText } from "@/components/ui/brand-text";
import { getClubThemeColorForGlow } from "@/lib/clubs/theme-colors";
import { ChatCircleText } from "@phosphor-icons/react/dist/ssr";
import { Suspense } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { ClubActivityFeed } from "./ClubActivityFeed";
import { getFeaturedMovies, type FeaturedMovie, type FeaturedMovies } from "./FeaturedSections";
import { getFeaturedClub } from "@/app/actions/marketing";
import { UrgentIndicator, UrgentText } from "./UrgentIndicator";
import { EmptyState } from "@/components/shared/EmptyState";
import { FilmReel, UsersThree } from "@phosphor-icons/react/dist/ssr";
import { TimeAgo } from "./TimeAgo";
import { cn } from "@/lib/utils";
import { getTMDBBlurDataURL, getBackdropBlurDataURL } from "@/lib/utils/blur-placeholder";

// ============================================
// TYPE DEFINITIONS
// ============================================

interface MobileClub {
  id: string;
  name: string;
  slug: string | null;
  picture_url: string | null;
  settings: Record<string, unknown> | null;
  theme_color: string | null;
  is_favorite: boolean;
  festival_phase: string | null;
  role?: string;
  ratings_enabled: boolean;
  member_count?: number;
}

interface UpcomingDateItemData {
  date: string;
  label: string;
  clubName: string;
  clubSlug: string;
  festivalSlug: string;
  clubPictureUrl: string | null;
  clubAvatarIcon: string | null;
  clubAvatarColorIndex: number | null;
  clubAvatarBorderColorIndex: number | null;
}

// ============================================
// DATA FETCHING
// ============================================

// BackRow Featured Club slug - excluded from club count since all users auto-join it
const BACKROW_FEATURED_SLUG = "backrow-featured";

async function getUserData() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  const { data: userProfile } = await supabase
    .from("users")
    .select("display_name, username, avatar_url")
    .eq("id", user.id)
    .maybeSingle();

  // Get user's clubs
  const { data: memberships } = await supabase
    .from("club_members")
    .select("club_id, role")
    .eq("user_id", user.id);

  const clubIds = memberships?.map((m) => m.club_id) || [];

  // Get favorite clubs - create a Set of favorite club IDs for quick lookup
  const { data: favorites } = await supabase
    .from("favorite_clubs")
    .select("club_id, created_at")
    .eq("user_id", user.id);

  const favoriteClubIds = new Set<string>(favorites?.map((f) => f.club_id) || []);
  // Map club_id → favorited timestamp for sorting (longest-favorited first)
  const favoritedAt = new Map<string, string>(
    favorites?.map((f) => [f.club_id, f.created_at || ""]) || []
  );

  // Get active festivals for clubs with their phase
  const { data: activeFestivals } =
    clubIds.length > 0
      ? await supabase
          .from("festivals")
          .select("club_id, phase, status")
          .in("club_id", clubIds)
          .in("status", ["nominating", "watching"])
      : { data: [] };

  // Map club_id to festival phase for display
  const clubFestivalPhase = new Map<string, string>();
  activeFestivals?.forEach((f) => {
    // Only set if not already set (first active festival wins)
    if (!clubFestivalPhase.has(f.club_id)) {
      clubFestivalPhase.set(f.club_id, f.phase);
    }
  });

  let clubs: MobileClub[] = [];
  if (clubIds.length > 0) {
    // Fetch favorites first (no limit) to ensure they're always included
    const favoriteClubIdsArray = Array.from(favoriteClubIds);
    const { data: favoriteClubsData } =
      favoriteClubIdsArray.length > 0
        ? await supabase
            .from("clubs")
            .select(
              "id, name, slug, picture_url, settings, theme_color, avatar_icon, avatar_color_index, avatar_border_color_index, club_members(count)"
            )
            .in("id", favoriteClubIdsArray)
            .eq("archived", false)
        : { data: [] };

    // Fill remaining slots with non-favorite clubs
    const remainingSlots = Math.max(0, 6 - (favoriteClubsData?.length || 0));
    const nonFavoriteClubIds = clubIds.filter((id) => !favoriteClubIds.has(id));

    const { data: otherClubsData } =
      remainingSlots > 0 && nonFavoriteClubIds.length > 0
        ? await supabase
            .from("clubs")
            .select(
              "id, name, slug, picture_url, settings, theme_color, avatar_icon, avatar_color_index, avatar_border_color_index, club_members(count)"
            )
            .in("id", nonFavoriteClubIds)
            .eq("archived", false)
            .limit(remainingSlots)
        : { data: [] };

    // Combine: favorites first, then others
    const allClubsData = [...(favoriteClubsData || []), ...(otherClubsData || [])];

    clubs = allClubsData
      .map((club) => {
        const settings = (club.settings as Record<string, unknown>) || {};
        const ratingsEnabled = settings.club_ratings_enabled !== false; // Default true
        // Extract member count from the nested count query
        const memberCount =
          Array.isArray(club.club_members) && club.club_members[0]
            ? (club.club_members[0] as { count: number }).count
            : 0;

        return {
          ...club,
          theme_color: club.theme_color,
          is_favorite: favoriteClubIds.has(club.id),
          festival_phase: clubFestivalPhase.get(club.id) || null,
          role: memberships?.find((m) => m.club_id === club.id)?.role,
          ratings_enabled: ratingsEnabled,
          member_count: memberCount,
        };
      })
      .sort((a, b) => {
        // Favorites first, then active festivals
        if (a.is_favorite && !b.is_favorite) return -1;
        if (!a.is_favorite && b.is_favorite) return 1;
        // Among favorites: longest-favorited first (earliest created_at)
        if (a.is_favorite && b.is_favorite) {
          const aTime = favoritedAt.get(a.id) || "";
          const bTime = favoritedAt.get(b.id) || "";
          return aTime.localeCompare(bTime);
        }
        if (a.festival_phase && !b.festival_phase) return -1;
        if (!a.festival_phase && b.festival_phase) return 1;
        return 0;
      });
  }

  // Count clubs excluding BackRow Featured (since all users auto-join it)
  const clubCountExcludingFeatured = clubs.filter((c) => c.slug !== BACKROW_FEATURED_SLUG).length;

  return {
    id: user.id,
    email: user.email,
    displayName: userProfile?.display_name || user.email?.split("@")[0] || "User",
    username: userProfile?.username,
    avatarUrl: userProfile?.avatar_url,
    clubs,
    clubCount: clubCountExcludingFeatured,
  };
}

async function getUpcomingDates(userId: string) {
  const supabase = await createClient();

  const { data: memberships } = await supabase
    .from("club_members")
    .select("club_id")
    .eq("user_id", userId);

  if (!memberships || memberships.length === 0) return [];

  const clubIds = memberships.map((m) => m.club_id);

  const { data: festivals } = await supabase
    .from("festivals")
    .select(
      `
      id,
      slug,
      theme,
      phase,
      nomination_deadline,
      watch_deadline,
      rating_deadline,
      club:club_id (
        id,
        name,
        slug,
        picture_url,
        settings,
        avatar_icon,
        avatar_color_index,
        avatar_border_color_index
      )
    `
    )
    .in("club_id", clubIds)
    .in("status", ["nominating", "watching"])
    .order("nomination_deadline", { ascending: true })
    .limit(5);

  const upcomingDates: Array<{
    id: string;
    type: string;
    label: string;
    date: string;
    clubName: string;
    clubSlug: string;
    festivalSlug: string;
    theme: string | null;
    clubPictureUrl: string | null;
    clubAvatarIcon: string | null;
    clubAvatarColorIndex: number | null;
    clubAvatarBorderColorIndex: number | null;
  }> = [];

  festivals?.forEach((f) => {
    const club = Array.isArray(f.club) ? f.club[0] : f.club;
    if (!club) return;

    if (f.nomination_deadline && new Date(f.nomination_deadline) > new Date()) {
      upcomingDates.push({
        id: `${f.id}-nomination`,
        type: "nomination",
        label: "Nominations",
        date: f.nomination_deadline,
        clubName: club.name,
        clubSlug: club.slug || club.id,
        festivalSlug: f.slug || f.id,
        theme: f.theme,
        clubPictureUrl: club.picture_url || null,
        clubAvatarIcon: club.avatar_icon || null,
        clubAvatarColorIndex: club.avatar_color_index ?? null,
        clubAvatarBorderColorIndex: club.avatar_border_color_index ?? null,
      });
    }
    if (f.rating_deadline && new Date(f.rating_deadline) > new Date()) {
      upcomingDates.push({
        id: `${f.id}-rating`,
        type: "rating",
        label: "Ratings",
        date: f.rating_deadline,
        clubName: club.name,
        clubSlug: club.slug || club.id,
        festivalSlug: f.slug || f.id,
        theme: f.theme,
        clubPictureUrl: club.picture_url || null,
        clubAvatarIcon: club.avatar_icon || null,
        clubAvatarColorIndex: club.avatar_color_index ?? null,
        clubAvatarBorderColorIndex: club.avatar_border_color_index ?? null,
      });
    }
  });

  return upcomingDates
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
    .slice(0, 3);
}

// ============================================
// COMPONENTS
// ============================================

function MobileSection({
  title,
  href,
  linkText,
  children,
  className,
}: {
  title: string;
  href?: string;
  linkText?: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section className={cn("space-y-3", className)}>
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-bold text-[var(--text-primary)] uppercase tracking-wide">
          {title}
        </h2>
        {href && linkText && (
          <Link href={href} className="text-sm text-[var(--primary)] pr-1">
            {linkText} &gt;
          </Link>
        )}
      </div>
      {children}
    </section>
  );
}

function UpcomingDateItem({ item }: { item: UpcomingDateItemData }) {
  return (
    <Link
      href={`/club/${item.clubSlug}/festival/${item.festivalSlug}`}
      className="flex items-center gap-3 py-2"
    >
      <EntityAvatar
        entity={clubToAvatarData({
          name: item.clubName,
          picture_url: item.clubPictureUrl,
          avatar_icon: item.clubAvatarIcon,
          avatar_color_index: item.clubAvatarColorIndex,
          avatar_border_color_index: item.clubAvatarBorderColorIndex,
        })}
        emojiSet="club"
        size="xs"
      />
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-[var(--text-primary)] line-clamp-2 leading-tight">
          {item.label}
        </p>
        <p className="text-xs text-[var(--text-muted)] line-clamp-1">{item.clubName}</p>
      </div>
      <UrgentIndicator date={item.date} />
      <UrgentText date={item.date} className="pr-1">
        <TimeAgo date={item.date} className="text-xs" />
      </UrgentText>
    </Link>
  );
}

// Single Movie Card for Mobile - Vertical layout with poster on top
function MobileMovieCard({ movie }: { movie: FeaturedMovie }) {
  // movie.id is the TMDB ID (stored as string) - use it directly for reliable linking
  const posterUrl = movie.poster_url?.startsWith("http")
    ? movie.poster_url
    : `https://image.tmdb.org/t/p/w185${movie.poster_url}`;

  // Use backdrop if available, otherwise fall back to poster for background art
  const backgroundImageUrl = movie.backdrop_url || movie.poster_url;
  const backgroundUrl = backgroundImageUrl?.startsWith("http")
    ? backgroundImageUrl
    : backgroundImageUrl
      ? `https://image.tmdb.org/t/p/w780${backgroundImageUrl}`
      : null;

  const discussLink = movie.thread_id
    ? `/club/${movie.club_slug}/discuss/${movie.thread_slug || movie.thread_id}`
    : `/club/${movie.club_slug}/discuss`;

  return (
    <div className="relative rounded-xl overflow-hidden border border-[var(--border)] bg-[var(--card)] shadow-lg h-full">
      {/* Background art - Faded movie backdrop/poster */}
      {backgroundUrl && (
        <div className="absolute inset-0 z-0">
          <Image
            src={backgroundUrl}
            alt=""
            fill
            className="object-cover opacity-20 dark:opacity-30"
            sizes="200px"
            placeholder="blur"
            blurDataURL={getBackdropBlurDataURL()}
          />
          <div className="absolute inset-0 bg-gradient-to-b from-[var(--card)]/60 via-[var(--card)]/70 to-[var(--card)]/90" />
        </div>
      )}

      {/* Content - Vertical layout */}
      <div className="relative z-10 p-2.5 flex flex-col items-center text-center h-full">
        {/* Poster with discuss button */}
        <div className="relative flex-shrink-0">
          <Link href={`/movies/${movie.id}`}>
            <div className="relative w-20 h-28 rounded-lg overflow-hidden shadow-md ring-1 ring-[var(--border)]">
              <Image
                src={posterUrl}
                alt={movie.title}
                fill
                sizes="80px"
                className="object-cover"
                placeholder="blur"
                blurDataURL={getTMDBBlurDataURL()}
              />
            </div>
          </Link>
          {/* Circular discuss button on poster */}
          <Link
            href={discussLink}
            className="absolute -bottom-1.5 -right-1.5 p-1.5 rounded-full bg-[var(--primary)] hover:bg-[var(--primary-hover)] shadow-md transition-all hover:scale-110 z-10"
            title="View Discussion"
          >
            <ChatCircleText
              className="w-3.5 h-3.5 text-[var(--primary-foreground)]"
              weight="fill"
            />
          </Link>
        </div>

        {/* Info below poster */}
        <div className="mt-1.5 w-full flex-1 flex flex-col justify-center">
          <Link href={`/movies/${movie.id}`}>
            <h3 className="font-bold text-xs leading-tight text-[var(--text-primary)]">
              {movie.title}
              {movie.year && (
                <span className="font-normal text-[10px] text-[var(--text-muted)] ml-0.5">
                  ({movie.year})
                </span>
              )}
            </h3>
          </Link>
          {movie.tagline && (
            <p className="text-[9px] italic text-[var(--text-muted)] mt-0.5 line-clamp-2 leading-tight">
              &ldquo;{movie.tagline}&rdquo;
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

// Movies of the Week Section for Mobile (Featured + Throwback)
function MobileFeaturedMovies({ movies }: { movies: FeaturedMovies }) {
  const featured = movies.featured;
  const throwback = movies.throwback;

  // If no movies are set, show an empty state
  if (!featured && !throwback) {
    return (
      <EmptyState
        icon={FilmReel}
        title="No featured movies yet"
        message="Check back soon!"
        variant="card"
      />
    );
  }

  return (
    <div className="flex gap-2 items-stretch">
      {featured && (
        <div className="flex-1 flex flex-col gap-1">
          <span className="text-[10px] font-medium uppercase tracking-wider text-[var(--text-muted)] text-center">
            Featured New Release
          </span>
          <MobileMovieCard movie={featured} />
        </div>
      )}
      {throwback && (
        <div className="flex-1 flex flex-col gap-1">
          <span className="text-[10px] font-medium uppercase tracking-wider text-[var(--text-muted)] text-center">
            Throwback Movie
          </span>
          <MobileMovieCard movie={throwback} />
        </div>
      )}
    </div>
  );
}

// Featured Club Card for Mobile - Horizontal layout matching desktop style
async function MobileFeaturedClub({ backdropUrl }: { backdropUrl: string | null }) {
  const club = await getFeaturedClub();

  if (!club) {
    return (
      <div className="flex flex-col gap-1">
        <span className="text-[10px] font-medium uppercase tracking-wider text-[var(--text-muted)] text-center">
          Featured Club
        </span>
        <EmptyState icon={UsersThree} title="No club currently featured" variant="card" />
      </div>
    );
  }

  const backgroundUrl = backdropUrl || club.picture_url;

  return (
    <div className="flex flex-col gap-1">
      <span className="text-[10px] font-medium uppercase tracking-wider text-[var(--text-muted)] text-center">
        Featured Club
      </span>
      <Link href={`/club/${club.slug}`}>
        <div className="relative overflow-hidden rounded-xl border border-[var(--border)] bg-[var(--card)] shadow-lg">
          {/* Movie backdrop background */}
          {backgroundUrl && (
            <div className="absolute inset-0 z-0">
              <Image
                src={backgroundUrl}
                alt=""
                fill
                className="object-cover opacity-15 dark:opacity-20"
                sizes="400px"
                placeholder="blur"
                blurDataURL={getBackdropBlurDataURL()}
              />
              <div className="absolute inset-0 bg-gradient-to-r from-[var(--card)]/90 via-[var(--card)]/70 to-[var(--card)]/50" />
            </div>
          )}

          {/* Member count badge - top right corner */}
          <div className="absolute top-2 right-2 z-20 flex items-center gap-1 text-[10px] text-[var(--text-muted)] bg-[var(--card)]/80 backdrop-blur-sm rounded-full px-1.5 py-0.5">
            <UsersThree className="w-3 h-3" weight="fill" />
            <span>{club.member_count}</span>
          </div>

          {/* Content - horizontal layout with avatar left */}
          <div className="relative z-10 px-3 pt-2 pb-3 flex items-center gap-3 min-h-[88px]">
            <EntityAvatar
              entity={clubToAvatarData(club)}
              emojiSet="club"
              size="xl"
              className="flex-shrink-0 shadow-md ring-1 ring-[var(--border)]"
            />

            <div className="flex-1 min-w-0">
              <h3 className="font-bold text-base leading-tight text-[var(--text-primary)]">
                <BrandText>{club.name}</BrandText>
              </h3>
              {club.description && (
                <p className="text-[11px] text-[var(--text-secondary)] mt-1 line-clamp-4 leading-relaxed">
                  {club.description}
                </p>
              )}
            </div>
          </div>
        </div>
      </Link>
    </div>
  );
}

function ActivitySkeleton() {
  return (
    <div className="space-y-2">
      {[1, 2, 3].map((i) => (
        <div key={i} className="p-3 rounded-xl bg-[var(--surface-1)]">
          <div className="flex items-center gap-3">
            <Skeleton className="h-8 w-8 rounded-full" />
            <div className="flex-1">
              <Skeleton className="h-4 w-3/4 mb-1" />
              <Skeleton className="h-3 w-1/2" />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

function ClubsSkeleton() {
  return (
    <div className="flex gap-3 overflow-hidden">
      {[1, 2, 3].map((i) => (
        <div key={i} className="w-[120px] flex-shrink-0">
          <Skeleton className="h-[120px] rounded-xl" />
        </div>
      ))}
    </div>
  );
}

function MoviesSkeleton() {
  return (
    <div className="flex gap-3 overflow-hidden">
      {[1, 2, 3, 4].map((i) => (
        <div key={i} className="w-[100px] flex-shrink-0">
          <Skeleton className="aspect-[2/3] rounded-lg" />
          <Skeleton className="h-3 w-full mt-1.5" />
        </div>
      ))}
    </div>
  );
}

// ============================================
// MAIN COMPONENT
// ============================================

async function MobileContent() {
  const userData = await getUserData();

  if (!userData) return null;

  const [upcomingDates, featuredMovies] = await Promise.all([
    getUpcomingDates(userData.id),
    getFeaturedMovies(),
  ]);

  return (
    <div className="space-y-6">
      {/* 1. Favorite Clubs */}
      {(() => {
        const favoriteClubs = userData.clubs.filter((c) => c.is_favorite && c.slug);
        const sectionTitle = favoriteClubs.length === 1 ? "Favorite Club" : "Favorite Clubs";
        return favoriteClubs.length > 0 ? (
          <MobileSection title={sectionTitle} href="/clubs" linkText="All">
            <ScrollArea className="w-full">
              <div className="flex gap-3 pb-2">
                {favoriteClubs.map((club) => {
                  const themeGlow = getClubThemeColorForGlow(club.theme_color);
                  const bgStyle = themeGlow
                    ? {
                        backgroundColor: `hsla(${themeGlow.h}, ${themeGlow.s}%, ${themeGlow.l}%, 0.3)`,
                      }
                    : undefined;
                  return (
                    <Link key={club.id} href={`/club/${club.slug}`} className="flex-shrink-0">
                      {/* Square avatar box */}
                      <div
                        className="w-[72px] h-[72px] rounded-xl flex items-center justify-center border border-[var(--emboss-border)] shadow-[var(--emboss-shadow)]"
                        style={bgStyle}
                      >
                        <EntityAvatar entity={clubToAvatarData(club)} emojiSet="club" size="lg" />
                      </div>
                    </Link>
                  );
                })}
              </div>
              <ScrollBar orientation="horizontal" />
            </ScrollArea>
          </MobileSection>
        ) : (
          <EmptyState icon={UsersThree} title="No favorited clubs" variant="compact" />
        );
      })()}

      {/* 2. Upcoming Dates - Always show */}
      <MobileSection title="Upcoming" href="/timeline" linkText="All">
        {upcomingDates.length > 0 ? (
          <div className="space-y-2">
            {upcomingDates.map((item) => (
              <UpcomingDateItem key={item.id} item={item} />
            ))}
          </div>
        ) : (
          <div className="py-3 text-center">
            <p className="text-xs text-[var(--text-muted)]">No upcoming deadlines or events.</p>
          </div>
        )}
      </MobileSection>

      {/* 3. Movies of the Week - Featured + Throwback */}
      <MobileFeaturedMovies movies={featuredMovies} />

      {/* 4. Featured Club */}
      <Suspense fallback={<Skeleton className="h-24 rounded-xl" />}>
        <MobileFeaturedClub
          backdropUrl={(() => {
            const movie = featuredMovies.featured || featuredMovies.throwback;
            if (!movie?.backdrop_url) return null;
            return movie.backdrop_url.startsWith("http")
              ? movie.backdrop_url
              : `https://image.tmdb.org/t/p/w780${movie.backdrop_url}`;
          })()}
        />
      </Suspense>

      {/* 5. Activity Feed */}
      <MobileSection title="Recent Activity" href="/activity" linkText="All">
        <Suspense fallback={<ActivitySkeleton />}>
          <ClubActivityFeed userId={userData.id} limit={5} />
        </Suspense>
      </MobileSection>

      {/* 6. Blog */}
      <MobileSection title="From the Blog" className="mt-4">
        <div className="py-4 text-center">
          <p className="text-sm font-medium text-[var(--text-primary)]">Blog Coming Soon</p>
          <p className="text-xs text-[var(--text-muted)] mt-1">
            Tips, guides, and stories from the world of film clubs.
          </p>
        </div>
      </MobileSection>
    </div>
  );
}

function MobileViewSkeleton() {
  return (
    <div className="space-y-6">
      {/* Hero skeleton */}
      <div className="rounded-2xl bg-[var(--surface-1)] p-5">
        <div className="flex items-center gap-4 mb-4">
          <Skeleton className="w-12 h-12 rounded-full" />
          <div className="flex-1">
            <Skeleton className="h-3 w-20 mb-1" />
            <Skeleton className="h-5 w-32" />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Skeleton className="h-11 rounded-lg" />
          <Skeleton className="h-11 rounded-lg" />
        </div>
      </div>

      {/* Clubs skeleton */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-3 w-16" />
        </div>
        <ClubsSkeleton />
      </div>

      {/* Activity skeleton */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <Skeleton className="h-4 w-28" />
          <Skeleton className="h-3 w-16" />
        </div>
        <ActivitySkeleton />
      </div>

      {/* Movies skeleton */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-3 w-16" />
        </div>
        <MoviesSkeleton />
      </div>
    </div>
  );
}

/**
 * Mobile view for home page - content below the theater frame
 * Hero text is now overlaid on the theater frame, so this just shows the sections
 */
export async function HomeMobileView() {
  return (
    <div className="px-4 pt-4 pb-24">
      <Suspense fallback={<MobileViewSkeleton />}>
        <MobileContent />
      </Suspense>
    </div>
  );
}
