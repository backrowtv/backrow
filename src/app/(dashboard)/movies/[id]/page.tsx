import type { Metadata } from "next";
import {
  getMovieDetails,
  getPosterUrl,
  getWatchProviders,
  extractUSCertification,
  type TMDBMovie,
} from "@/lib/tmdb/client";
import { createClient } from "@/lib/supabase/server";
import { getMovieForSeo } from "@/lib/seo/fetchers";
import { absoluteUrl } from "@/lib/seo/absolute-url";
import { MovieJsonLd } from "@/components/seo/JsonLd";
import { getMovieBySlug, getMovie, cacheMovie } from "@/app/actions/movies";
import { getMovieLinkPreferences } from "@/app/actions/navigation-preferences";
import { Badge } from "@/components/ui/badge";
import { getGenreColor } from "@/lib/movies/colors";
import { CollapsibleText } from "@/components/ui/collapsible-text";
import { Clock } from "@phosphor-icons/react/dist/ssr";
import { ExternalLink } from "@/components/ui/external-logos";
import { CustomizeHint } from "@/components/ui/CustomizeHint";
import Image from "next/image";
import { generateBlurDataURL } from "@/lib/utils/blur-generator";
import { ClubDiscussionNotes } from "@/components/movies/ClubDiscussionNotes";
import { WatchProviders } from "@/components/movies/WatchProviders";
import { MovieFestivalHistory } from "@/components/movies/MovieFestivalHistory";
import { MovieActions } from "@/components/movies/MovieActions";
import { PrivateNoteEditor } from "@/components/movies/PrivateNoteEditor";
import { CastCarousel } from "@/components/movies/CastCarousel";
import { getMovieFestivalHistory } from "@/app/actions/movie-history";
import { FavoriteButton } from "@/components/movies/FavoriteButton";
import { notFound, redirect } from "next/navigation";

interface MoviePageProps {
  params: Promise<{ id: string }>;
}

export async function generateMetadata({ params }: MoviePageProps): Promise<Metadata> {
  const { id } = await params;
  const movie = await getMovieForSeo(id);
  if (!movie) {
    return { title: "Movie not found · BackRow", robots: { index: false, follow: false } };
  }
  const canonicalId = movie.slug ?? String(movie.tmdb_id);
  const url = absoluteUrl(`/movies/${canonicalId}`);
  const titleWithYear = movie.year ? `${movie.title} (${movie.year})` : movie.title;
  const description =
    movie.overview?.slice(0, 160) ||
    movie.tagline ||
    `${titleWithYear} — ratings and reviews from BackRow movie clubs.`;
  return {
    title: `${titleWithYear} · BackRow`,
    description,
    alternates: { canonical: url },
    openGraph: {
      title: titleWithYear,
      description,
      url,
      type: "video.movie",
      siteName: "BackRow",
    },
    twitter: { card: "summary_large_image", title: titleWithYear, description },
    robots: movie.slug ? { index: true, follow: true } : { index: false, follow: true },
  };
}

