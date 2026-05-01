import { createClient } from "@/lib/supabase/server";
import { unstable_noStore as noStore } from "next/cache";
import Link from "next/link";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { refreshMovie } from "@/app/actions/movies";
import { EntityAvatar } from "@/components/ui/entity-avatar";
import { clubToAvatarData } from "@/lib/avatar-helpers";
import { BrandText } from "@/components/ui/brand-text";
import { getTMDBBlurDataURL, getBackdropBlurDataURL } from "@/lib/utils/blur-placeholder";
import { EmptyState } from "@/components/shared/EmptyState";
import { FilmReel, UsersThree } from "@phosphor-icons/react/dist/ssr";
import { Skeleton, SkeletonPoster, SkeletonAvatar } from "@/components/ui/skeleton";

// ============================================
// FEATURED MOVIES (Throwback + New Release)
// ============================================

export interface FeaturedMovie {
  id: string;
  title: string;
  year: number | null;
  poster_url: string | null;
  backdrop_url: string | null;
  tagline: string | null;
  curator_note: string | null; // Custom description (max 100 chars), NOT TMDB overview
  club_slug: string;
  festival_slug: string;
  theme: string | null;
  type: "throwback" | "featured";
  thread_id: string | null;
  thread_slug: string | null;
}

export interface FeaturedMovies {
  throwback: FeaturedMovie | null;
  featured: FeaturedMovie | null;
}

// Placeholder movie data for when no movies are set in BackRow Featured club
// These are shown only as fallbacks - admins should set real featured movies
export const PLACEHOLDER_THROWBACK: FeaturedMovie | null = null;

export const PLACEHOLDER_FEATURED: FeaturedMovie | null = null;

/**
 * Get both movies of the week from the BackRow Featured club
 * Returns a Featured New Release (currently in theaters) and a Throwback Movie (classic)
 * Uses the new endless festival architecture with display_slot
 */
export async function getFeaturedMovies(): Promise<FeaturedMovies> {
  // Disable caching to ensure fresh data
  noStore();

  const supabase = await createClient();

  // Find the BackRow Featured club
  const { data: club, error: clubError } = await supabase
    .from("clubs")
    .select("id, slug")
    .eq("slug", "backrow-featured")
    .single();

  if (clubError) {
    console.error("[getFeaturedMovies] Club query error:", clubError);
  }

  if (!club) {
    return { throwback: null, featured: null };
  }

  // Get the endless festival for this club
  const { data: festival, error: festivalError } = await supabase
    .from("festivals")
    .select("id, slug")
    .eq("club_id", club.id)
    .eq("status", "watching")
    .limit(1)
    .maybeSingle();

  if (festivalError) {
    console.error("[getFeaturedMovies] Festival query error:", festivalError);
  }

  if (!festival) {
    return { throwback: null, featured: null };
  }

  // Get nominations with display_slot set (featured or throwback)
  const { data: nominations, error: nominationsError } = await supabase
    .from("nominations")
    .select(
      `
      id,
      tmdb_id,
      pitch,
      display_slot,
      endless_status,
      movie:movies!inner(
        tmdb_id,
        title,
        year,
        poster_url,
        backdrop_url,
        overview,
        tagline
      )
    `
    )
    .eq("festival_id", festival.id)
    .eq("endless_status", "playing")
    .in("display_slot", ["featured", "throwback"])
    .is("deleted_at", null);

  if (nominationsError) {
    console.error("[getFeaturedMovies] Nominations query error:", nominationsError);
  }

  if (!nominations || nominations.length === 0) {
    return { throwback: null, featured: null };
  }

  // Get tmdb_ids to fetch discussion threads
  const tmdbIds = nominations
    .map((n) => {
      const movieData = Array.isArray(n.movie) ? n.movie[0] : n.movie;
      return movieData?.tmdb_id;
    })
    .filter((id): id is number => id != null);

  // Fetch discussion threads for these movies in this club
  const { data: threads } = await supabase
    .from("discussion_threads")
    .select("id, slug, tmdb_id")
    .eq("club_id", club.id)
    .in("tmdb_id", tmdbIds);

  // Create a map of tmdb_id -> { id, slug }
  const threadMap = new Map<number, { id: string; slug: string | null }>();
  threads?.forEach((t) => {
    if (t.tmdb_id) threadMap.set(t.tmdb_id, { id: t.id, slug: t.slug });
  });

  const result: FeaturedMovies = { throwback: null, featured: null };

  for (const nomination of nominations) {
    const movieData = Array.isArray(nomination.movie) ? nomination.movie[0] : nomination.movie;
    let movie = movieData;

    if (!movie) continue;

    // Auto-refresh movie data if backdrop is missing
    if (!movie.backdrop_url) {
      const refreshResult = await refreshMovie(movie.tmdb_id);
      if (refreshResult.success && refreshResult.movie) {
        movie = {
          tmdb_id: refreshResult.movie.tmdb_id,
          title: refreshResult.movie.title,
          year: refreshResult.movie.year,
          poster_url: refreshResult.movie.poster_url,
          backdrop_url: refreshResult.movie.backdrop_url,
          overview: refreshResult.movie.overview,
          tagline: refreshResult.movie.tagline ?? null,
        };
      }
    }

    const type = nomination.display_slot as "throwback" | "featured";

    const threadInfo = threadMap.get(movie.tmdb_id);
    const movieOfWeek: FeaturedMovie = {
      id: String(movie.tmdb_id),
      title: movie.title,
      year: movie.year,
      poster_url: movie.poster_url,
      backdrop_url: movie.backdrop_url,
      tagline: movie.tagline || null,
      curator_note: nomination?.pitch || null, // Only use custom description, no TMDB fallback
      club_slug: club.slug,
      festival_slug: festival.slug || festival.id,
      theme: type === "featured" ? "Featured New Release" : "Throwback Movie",
      type,
      thread_id: threadInfo?.id || null,
      thread_slug: threadInfo?.slug || null,
    };

    if (type === "throwback" && !result.throwback) {
      result.throwback = movieOfWeek;
    } else if (type === "featured" && !result.featured) {
      result.featured = movieOfWeek;
    }
  }

  return result;
}

