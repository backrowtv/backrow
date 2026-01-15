"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/shared/EmptyState";
import { MovieCarousel, type CarouselMovie } from "../display/MovieCarousel";
import { MovieGridModal } from "../modals/MovieGridModal";
import {
  FilmReel,
  ClockCounterClockwise,
  Plus,
  Popcorn,
  ChatCircleText,
  X,
  CaretLeft,
  CaretRight,
} from "@phosphor-icons/react";
import { useDragScroll } from "@/lib/hooks/useDragScroll";
import type { EndlessMovie } from "@/app/actions/endless-festival";

// Map of tmdb_id to discussion thread slug/id for direct linking
export interface DiscussionThreadMap {
  [tmdbId: number]: { id: string; slug: string | null };
}

interface EndlessFestivalViewProps {
  clubId: string;
  clubSlug: string;
  clubName: string;
  festivalId: string | null;
  festivalName: string | null;
  nowPlaying: EndlessMovie[];
  queue: EndlessMovie[];
  recentlyPlayed: EndlessMovie[];
  isAdmin: boolean;
  isMember: boolean;
  currentUserId: string;
  festivalType?: "standard" | "endless";
  discussionThreads?: DiscussionThreadMap;
  onAddMovie?: () => void;
  onAdvanceQueue?: (nominationId: string) => void;
  onCancelMovie?: (nominationId: string) => void;
  onMarkWatched?: (nominationId: string) => void;
  onRate?: (nominationId: string) => void;
  onHideFromRecentlyWatched?: (nominationId: string) => void;
  /** Hide Recently Played section on desktop (shown in sidebar instead) */
  hideRecentlyPlayedOnDesktop?: boolean;
  onActiveIndexChange?: (index: number) => void;
  detailsUrl?: string;
}

// ============================================
// HELPER: Convert EndlessMovie to CarouselMovie
// ============================================

// Extended type for movies with watch/rate state from wrapper
interface EnhancedEndlessMovie extends EndlessMovie {
  isWatched?: boolean;
  isRated?: boolean;
  userRating?: number;
}

function toCarouselMovie(movie: EnhancedEndlessMovie): CarouselMovie {
  return {
    id: movie.id,
    tmdb_id: movie.tmdb_id,
    slug: movie.slug,
    title: movie.title,
    year: movie.year,
    poster_url: movie.poster_url,
    curator_note: movie.curator_note,
    runtime: movie.runtime,
    director: movie.director,
    genres: movie.genres,
    certification: movie.certification,
    nominator: movie.nominator,
    display_slot: movie.display_slot,
    // Watch/rating status from wrapper
    isWatched: movie.isWatched ?? false,
    isRated: movie.isRated ?? false,
    userRating: movie.userRating,
  };
}

// ============================================
// EMPTY STATE
// ============================================

function NoMoviePlayingCard({
  isAdmin,
  onAddMovie,
}: {
  isAdmin: boolean;
  onAddMovie?: () => void;
}) {
  return (
    <EmptyState
      icon={Popcorn}
      title="No movie playing"
      message={
        isAdmin
          ? "Add a movie to start the endless festival."
          : "Check back soon for the next movie!"
      }
      variant="card"
      action={
        isAdmin && onAddMovie ? (
          <Button onClick={onAddMovie} variant="club-accent">
            <Plus className="w-4 h-4 mr-2" />
            Add Movie
          </Button>
        ) : undefined
      }
    />
  );
}

// ============================================
// MOVIE HISTORY SECTION - Horizontal Scrolling Carousel
// ============================================