export default async function MoviePage({ params }: MoviePageProps) {
  const { id } = await params;
  const supabase = await createClient();

  // Try to get movie by slug first, then fallback to TMDB ID for backwards compatibility
  let dbMovie: { tmdb_id: number; title: string; slug: string | null } | null = null;
  let tmdbMovie: TMDBMovie | null = null;

  // Check if it's a numeric ID (TMDB ID) or a slug.
  // Must be pure digits — otherwise slugs like "10-things-..." misclassify as TMDB id 10.
  const isNumericId = /^\d+$/.test(id);
  const movieId = isNumericId ? Number(id) : NaN;

  if (isNumericId) {
    // It's a TMDB ID - check if we have it cached, if so redirect to slug
    const result = await getMovie(movieId);
    if (result.movie && result.movie.slug) {
      // Movie exists with slug - redirect to slug URL
      redirect(`/movies/${result.movie.slug}`);
    }

    // Try to cache the movie and redirect to slug
    const cacheResult = await cacheMovie(movieId);
    if (cacheResult.movie?.slug) {
      redirect(`/movies/${cacheResult.movie.slug}`);
    }

    // Fallback: movie couldn't be cached, show with TMDB ID
    dbMovie = result.movie || cacheResult.movie || null;
    tmdbMovie = await getMovieDetails(movieId);
  } else {
    const result = await getMovieBySlug(id);
    if (result.error || !result.movie) {
      notFound();
    }
    dbMovie = result.movie;
    if (dbMovie) {
      tmdbMovie = await getMovieDetails(dbMovie.tmdb_id);
    }
  }

  if (dbMovie && !tmdbMovie) {
    tmdbMovie = await getMovieDetails(dbMovie.tmdb_id);
  }

  if (!tmdbMovie) {
    notFound();
  }

  const finalTmdbId = dbMovie?.tmdb_id || tmdbMovie!.id;
  const posterUrl = getPosterUrl(tmdbMovie!.poster_path);
  const backdrops = tmdbMovie!.images?.backdrops ?? [];

  // Prefer text-free backdrops (null language), fall back to English, then any
  const textFree = backdrops.filter((b) => b.iso_639_1 === null);
  const english = backdrops.filter((b) => b.iso_639_1 === "en");
  const candidates = textFree.length > 0 ? textFree : english.length > 0 ? english : backdrops;

  // Sort by quality, pick randomly from top candidates for variety
  const sorted = [...candidates].sort((a, b) => b.vote_average - a.vote_average);
  const topCandidates = sorted.slice(0, Math.min(5, sorted.length));
  const randomBackdrop = topCandidates.length > 0 ? topCandidates[topCandidates.length - 1] : null;
  const backdropUrl = randomBackdrop
    ? `https://image.tmdb.org/t/p/w1280${randomBackdrop.file_path}`
    : tmdbMovie!.backdrop_path
      ? `https://image.tmdb.org/t/p/w1280${tmdbMovie!.backdrop_path}`
      : null;

  // Generate blur placeholders for hero images
  const backdropPath = randomBackdrop?.file_path || tmdbMovie!.backdrop_path;
  const [posterBlur, backdropBlur] = await Promise.all([
    tmdbMovie!.poster_path
      ? generateBlurDataURL(tmdbMovie!.poster_path, "poster")
      : Promise.resolve(undefined),
    backdropPath ? generateBlurDataURL(backdropPath, "backdrop") : Promise.resolve(undefined),
  ]);

  // Fetch user data, notes, and discussions
  const {
    data: { user },
  } = await supabase.auth.getUser();
  let discussions: Array<{
    id: string;
    title: string;
    slug: string | null;
    club_id: string;
    club_name: string;
    club_slug: string | null;
    club_avatar_url?: string | null;
    comment_count: number;
    created_at?: string;
    author?: { display_name: string; avatar_url?: string | null } | null;
  }> = [];
  let privateNotes: Array<{
    id: string;
    note: string;
    created_at: string;
    updated_at: string | null;
  }> = [];
  let userClubs: Array<{ id: string; name: string }> = [];
  let watchProviders: {
    link: string;
    flatrate?: Array<{ provider_id: number; provider_name: string; logo_path: string | null }>;
    rent?: Array<{ provider_id: number; provider_name: string; logo_path: string | null }>;
    buy?: Array<{ provider_id: number; provider_name: string; logo_path: string | null }>;
  } | null = null;
  let isWatched = false;
  let watchCount = 1;
  let userRating: number | null = null;
  let festivalHistory: Awaited<ReturnType<typeof getMovieFestivalHistory>>["data"] = [];
  let existingFavoriteId: string | null = null;
  let dismissedHints: Record<string, boolean> = {};

  let showWatchProviders = true;

  // PARALLEL FETCH: Profile, notes, watch status, rating, memberships, history, and movie prefs
  if (user) {
    const [
      profileResult,
      notesResult,
      watchResult,
      ratingResult,
      membershipsResult,
      historyResult,
      favoriteResult,
    ] = await Promise.all([
      supabase
        .from("users")
        .select("show_watch_providers, dismissed_hints")
        .eq("id", user.id)
        .maybeSingle(),
      supabase
        .from("private_notes")
        .select("id, note, created_at, updated_at")
        .eq("tmdb_id", finalTmdbId)
        .eq("user_id", user.id)
        .order("created_at", { ascending: false }),
      supabase
        .from("watch_history")
        .select("id, watch_count")
        .eq("user_id", user.id)
        .eq("tmdb_id", finalTmdbId)
        .maybeSingle(),
      supabase
        .from("generic_ratings")
        .select("rating")
        .eq("user_id", user.id)
        .eq("tmdb_id", finalTmdbId)
        .maybeSingle(),
      supabase.from("club_members").select("club_id").eq("user_id", user.id),
      getMovieFestivalHistory(finalTmdbId),
      supabase
        .from("user_favorites")
        .select("id")
        .eq("user_id", user.id)
        .eq("tmdb_id", finalTmdbId)
        .eq("item_type", "movie")
        .maybeSingle(),
    ]);

    // Process profile data
    showWatchProviders = profileResult.data?.show_watch_providers ?? true;
    dismissedHints = (profileResult.data?.dismissed_hints as Record<string, boolean>) || {};

    // Process notes, watch status, rating, favorites
    privateNotes = notesResult.data || [];
    isWatched = !!watchResult.data;
    watchCount = watchResult.data?.watch_count || 1;
    userRating = ratingResult.data?.rating ?? null;
    existingFavoriteId = favoriteResult.data?.id ?? null;

    // Process memberships and history
    const clubIds = membershipsResult.data?.map((m: { club_id: string }) => m.club_id) || [];
    festivalHistory = historyResult.data;

    // PARALLEL FETCH: Clubs and discussions (if user has clubs)
    if (clubIds.length > 0) {
      const [clubsResult, taggedThreadsResult, legacyThreadsResult] = await Promise.all([
        supabase.from("clubs").select("id, name").in("id", clubIds).eq("archived", false),
        supabase
          .from("discussion_thread_tags")
          .select(
            `
          thread:thread_id(
            id, title, slug, comment_count, club_id, created_at,
            author:author_id(display_name, avatar_url)
          )
        `
          )
          .eq("tag_type", "movie")
          .eq("tmdb_id", finalTmdbId),
        supabase
          .from("discussion_threads")
          .select(
            "id, title, slug, comment_count, club_id, created_at, author:author_id(display_name, avatar_url)"
          )
          .eq("tmdb_id", finalTmdbId)
          .in("club_id", clubIds),
      ]);

      userClubs = (clubsResult.data || []).map((c: { id: string; name: string }) => ({
        id: c.id,
        name: c.name,
      }));

      // Combine thread IDs from both sources
      type ThreadData = {
        id: string;
        title: string;
        slug: string | null;
        comment_count: number;
        club_id: string;
        created_at: string;
        author: { display_name: string; avatar_url: string | null } | null;
      };
      type TaggedThread = { thread: ThreadData | null };
      const typedTaggedThreads = (taggedThreadsResult.data || []) as unknown as TaggedThread[];

      // Collect all unique threads
      const threadMap = new Map<string, ThreadData>();

      for (const t of typedTaggedThreads) {
        if (t.thread && clubIds.includes(t.thread.club_id)) {
          threadMap.set(t.thread.id, t.thread);
        }
      }

      for (const t of legacyThreadsResult.data || []) {
        if (!threadMap.has(t.id)) {
          const authorData = Array.isArray(t.author) ? t.author[0] : t.author;
          threadMap.set(t.id, {
            id: t.id,
            title: t.title,
            slug: t.slug,
            comment_count: t.comment_count,
            club_id: t.club_id,
            created_at: t.created_at,
            author: authorData || null,
          });
        }
      }

      // Get club info for threads
      const threadClubIds = [...new Set([...threadMap.values()].map((t) => t.club_id))];
      if (threadClubIds.length > 0) {
        const { data: clubsData } = await supabase
          .from("clubs")
          .select(
            "id, name, slug, picture_url, settings, avatar_icon, avatar_color_index, avatar_border_color_index"
          )
          .in("id", threadClubIds);
        const clubsMap = new Map(clubsData?.map((c) => [c.id, c]) || []);
        discussions = [...threadMap.values()].map((t) => {
          const club = clubsMap.get(t.club_id);
          return {
            id: t.id,
            title: t.title,
            slug: t.slug,
            club_id: t.club_id,
            club_name: club?.name || "Unknown Club",
            club_slug: club?.slug || null,
            club_avatar_url: club?.picture_url || null,
            club_avatar_icon: club?.avatar_icon || null,
            club_avatar_color_index: club?.avatar_color_index ?? null,
            club_avatar_border_color_index: club?.avatar_border_color_index ?? null,
            comment_count: t.comment_count || 0,
            created_at: t.created_at,
            author: t.author,
          };
        });
      }
    }
  }

  // PARALLEL FETCH: Watch providers and movie link preferences
  const [providersData, movieLinkPrefs] = await Promise.all([
    getWatchProviders(finalTmdbId).catch(() => null),
    getMovieLinkPreferences(),
  ]);

  if (providersData?.results?.US) {
    watchProviders = providersData.results.US;
  }

  const visibleLinksOrdered = movieLinkPrefs.visibleLinks;

  const movie = tmdbMovie;
  const certification = extractUSCertification(movie.release_dates);

  return (
    <div className="bg-[var(--background)]">
      <MovieJsonLd
        movie={{
          tmdb_id: finalTmdbId,
          slug: dbMovie?.slug ?? null,
          title: movie.title,
          year: movie.release_date ? Number(movie.release_date.slice(0, 4)) : null,
          director: movie.credits?.crew?.find((c) => c.job === "Director")?.name ?? null,
          poster_url: posterUrl,
          overview: movie.overview ?? null,
          cast: movie.credits?.cast?.slice(0, 10).map((c) => c.name) ?? null,
          genres: movie.genres?.map((g) => g.name) ?? null,
        }}
      />
      {/* Hero Section - Compact */}
      <div className="relative w-full h-[250px] lg:h-[350px] overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-t from-[var(--background)] via-[var(--background)]/60 to-[var(--background)]/10 z-10" />
        <div className="absolute inset-0 bg-gradient-to-b from-[var(--background)]/40 to-transparent z-10" />
        {(backdropUrl || posterUrl) && (
          <Image
            src={(backdropUrl || posterUrl)!}
            alt={movie.title}
            fill
            sizes="100vw"
            className="object-cover"
            priority
            {...(backdropBlur || posterBlur
              ? { placeholder: "blur" as const, blurDataURL: (backdropBlur || posterBlur)! }
              : {})}
          />
        )}
        <div className="absolute inset-0 flex items-end z-20 pb-6">
          <div className="max-w-3xl mx-auto w-full px-4 lg:px-6">
            <div className="flex gap-4 lg:gap-6 items-end">
              {posterUrl && (
                <div className="relative w-[120px] lg:w-[160px] aspect-[2/3] rounded-lg overflow-hidden shadow-xl border border-white/10 flex-shrink-0">
                  <Image
                    src={posterUrl}
                    alt={movie.title}
                    fill
                    sizes="(min-width: 1024px) 160px, 120px"
                    className="object-cover"
                    priority
                    {...(posterBlur
                      ? { placeholder: "blur" as const, blurDataURL: posterBlur }
                      : {})}
                  />
                </div>
              )}
              <div className="flex-1 min-w-0 flex flex-col justify-between gap-1">
                <h1
                  className="text-base lg:text-lg font-bold text-[var(--text-primary)] leading-tight min-w-0 line-clamp-3"
                  style={{
                    textShadow:
                      "0 0 6px var(--background), 0 0 12px var(--background), 0 1px 2px rgba(0,0,0,0.35)",
                  }}
                >
                  {movie.title}
                </h1>
                <div
                  className="flex flex-wrap items-center gap-2 text-sm text-[var(--text-muted)]"
                  style={{
                    textShadow:
                      "0 0 6px var(--background), 0 0 12px var(--background), 0 1px 2px rgba(0,0,0,0.35)",
                  }}
                >
                  {movie.release_date && <span>{new Date(movie.release_date).getFullYear()}</span>}
                  {certification && (
                    <Badge variant="outline" className="text-xs px-1.5 py-0">
                      {certification}
                    </Badge>
                  )}
                  {movie.runtime && (
                    <span className="flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5" weight="bold" />
                      {Math.floor(movie.runtime / 60)}h {movie.runtime % 60}m
                    </span>
                  )}
                </div>
                {/* External Links - Logo buttons (rendered in user's preferred order) */}
                <div className="flex items-center justify-between">
                  {visibleLinksOrdered.length > 0 && (
                    <div className="flex items-center gap-1 flex-nowrap min-w-0">
                      {visibleLinksOrdered.map((linkType) => {
                        if (linkType === "imdb" && movie.external_ids?.imdb_id) {
                          return (
                            <ExternalLink
                              key={linkType}
                              href={`https://www.imdb.com/title/${movie.external_ids.imdb_id}`}
                              logo="imdb"
                              label="View on IMDb"
                            />
                          );
                        }
                        if (linkType === "letterboxd") {
                          return (
                            <ExternalLink
                              key={linkType}
                              href={`https://letterboxd.com/tmdb/${finalTmdbId}`}
                              logo="letterboxd"
                              label="View on Letterboxd"
                            />
                          );
                        }
                        if (linkType === "trakt") {
                          return (
                            <ExternalLink
                              key={linkType}
                              href={`https://trakt.tv/search/tmdb/${finalTmdbId}?id_type=movie`}
                              logo="trakt"
                              label="View on Trakt"
                            />
                          );
                        }
                        if (linkType === "tmdb") {
                          return (
                            <ExternalLink
                              key={linkType}
                              href={`https://www.themoviedb.org/movie/${finalTmdbId}`}
                              logo="tmdb"
                              label="View on TMDB"
                            />
                          );
                        }
                        if (linkType === "wikipedia") {
                          return movie.external_ids?.wikidata_id ? (
                            <ExternalLink
                              key={linkType}
                              href={`https://www.wikidata.org/wiki/Special:GoToLinkedPage/enwiki/${movie.external_ids.wikidata_id}`}
                              logo="wikipedia"
                              label="View on Wikipedia"
                            />
                          ) : (
                            <ExternalLink
                              key={linkType}
                              href={`https://en.wikipedia.org/wiki/Special:Search?search=${encodeURIComponent(movie.title + (movie.release_date ? ` (${new Date(movie.release_date).getFullYear()} film)` : " (film)"))}`}
                              logo="wikipedia"
                              label="Search on Wikipedia"
                            />
                          );
                        }
                        return null;
                      })}
                    </div>
                  )}
                  {user && (
                    <div className="ml-auto">
                      <FavoriteButton
                        tmdbId={finalTmdbId}
                        itemType="movie"
                        title={movie.title}
                        imagePath={movie.poster_path}
                        subtitle={
                          movie.release_date
                            ? new Date(movie.release_date).getFullYear().toString()
                            : null
                        }
                        existingFavoriteId={existingFavoriteId}
                      />
                    </div>
                  )}
                </div>
                <CustomizeHint
                  hintKey="movie-links-customize-hint"
                  initialDismissed={!!dismissedHints["movie-links-customize-hint"]}
                  href="/profile/settings/display"
                  linkText="customize which links appear here"
                />
                {/* Action Cards - aligned with bottom of poster */}
                <MovieActions
                  tmdbId={finalTmdbId}
                  movieTitle={movie.title}
                  year={movie.release_date ? new Date(movie.release_date).getFullYear() : undefined}
                  posterPath={movie.poster_path}
                  isWatched={isWatched}
                  watchCount={watchCount}
                  userRating={userRating}
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-3xl mx-auto px-4 lg:px-6 py-6">
        <div className="space-y-6">
          {/* Private Notes */}
          <section id="private-notes" className="scroll-mt-4">
            <PrivateNoteEditor tmdbId={finalTmdbId} initialNotes={privateNotes} showHeader />
          </section>

          {/* Club Discussions */}
          <section>
            <ClubDiscussionNotes
              tmdbId={finalTmdbId}
              discussions={discussions}
              userClubs={userClubs}
              currentUserId={user?.id}
            />
          </section>

          {/* Overview */}
          <section>
            <h2 className="text-sm font-semibold text-[var(--text-primary)] uppercase tracking-wide mb-3">
              Overview
            </h2>
            {movie.genres && movie.genres.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mb-3">
                {movie.genres.slice(0, 3).map((g: { id: number; name: string }) => {
                  const color = getGenreColor(g.name);
                  return (
                    <Badge
                      key={g.id}
                      variant="outline"
                      className="text-xs"
                      style={{
                        backgroundColor: color.bg,
                        color: color.text,
                        borderColor: color.border,
                      }}
                    >
                      {g.name}
                    </Badge>
                  );
                })}
              </div>
            )}
            <CollapsibleText text={movie.overview} />
          </section>

          {/* Cast & Crew */}
          {((movie.credits?.cast?.length ?? 0) > 0 || (movie.credits?.crew?.length ?? 0) > 0) && (
            <CastCarousel
              cast={movie.credits?.cast || []}
              directors={
                movie.credits?.crew?.filter((c: { job: string }) => c.job === "Director") || []
              }
              writers={
                movie.credits?.crew?.filter((c: { job: string }) => c.job === "Writer") || []
              }
              screenplayWriters={
                movie.credits?.crew?.filter((c: { job: string }) => c.job === "Screenplay") || []
              }
              composers={
                movie.credits?.crew?.filter(
                  (c: { job: string }) => c.job === "Original Music Composer" || c.job === "Music"
                ) || []
              }
              cinematographers={
                movie.credits?.crew?.filter(
                  (c: { job: string }) => c.job === "Director of Photography"
                ) || []
              }
              editors={
                movie.credits?.crew?.filter((c: { job: string }) => c.job === "Editor") || []
              }
              productionDesigners={
                movie.credits?.crew?.filter(
                  (c: { job: string }) => c.job === "Production Design"
                ) || []
              }
              costumeDesigners={
                movie.credits?.crew?.filter((c: { job: string }) => c.job === "Costume Design") ||
                []
              }
            />
          )}

          {/* Details */}
          <div className="space-y-3">
            <h3 className="text-sm font-semibold text-[var(--text-primary)] uppercase tracking-wide">
              Details
            </h3>

            {movie.production_companies && movie.production_companies.length > 0 && (
              <div className="flex justify-between">
                <span className="text-xs text-[var(--text-muted)]">Studio</span>
                <span className="text-xs font-medium">{movie.production_companies[0].name}</span>
              </div>
            )}

            <div className="h-px bg-[var(--border)]" />

            <div className="flex justify-between">
              <span className="text-xs text-[var(--text-muted)]">Status</span>
              <span className="text-xs font-medium">{movie.status || "Released"}</span>
            </div>

            {(movie.budget ?? 0) > 0 && (
              <>
                <div className="h-px bg-[var(--border)]" />
                <div className="flex justify-between">
                  <span className="text-xs text-[var(--text-muted)]">Budget</span>
                  <span className="text-xs font-medium">
                    ${((movie.budget ?? 0) / 1000000).toFixed(0)}M
                  </span>
                </div>
              </>
            )}

            {(movie.revenue ?? 0) > 0 && (
              <>
                <div className="h-px bg-[var(--border)]" />
                <div className="flex justify-between">
                  <span className="text-xs text-[var(--text-muted)]">Revenue</span>
                  <span className="text-xs font-medium">
                    ${((movie.revenue ?? 0) / 1000000).toFixed(0)}M
                  </span>
                </div>
              </>
            )}
          </div>

          {/* Festival History */}
          {user && festivalHistory.length > 0 && (
            <section>
              <MovieFestivalHistory
                tmdbId={finalTmdbId}
                movieTitle={movie.title}
                results={festivalHistory}
              />
            </section>
          )}

          {/* Watch Providers */}
          {watchProviders && (
            <WatchProviders
              providers={watchProviders}
              justWatchUrl={watchProviders.link || null}
              isVisible={showWatchProviders}
            />
          )}
        </div>
      </div>
    </div>
  );
}