// Legacy function for backwards compatibility
export async function getFeaturedMovie(): Promise<FeaturedMovie | null> {
  const movies = await getFeaturedMovies();
  return movies.featured || movies.throwback;
}

// Single movie card component
function MovieCard({
  movie,
  label: _label,
  priority = false,
}: {
  movie: FeaturedMovie;
  label: string;
  priority?: boolean;
}) {
  // movie.id is the TMDB ID (stored as string) - use it directly for reliable linking
  // Use backdrop if available, otherwise fall back to poster for background art
  const backgroundImageUrl = movie.backdrop_url || movie.poster_url;

  return (
    <div className="relative rounded-xl overflow-hidden group flex-1 border border-[var(--border)] bg-[var(--surface-2)] shadow-lg">
      {/* Scenic backdrop/poster background - Faded art effect */}
      {backgroundImageUrl && (
        <div className="absolute inset-0 z-0">
          <Image
            src={
              backgroundImageUrl.startsWith("http")
                ? backgroundImageUrl
                : `https://image.tmdb.org/t/p/w780${backgroundImageUrl}`
            }
            alt=""
            fill
            className="object-cover opacity-10 dark:opacity-20 group-hover:opacity-15 dark:group-hover:opacity-25 transition-opacity"
            sizes="(max-width: 768px) 100vw, 400px"
            placeholder="blur"
            blurDataURL={getBackdropBlurDataURL()}
          />
          <div className="absolute inset-0 bg-[var(--surface-2)]/85" />
        </div>
      )}

      {/* Content */}
      <div className="relative z-10">
        {/* Content */}
        <div className="px-4 py-4 flex gap-4">
          {/* Poster - Links to movie page */}
          <Link href={`/movies/${movie.id}`} className="flex-shrink-0 group/poster">
            <div className="relative w-24 h-36 rounded-lg overflow-hidden shadow-lg group-hover/poster:shadow-xl transition-shadow ring-1 ring-[var(--border)]">
              {movie.poster_url && (
                <Image
                  src={
                    movie.poster_url.startsWith("http")
                      ? movie.poster_url
                      : `https://image.tmdb.org/t/p/w342${movie.poster_url}`
                  }
                  alt={movie.title}
                  fill
                  sizes="96px"
                  className="object-cover group-hover/poster:scale-105 transition-transform duration-300"
                  priority={priority}
                  placeholder="blur"
                  blurDataURL={getTMDBBlurDataURL()}
                />
              )}
            </div>
          </Link>

          {/* Info */}
          <div className="flex-1 min-w-0 py-1 flex flex-col">
            <div className="flex-1">
              <Link href={`/movies/${movie.id}`} className="group/title">
                <h3 className="font-bold text-xl text-[var(--text-primary)] group-hover/title:text-[var(--primary)] transition-colors leading-tight">
                  {movie.title}
                  {movie.year && (
                    <span className="hidden sm:inline font-normal text-[var(--text-muted)] text-base ml-1">
                      ({movie.year})
                    </span>
                  )}
                </h3>
              </Link>
              {movie.year && (
                <span className="sm:hidden text-sm text-[var(--text-muted)] -mt-0.5 block">
                  ({movie.year})
                </span>
              )}
              {movie.tagline && (
                <p className="text-[11px] sm:text-xs italic text-[var(--text-muted)] mt-0.5 line-clamp-2">
                  &ldquo;{movie.tagline}&rdquo;
                </p>
              )}
              {movie.curator_note && (
                <p className="text-base text-[var(--text-secondary)] mt-1.5 line-clamp-2">
                  {movie.curator_note}
                </p>
              )}
            </div>
            <div className="pt-2">
              <Button variant="outline" size="sm" className="h-7 text-xs px-3" asChild>
                <Link
                  href={
                    movie.thread_id
                      ? `/club/${movie.club_slug}/discuss/${movie.thread_slug || movie.thread_id}`
                      : `/club/${movie.club_slug}/discuss`
                  }
                >
                  Discuss
                </Link>
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export async function FeaturedMovieSection() {
  const movies = await getFeaturedMovies();

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
    <div className="flex flex-col 2xl:flex-row gap-3">
      {featured && (
        <div className="flex-1 min-w-0 space-y-1.5">
          <span className="block text-center text-sm font-medium uppercase tracking-wide text-[var(--text-muted)]">
            Featured New Release
          </span>
          <MovieCard movie={featured} label="Featured New Release" priority />
        </div>
      )}
      {throwback && (
        <div className="flex-1 min-w-0 space-y-1.5">
          <span className="block text-center text-sm font-medium uppercase tracking-wide text-[var(--text-muted)]">
            Throwback Movie
          </span>
          <MovieCard movie={throwback} label="Throwback Movie" />
        </div>
      )}
    </div>
  );
}

// ============================================
// FEATURED CLUB
// ============================================

interface FeaturedClub {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  picture_url: string | null;
  header_url: string | null; // From background_value when background_type is image
  avatar_icon?: string | null;
  avatar_color_index?: number | null;
  avatar_border_color_index?: number | null;
  member_count: number;
  active_festival_theme: string | null;
}

async function getFeaturedClub(): Promise<FeaturedClub | null> {
  // Disable caching to ensure fresh data
  noStore();

  const supabase = await createClient();

  // Get a club that's marked as featured by admin
  // Check featured_until to handle expiration
  const { data: club } = await supabase
    .from("clubs")
    .select(
      "id, name, slug, description, picture_url, settings, background_type, background_value, avatar_icon, avatar_color_index, avatar_border_color_index"
    )
    .eq("featured", true)
    .or("featured_until.is.null,featured_until.gt.now()")
    .eq("archived", false)
    .order("featured_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!club) return null;

  // Get member count
  const { count: memberCount } = await supabase
    .from("club_members")
    .select("*", { count: "exact", head: true })
    .eq("club_id", club.id);

  // Get active festival theme
  const { data: festival } = await supabase
    .from("festivals")
    .select("theme")
    .eq("club_id", club.id)
    .in("status", ["nominating", "watching"])
    .limit(1)
    .single();

  // Get header URL from background_value if it's an image type
  const headerUrl =
    club.background_type === "image" && club.background_value ? club.background_value : null;

  return {
    id: club.id,
    name: club.name,
    slug: club.slug || club.id,
    description: club.description,
    picture_url: club.picture_url,
    header_url: headerUrl,
    avatar_icon: club.avatar_icon,
    avatar_color_index: club.avatar_color_index,
    avatar_border_color_index: club.avatar_border_color_index,
    member_count: memberCount || 0,
    active_festival_theme: festival?.theme || null,
  };
}

export async function FeaturedClubSection() {
  const [club, movies] = await Promise.all([getFeaturedClub(), getFeaturedMovies()]);

  if (!club) {
    return <EmptyState icon={UsersThree} title="No club currently featured" variant="card" />;
  }

  // Get a movie backdrop for the card background
  const movieForBackdrop = movies.featured || movies.throwback;
  const backdropUrl = movieForBackdrop?.backdrop_url
    ? movieForBackdrop.backdrop_url.startsWith("http")
      ? movieForBackdrop.backdrop_url
      : `https://image.tmdb.org/t/p/w1280${movieForBackdrop.backdrop_url}`
    : null;
  const backgroundUrl = backdropUrl || club.header_url || club.picture_url;

  return (
    <div className="space-y-1.5">
      <span className="block text-center text-sm font-medium uppercase tracking-wide text-[var(--text-muted)]">
        Featured Club
      </span>
      <Link href={`/club/${club.slug}`}>
        <div className="relative rounded-xl overflow-hidden group border border-[var(--border)] hover:border-[var(--primary)]/30 bg-[var(--surface-2)] shadow-lg transition-all">
          {/* Movie backdrop background */}
          {backgroundUrl && (
            <div className="absolute inset-0 z-0">
              <Image
                src={backgroundUrl}
                alt=""
                fill
                className="object-cover opacity-10 dark:opacity-15 group-hover:opacity-15 dark:group-hover:opacity-20 transition-opacity"
                sizes="(max-width: 768px) 100vw, 600px"
                placeholder="blur"
                blurDataURL={getBackdropBlurDataURL()}
              />
              <div className="absolute inset-0 bg-[var(--surface-2)]/85" />
            </div>
          )}

          {/* Member count badge - top right corner */}
          <div className="absolute top-2 right-2 z-20 flex items-center gap-1 text-[10px] text-[var(--text-muted)] bg-[var(--surface-2)]/80 backdrop-blur-sm rounded-full px-1.5 py-0.5">
            <UsersThree className="w-3 h-3" weight="fill" />
            <span>{club.member_count}</span>
          </div>

          {/* Content */}
          <div className="relative z-10 px-3 pt-2 pb-3 flex items-center gap-3 min-h-[88px]">
            {/* Club Avatar - vertically centered */}
            <EntityAvatar
              entity={clubToAvatarData(club)}
              emojiSet="club"
              size="xl"
              className="flex-shrink-0 shadow-md ring-1 ring-[var(--border)]"
            />

            {/* Info */}
            <div className="flex-1 min-w-0">
              <h3 className="font-bold text-base sm:text-lg text-[var(--text-primary)] group-hover:text-[var(--primary)] transition-colors leading-tight">
                <BrandText>{club.name}</BrandText>
              </h3>
              {club.description && (
                <p className="text-[11px] sm:text-xs text-[var(--text-secondary)] mt-1 line-clamp-4 leading-relaxed">
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

// ============================================
// SKELETONS
// ============================================

function MovieCardSkeleton() {
  return (
    <div className="rounded-xl overflow-hidden flex-1 bg-[var(--card)] shadow-lg">
      <div className="px-4 pt-3 pb-2">
        <Skeleton className="h-2 w-24" />
      </div>
      <div className="px-4 pb-4 flex gap-4">
        <SkeletonPoster size="sm" />
        <div className="flex-1 space-y-2 py-1">
          <Skeleton className="h-4 w-3/4" />
          <Skeleton className="h-3 w-full mt-1.5" />
          <Skeleton className="h-3 w-2/3" />
          <Skeleton className="h-7 w-20 mt-2" />
        </div>
      </div>
    </div>
  );
}

export function FeaturedMovieSkeleton() {
  // Real page renders both `featured` and `throwback` side-by-side when both exist.
  // Show two cards to match the most common state.
  return (
    <div className="flex flex-col 2xl:flex-row gap-3">
      <MovieCardSkeleton />
      <MovieCardSkeleton />
    </div>
  );
}

export function FeaturedClubSkeleton() {
  return (
    <div className="rounded-xl overflow-hidden bg-[var(--card)] shadow-lg">
      <div className="px-4 pt-3 pb-2">
        <Skeleton className="h-2 w-20" />
      </div>
      <div className="px-4 pb-4 flex gap-4 min-h-[88px]">
        <SkeletonAvatar size="xl" />
        <div className="flex-1 space-y-2 py-1">
          <Skeleton className="h-5 w-40" />
          <Skeleton className="h-3 w-32" />
          <Skeleton className="h-3 w-full mt-2" />
          <Skeleton className="h-3 w-3/4" />
        </div>
      </div>
    </div>
  );
}