function MovieHistory({
  movies,
  clubSlug,
  isAdmin,
  discussionThreads,
  onHide,
}: {
  movies: EndlessMovie[];
  clubSlug: string;
  isAdmin: boolean;
  discussionThreads?: DiscussionThreadMap;
  onHide?: (nominationId: string) => void;
}) {
  const scrollRef = useDragScroll<HTMLDivElement>();
  const containerRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

  const checkScrollButtons = useCallback(() => {
    const container = containerRef.current;
    if (!container) return;

    setCanScrollLeft(container.scrollLeft > 0);
    setCanScrollRight(container.scrollLeft < container.scrollWidth - container.clientWidth - 10);
  }, []);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    checkScrollButtons();
    container.addEventListener("scroll", checkScrollButtons);
    window.addEventListener("resize", checkScrollButtons);

    return () => {
      container.removeEventListener("scroll", checkScrollButtons);
      window.removeEventListener("resize", checkScrollButtons);
    };
  }, [checkScrollButtons, movies]);

  const scroll = (direction: "left" | "right") => {
    const container = containerRef.current;
    if (!container) return;

    const scrollAmount = container.clientWidth * 0.75;
    container.scrollBy({
      left: direction === "left" ? -scrollAmount : scrollAmount,
      behavior: "smooth",
    });
  };

  if (movies.length === 0) return null;

  const handleHide = (e: React.MouseEvent, movieId: string) => {
    e.preventDefault();
    e.stopPropagation();
    if (onHide) {
      onHide(movieId);
    }
  };

  // Get discussion thread link for a movie
  const getDiscussionLink = (tmdbId: number) => {
    const thread = discussionThreads?.[tmdbId];
    if (thread) {
      // Link directly to the thread using slug or id
      return `/club/${clubSlug}/discuss/${thread.slug || thread.id}`;
    }
    // Fallback to query param which will redirect
    return `/club/${clubSlug}/discuss?movie=${tmdbId}`;
  };

  return (
    <div className="space-y-3">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h3
          className="text-sm font-semibold flex items-center gap-2"
          style={{ color: "var(--text-primary)" }}
        >
          <ClockCounterClockwise className="w-4 h-4" style={{ color: "var(--text-muted)" }} />
          Recently Played
        </h3>
        <span className="text-xs" style={{ color: "var(--text-muted)" }}>
          {movies.length} {movies.length === 1 ? "movie" : "movies"}
        </span>
      </div>

      {/* Carousel with overlay arrows */}
      <div className="relative group/carousel">
        {/* Left Arrow */}
        {canScrollLeft && (
          <button
            onClick={() => scroll("left")}
            className="absolute left-0 top-1/2 -translate-y-1/2 z-10 p-1.5 rounded-full bg-black/70 backdrop-blur-sm text-white opacity-0 group-hover/carousel:opacity-100 transition-opacity duration-200 hover:bg-black/90 hover:scale-110"
            aria-label="Scroll left"
          >
            <CaretLeft className="w-4 h-4" weight="bold" />
          </button>
        )}

        {/* Right Arrow */}
        {canScrollRight && (
          <button
            onClick={() => scroll("right")}
            className="absolute right-0 top-1/2 -translate-y-1/2 z-10 p-1.5 rounded-full bg-black/70 backdrop-blur-sm text-white opacity-0 group-hover/carousel:opacity-100 transition-opacity duration-200 hover:bg-black/90 hover:scale-110"
            aria-label="Scroll right"
          >
            <CaretRight className="w-4 h-4" weight="bold" />
          </button>
        )}

        {/* Scrollable container */}
        <div
          ref={(el) => {
            containerRef.current = el;
            if (scrollRef && typeof scrollRef === "object" && "current" in scrollRef) {
              (scrollRef as React.MutableRefObject<HTMLDivElement | null>).current = el;
            }
          }}
          className="flex gap-3 overflow-x-auto overflow-y-visible pb-2 scrollbar-hide -mx-4 px-4 overscroll-x-contain"
          data-swipe-ignore
        >
          {movies.map((movie) => (
            <div key={movie.id} className="flex-shrink-0 group relative">
              <Link href={`/movies/${movie.tmdb_id}`} className="block">
                <div className="relative w-20 md:w-24 aspect-[2/3] overflow-hidden rounded-md bg-[var(--surface-1)]">
                  {movie.poster_url ? (
                    <Image
                      src={movie.poster_url}
                      alt={movie.title}
                      fill
                      className="object-cover transition-transform duration-300 group-hover:scale-105"
                      sizes="(max-width: 768px) 80px, 96px"
                    />
                  ) : (
                    <div className="flex h-full w-full flex-col items-center justify-center p-1 text-center border border-dashed border-[var(--border)] bg-[var(--surface-1)]">
                      <FilmReel className="w-6 h-6" style={{ color: "var(--text-muted)" }} />
                    </div>
                  )}

                  {/* Gradient overlay on hover */}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />

                  {/* Movie info on hover */}
                  <div className="absolute bottom-0 left-0 right-0 p-1.5 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                    <p className="font-semibold text-white line-clamp-2 text-[10px] leading-tight">
                      {movie.title}
                    </p>
                    {movie.year && <p className="text-white/90 text-[9px] mt-0.5">{movie.year}</p>}
                  </div>

                  {/* Admin hide button - appears on hover */}
                  {isAdmin && onHide && (
                    <button
                      onClick={(e) => handleHide(e, movie.id)}
                      className="absolute top-1 right-1 p-1 rounded-full bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity hover:bg-black/80 z-10"
                      title="Hide from Recently Played"
                    >
                      <X className="w-3 h-3 text-white" />
                    </button>
                  )}
                </div>
              </Link>

              {/* Discussion button - always visible, more prominent */}
              <Link
                href={getDiscussionLink(movie.tmdb_id)}
                className="absolute -bottom-1 -right-1 p-1.5 rounded-full bg-[var(--primary)] hover:bg-[var(--primary-hover)] shadow-md transition-all hover:scale-110 z-10"
                onClick={(e) => e.stopPropagation()}
                title="View Discussion"
              >
                <ChatCircleText className="w-3.5 h-3.5 text-white" weight="fill" />
              </Link>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ============================================
// MAIN VIEW COMPONENT
// ============================================

export function EndlessFestivalView({
  clubSlug,
  festivalName,
  nowPlaying,
  recentlyPlayed,
  isAdmin,
  discussionThreads,
  onAddMovie,
  onAdvanceQueue,
  onCancelMovie,
  onMarkWatched,
  onRate,
  onHideFromRecentlyWatched,
  hideRecentlyPlayedOnDesktop = false,
  onActiveIndexChange,
  detailsUrl,
}: EndlessFestivalViewProps) {
  const [gridModalOpen, setGridModalOpen] = useState(false);

  // Convert EndlessMovie[] to CarouselMovie[]
  const carouselMovies = nowPlaying.map(toCarouselMovie);

  // Display name (custom or default "Now Showing", null = hidden by setting)
  const displayName = festivalName === null ? null : festivalName || "Now Showing";

  // Handle conclude movie (move to recently played)
  const handleConcludeMovie = (movieId: string) => {
    if (onAdvanceQueue) {
      onAdvanceQueue(movieId);
    }
  };

  // Handle mark watched
  const handleMarkWatched = (movieId: string) => {
    if (onMarkWatched) {
      onMarkWatched(movieId);
    }
  };

  // Handle rate
  const handleRate = (movieId: string) => {
    if (onRate) {
      onRate(movieId);
    }
  };

  return (
    <div className="space-y-6">
      {/* Festival Title */}
      {displayName && (
        <h2
          className="text-lg font-semibold text-center"
          style={{ color: "var(--club-accent, var(--text-primary))" }}
        >
          {displayName}
        </h2>
      )}

      {/* Now Showing Section - Carousel or Empty State */}
      {nowPlaying.length === 0 ? (
        <NoMoviePlayingCard isAdmin={isAdmin} onAddMovie={onAddMovie} />
      ) : (
        <MovieCarousel
          movies={carouselMovies}
          context="endless"
          clubSlug={clubSlug}
          isAdmin={isAdmin}
          onAddMovie={onAddMovie}
          onConcludeMovie={handleConcludeMovie}
          onCancelMovie={onCancelMovie}
          onMarkWatched={handleMarkWatched}
          onRate={handleRate}
          showGuessNominator={false}
          showRating={true}
          onActiveIndexChange={onActiveIndexChange}
          detailsUrl={detailsUrl}
        />
      )}

      {/* Recently Played - Hidden when shown separately in sidebar/mobile sections */}
      {!hideRecentlyPlayedOnDesktop && (
        <MovieHistory
          movies={recentlyPlayed}
          clubSlug={clubSlug}
          isAdmin={isAdmin}
          discussionThreads={discussionThreads}
          onHide={onHideFromRecentlyWatched}
        />
      )}

      {/* Grid Modal */}
      <MovieGridModal
        open={gridModalOpen}
        onOpenChange={setGridModalOpen}
        movies={carouselMovies}
        context="endless"
        onMarkWatched={handleMarkWatched}
        onRate={handleRate}
        showGuessNominator={false}
        showRating={true}
      />
    </div>
  );
}
