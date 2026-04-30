"use client";

import { useState, useCallback, useEffect, useRef, memo } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import {
  Check,
  Star,
  Trophy,
  Users,
  SquaresFour,
  Slideshow,
  FilmReel,
  CaretLeft,
  CaretRight,
  Plus,
  CheckCircle,
  XCircle,
} from "@phosphor-icons/react";
import { RatingDisplay } from "@/components/ratings/RatingDisplay";
import { cn } from "@/lib/utils";
import { isBackRowFeaturedClub } from "@/lib/clubs/backrow-featured";
import { CAROUSEL_CONFIG } from "@/lib/constants/ui";
import { getTMDBBlurDataURL } from "@/lib/utils/blur-placeholder";
import { CarouselErrorBoundary } from "@/components/ui/carousel-error-boundary";
import { EmptyState } from "@/components/shared/EmptyState";

// ============================================
// TYPES
// ============================================

export interface CarouselMovie {
  id: string;
  tmdb_id?: number | null;
  slug?: string | null;
  title: string;
  year: number | null;
  poster_url: string | null;
  curator_note?: string | null;
  runtime: number | null;
  director: string | null;
  genres: string[] | null;
  certification?: string | null;
  nominator?: {
    id: string;
    display_name: string;
    avatar_url: string | null;
  } | null;
  display_slot?: "featured" | "throwback" | null;
  isWatched?: boolean;
  isRated?: boolean;
  userRating?: number;
}

export type CarouselContext = "endless" | "regular";
export type ViewMode = "carousel" | "grid";

interface MovieCarouselProps {
  movies: CarouselMovie[];
  context: CarouselContext;
  clubSlug: string;
  onAddMovie?: () => void;
  onConcludeMovie?: (movieId: string) => void;
  onCancelMovie?: (movieId: string) => void;
  onPrevPhase?: () => void;
  onNextPhase?: () => void;
  onMarkWatched?: (movieId: string) => void;
  onRate?: (movieId: string) => void;
  onGuessNominator?: (movieId: string) => void;
  showGuessNominator?: boolean;
  showRating?: boolean;
  isAdmin?: boolean;
  canGoPrev?: boolean;
  canGoNext?: boolean;
  defaultViewMode?: ViewMode;
  showViewModeToggle?: boolean;
  storageKey?: string;
  detailsUrl?: string;
  /** Current user's ID — used to detect own nominations and adjust the rate affordance accordingly */
  currentUserId?: string | null;
  onActiveIndexChange?: (index: number) => void;
}

// ============================================
// POSTER SLIDE COMPONENT
// ============================================

interface PosterSlideProps {
  movie: CarouselMovie;
  isActive: boolean;
  onClick?: () => void;
  posterWidth: number;
}

const PosterSlide = memo(function PosterSlide({
  movie,
  isActive,
  onClick,
  posterWidth,
}: PosterSlideProps) {
  return (
    <div
      className={cn(
        "cursor-pointer focus:outline-none rounded-lg transition-[transform,opacity] duration-300",
        isActive ? "scale-100 opacity-100" : "scale-[0.82] opacity-60"
      )}
      onClick={onClick}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onClick?.();
        }
      }}
      role="button"
      tabIndex={0}
      aria-label={`View ${movie.title}${movie.year ? ` (${movie.year})` : ""}`}
    >
      <div
        className="relative rounded-lg overflow-hidden"
        style={{
          width: `${posterWidth}px`,
          aspectRatio: "2/3",
          backgroundColor: "var(--surface-2)",
        }}
      >
        {movie.poster_url ? (
          <Image
            src={movie.poster_url}
            alt={movie.title}
            fill
            className="object-cover pointer-events-none"
            sizes={`${posterWidth}px`}
            priority={isActive}
            placeholder="blur"
            blurDataURL={getTMDBBlurDataURL()}
            draggable={false}
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <FilmReel className="w-12 h-12" style={{ color: "var(--text-muted)" }} />
          </div>
        )}
      </div>
    </div>
  );
});

// ============================================
// FEW MOVIES VIEW (1-2 movies)
// ============================================

interface FewMoviesViewProps {
  movies: CarouselMovie[];
  selectedIndex: number;
  onSelectMovie: (index: number) => void;
  onMovieClick?: (movie: CarouselMovie) => void;
  posterWidth: number;
}

const FewMoviesView = memo(function FewMoviesView({
  movies,
  selectedIndex,
  onSelectMovie,
  onMovieClick,
  posterWidth,
}: FewMoviesViewProps) {
  return (
    <div className="flex justify-center items-start gap-4 md:gap-8">
      {movies.map((movie, index) => (
        <PosterSlide
          key={movie.id}
          movie={movie}
          isActive={index === selectedIndex}
          posterWidth={posterWidth}
          onClick={() => {
            if (index === selectedIndex && onMovieClick) {
              onMovieClick(movie);
            } else {
              onSelectMovie(index);
            }
          }}
        />
      ))}
    </div>
  );
});

// ============================================
// GRID VIEW (paginated grid layout)
// ============================================

interface GridViewProps {
  movies: CarouselMovie[];
  selectedIndex: number;
  onSelectMovie: (index: number) => void;
  onMovieClick?: (movie: CarouselMovie) => void;
  isMobile: boolean;
}

const GridView = memo(function GridView({
  movies,
  selectedIndex,
  onSelectMovie,
  onMovieClick,
  isMobile,
}: GridViewProps) {
  const [page, setPage] = useState(0);
  const itemsPerPage = isMobile
    ? CAROUSEL_CONFIG.GRID_ITEMS_MOBILE
    : CAROUSEL_CONFIG.GRID_ITEMS_DESKTOP;
  const totalPages = Math.ceil(movies.length / itemsPerPage);
  const startIndex = page * itemsPerPage;
  const visibleMovies = movies.slice(startIndex, startIndex + itemsPerPage);

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-5 grid-rows-2 gap-2">
        {visibleMovies.map((movie, visibleIndex) => {
          const actualIndex = startIndex + visibleIndex;
          const isSelected = actualIndex === selectedIndex;
          return (
            <div
              key={movie.id}
              className="cursor-pointer focus:outline-none focus:ring-2 focus:ring-[var(--primary)] rounded-lg w-full"
              onClick={() => {
                if (isSelected && onMovieClick) {
                  onMovieClick(movie);
                } else {
                  onSelectMovie(actualIndex);
                }
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  if (isSelected && onMovieClick) {
                    onMovieClick(movie);
                  } else {
                    onSelectMovie(actualIndex);
                  }
                }
              }}
              role="button"
              tabIndex={0}
              aria-label={`${isSelected ? "View" : "Select"} ${movie.title}${movie.year ? ` (${movie.year})` : ""}`}
            >
              <div
                className={cn(
                  "relative aspect-[2/3] rounded-lg overflow-hidden shadow-md transition-transform",
                  isSelected ? "ring-2 ring-white/70" : "hover:scale-105"
                )}
              >
                {movie.poster_url ? (
                  <Image
                    src={movie.poster_url}
                    alt={movie.title}
                    fill
                    className="object-cover"
                    sizes="20vw"
                    placeholder="blur"
                    blurDataURL={getTMDBBlurDataURL()}
                  />
                ) : (
                  <div
                    className="w-full h-full flex items-center justify-center"
                    style={{ backgroundColor: "var(--surface-2)" }}
                  >
                    <FilmReel className="w-8 h-8 text-[var(--text-muted)]" />
                  </div>
                )}

                {/* Status badges */}
                {(movie.isWatched || movie.isRated) && (
                  <div className="absolute top-1 right-1 flex flex-col gap-0.5">
                    {movie.isRated && movie.userRating && (
                      <Badge variant="primary" size="sm" className="shadow-lg text-[10px]">
                        <Star className="w-2.5 h-2.5 mr-0.5 fill-current" />
                        <RatingDisplay rating={movie.userRating} showMax />
                      </Badge>
                    )}
                    {movie.isWatched && !movie.isRated && (
                      <Badge variant="secondary" size="sm" className="shadow-lg">
                        <Check className="w-2.5 h-2.5" />
                      </Badge>
                    )}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2">
          <button
            onClick={() => setPage((p) => Math.max(0, p - 1))}
            disabled={page === 0}
            className="p-1.5 rounded-full transition-opacity disabled:opacity-50 focus:outline-none focus:ring-2 focus:ring-[var(--primary)]"
            style={{ color: "var(--text-primary)" }}
            aria-label="Previous page"
          >
            <CaretLeft className="w-5 h-5" weight="bold" />
          </button>
          <span className="text-xs" style={{ color: "var(--text-muted)" }}>
            {page + 1} / {totalPages}
          </span>
          <button
            onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
            disabled={page === totalPages - 1}
            className="p-1.5 rounded-full transition-opacity disabled:opacity-50 focus:outline-none focus:ring-2 focus:ring-[var(--primary)]"
            style={{ color: "var(--text-primary)" }}
            aria-label="Next page"
          >
            <CaretRight className="w-5 h-5" weight="bold" />
          </button>
        </div>
      )}
    </div>
  );
});

// ============================================
// BOTTOM SECTION (title + action buttons)
// ============================================

interface BottomSectionProps {
  movie: CarouselMovie;
  context: CarouselContext;
  clubSlug: string;
  onMarkWatched?: (movieId: string) => void;
  onRate?: (movieId: string) => void;
  onGuessNominator?: (movieId: string) => void;
  showGuessNominator: boolean;
  showRating: boolean;
  detailsUrl?: string;
  currentUserId?: string | null;
}

function BottomSection({
  movie,
  context,
  clubSlug,
  onMarkWatched,
  onRate,
  onGuessNominator,
  showGuessNominator,
  showRating,
  detailsUrl,
  currentUserId,
}: BottomSectionProps) {
  const isStandardFestival = context === "regular";
  const isOwnNomination = !!currentUserId && movie.nominator?.id === currentUserId;
  // Format runtime
  const formatRuntime = (minutes: number | null): string | null => {
    if (!minutes) return null;
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    if (hours === 0) return `${mins}m`;
    if (mins === 0) return `${hours}h`;
    return `${hours}h ${mins}m`;
  };

  return (
    <div className="mt-2 text-center space-y-1.5">
      {/* Movie title - fixed height to prevent button shifting */}
      <div className="h-[56px] flex flex-col justify-start">
        <h3
          className={cn(
            "font-semibold leading-snug",
            // Use smaller text for longer titles to fit in 2 lines
            movie.title.length > 40 ? "text-sm" : movie.title.length > 25 ? "text-base" : "text-lg"
          )}
          style={{ color: "var(--text-primary)" }}
        >
          {movie.title}
          {/* Display slot badge - inline with title */}
          {isBackRowFeaturedClub(clubSlug) && movie.display_slot && (
            <Badge
              variant={movie.display_slot === "featured" ? "primary" : "secondary"}
              size="sm"
              className="gap-1 ml-1.5 align-middle"
            >
              {movie.display_slot === "featured" ? "New Release" : "Throwback"}
            </Badge>
          )}
        </h3>
        <p className="text-xs mt-0.5" style={{ color: "var(--text-muted)" }}>
          {[movie.certification, movie.year, formatRuntime(movie.runtime), movie.genres?.[0]]
            .filter(Boolean)
            .join(" • ")}
        </p>
      </div>

      {/* Curator / Nominator note - only render if exists */}
      {movie.curator_note && movie.curator_note !== "No guess" && (
        <p
          className="text-sm max-w-md mx-auto line-clamp-2"
          style={{ color: "var(--text-secondary)" }}
        >
          {context === "regular" && movie.nominator && (
            <span className="italic text-xs" style={{ color: "var(--text-muted)" }}>
              Nominator&apos;s Note:{" "}
            </span>
          )}
          {movie.curator_note}
        </p>
      )}

      {/* Action buttons - fixed width container to prevent shifting */}
      <div className="flex items-center justify-center gap-2">
        {/* Guess button (regular festivals only) */}
        {context === "regular" && showGuessNominator && onGuessNominator && (
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="outline" size="sm" onClick={() => onGuessNominator(movie.id)}>
                  <Users className="w-4 h-4 mr-1.5" />
                  Guess
                </Button>
              </TooltipTrigger>
              <TooltipContent>Guess who nominated this movie</TooltipContent>
            </Tooltip>
          </TooltipProvider>
        )}

        {/* Mark Watched button - icon stays fixed, text changes */}
        {onMarkWatched && (
          <Button
            variant="outline"
            size="sm"
            className={cn(
              "w-[112px] gap-1.5",
              movie.isWatched && "bg-[var(--info)] text-white border-[var(--info)]"
            )}
            onClick={() => onMarkWatched(movie.id)}
          >
            {movie.isWatched ? (
              <Check className="w-4 h-4 flex-shrink-0" weight="bold" />
            ) : (
              <Plus className="w-4 h-4 flex-shrink-0" />
            )}
            <span>{movie.isWatched ? "Watched" : "Watch"}</span>
          </Button>
        )}

        {/* Rate affordance — three states:
            1. Standard festival + user's own nomination → "Your Pick" badge (no rate UI; you can't rate yourself)
            2. Standard festival → Trophy + amber/gold (this rating counts toward standings)
            3. Endless festival → Star + default style (personal rating, no competition) */}
        {showRating && isStandardFestival && isOwnNomination ? (
          <Button
            variant="outline"
            size="sm"
            disabled
            className="w-[112px] gap-1.5 !border-[var(--warning)] !text-[var(--warning)] disabled:opacity-100 cursor-default"
          >
            <Trophy className="w-3.5 h-3.5 flex-shrink-0" weight="fill" />
            <span>Your Pick</span>
          </Button>
        ) : showRating && onRate ? (
          <Button
            variant={movie.isRated ? "primary" : "outline"}
            size="sm"
            className={cn(
              "w-[112px] gap-0 px-0 relative overflow-hidden",
              isStandardFestival &&
                !movie.isRated &&
                "!border-[var(--warning)] !text-[var(--warning)] hover:!bg-[var(--warning)]/10",
              isStandardFestival &&
                movie.isRated &&
                "!bg-[var(--warning)] !border-[var(--warning)] !text-white"
            )}
            onClick={() => onRate(movie.id)}
          >
            <span
              className="absolute flex items-center justify-center gap-0.5"
              style={{ left: "33.3%", transform: "translateX(-50%)" }}
            >
              {isStandardFestival ? (
                <Trophy className="w-4 h-4" weight={movie.isRated ? "fill" : "regular"} />
              ) : (
                <Star className="w-4 h-4" weight={movie.isRated ? "fill" : "regular"} />
              )}
            </span>
            <span
              className="absolute flex items-center justify-center"
              style={{ left: "66.6%", transform: "translateX(-50%)" }}
            >
              {movie.isRated && movie.userRating ? (
                <span className="text-sm font-semibold tabular-nums">
                  <RatingDisplay rating={movie.userRating} showMax />
                </span>
              ) : (
                "Rate"
              )}
            </span>
            {/* Invisible spacer to maintain button height */}
            <span className="invisible">Rate</span>
          </Button>
        ) : null}
      </div>

      {/* View Festival Details link */}
      {detailsUrl && (
        <Link
          href={detailsUrl}
          className="inline-flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-md transition-colors hover:opacity-80"
          style={{
            color: "var(--text-secondary)",
            backgroundColor: "var(--surface-2)",
          }}
        >
          View Festival Details
        </Link>
      )}
    </div>
  );
}

// ============================================
// MAIN MOVIE CAROUSEL COMPONENT
// ============================================

export function MovieCarousel({
  movies,
  context,
  clubSlug,
  onAddMovie,
  onConcludeMovie,
  onCancelMovie,
  onMarkWatched,
  onRate,
  onGuessNominator,
  showGuessNominator = false,
  showRating = true,
  isAdmin = false,
  defaultViewMode = "carousel",
  showViewModeToggle = true,
  storageKey,
  detailsUrl,
  currentUserId,
  onActiveIndexChange,
}: MovieCarouselProps) {
  const router = useRouter();
  const [activeIndex, setActiveIndex] = useState(0);
  const [isMobile, setIsMobile] = useState(false);
  const [viewMode, setViewMode] = useState<ViewMode>(defaultViewMode);

  // Container measurement for responsive poster sizing
  const carouselContainerRef = useRef<HTMLDivElement>(null);
  const [containerWidth, setContainerWidth] = useState(0);
  const resizeObserverRef = useRef<ResizeObserver | null>(null);

  // Touch/drag tracking for swipe gestures
  const touchStartX = useRef<number | null>(null);
  const touchStartY = useRef<number | null>(null);

  // Callback ref: measure container synchronously on mount to avoid size flash
  const measureRef = useCallback((node: HTMLDivElement | null) => {
    // Clean up previous observer
    if (resizeObserverRef.current) {
      resizeObserverRef.current.disconnect();
      resizeObserverRef.current = null;
    }

    if (!node) return;

    // Synchronous initial measurement — prevents rendering at wrong size
    (carouselContainerRef as React.MutableRefObject<HTMLDivElement | null>).current = node;
    const initialWidth = node.getBoundingClientRect().width;
    if (initialWidth > 0) {
      setContainerWidth(initialWidth);
    }

    // ResizeObserver for ongoing updates (rotation, zoom, resize)
    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        setContainerWidth(entry.contentRect.width);
      }
    });
    observer.observe(node);
    resizeObserverRef.current = observer;
  }, []);

  // Cleanup observer on unmount
  useEffect(() => {
    return () => {
      resizeObserverRef.current?.disconnect();
    };
  }, []);

  // Load saved view mode preference
  useEffect(() => {
    if (storageKey && typeof window !== "undefined") {
      const saved = localStorage.getItem(`carousel-view-${storageKey}`);
      if (saved === "carousel" || saved === "grid") {
        setViewMode(saved);
      }
    }
  }, [storageKey]);

  // Save view mode preference
  useEffect(() => {
    if (storageKey && typeof window !== "undefined") {
      localStorage.setItem(`carousel-view-${storageKey}`, viewMode);
    }
  }, [viewMode, storageKey]);

  // Detect mobile
  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < CAROUSEL_CONFIG.MOBILE_BREAKPOINT);
    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  // Responsive poster width - scales to fit container (handles browser zoom)
  const maxPosterWidth = isMobile
    ? CAROUSEL_CONFIG.MOBILE_POSTER_WIDTH
    : CAROUSEL_CONFIG.DESKTOP_POSTER_WIDTH;
  const posterWidth =
    containerWidth > 0
      ? Math.min(maxPosterWidth, Math.floor(containerWidth * 0.35))
      : maxPosterWidth;

  // Poster height (2:3 aspect ratio)
  const posterHeight = posterWidth * 1.5;

  // Get the currently selected movie
  const selectedMovie = movies[activeIndex] || movies[0];

  // Navigate to movie page
  const handleMovieClick = useCallback(
    (movie: CarouselMovie) => {
      if (movie.slug) {
        router.push(`/movies/${movie.slug}`);
      } else if (movie.tmdb_id) {
        router.push(`/movies/${movie.tmdb_id}`);
      }
    },
    [router]
  );

  // Advance carousel with wrapping
  const goToIndex = useCallback(
    (newIndex: number) => {
      const wrapped = ((newIndex % movies.length) + movies.length) % movies.length;
      setActiveIndex(wrapped);
      onActiveIndexChange?.(wrapped);
    },
    [movies.length, onActiveIndexChange]
  );

  const goNext = useCallback(() => goToIndex(activeIndex + 1), [activeIndex, goToIndex]);
  const goPrev = useCallback(() => goToIndex(activeIndex - 1), [activeIndex, goToIndex]);

  // Unified index setter that also fires the external callback
  const selectIndex = useCallback(
    (index: number) => {
      setActiveIndex(index);
      onActiveIndexChange?.(index);
    },
    [onActiveIndexChange]
  );

  // Handle click on a poster in carousel mode
  const handleSlideClick = useCallback(
    (index: number, movie: CarouselMovie) => {
      if (index === activeIndex) {
        handleMovieClick(movie);
      } else {
        selectIndex(index);
      }
    },
    [activeIndex, handleMovieClick, selectIndex]
  );

  // Touch/swipe handlers
  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
    touchStartY.current = e.touches[0].clientY;
  }, []);

  const handleTouchEnd = useCallback(
    (e: React.TouchEvent) => {
      if (touchStartX.current === null || touchStartY.current === null) return;
      const deltaX = e.changedTouches[0].clientX - touchStartX.current;
      const deltaY = e.changedTouches[0].clientY - touchStartY.current;
      touchStartX.current = null;
      touchStartY.current = null;

      // Only swipe if horizontal movement > vertical and exceeds threshold
      if (Math.abs(deltaX) > Math.abs(deltaY) && Math.abs(deltaX) > 50) {
        if (deltaX < 0) goNext();
        else goPrev();
      }
    },
    [goNext, goPrev]
  );

  // Mouse drag handlers for desktop
  const handlePointerDown = useCallback((e: React.PointerEvent) => {
    // Only track primary button (left click)
    if (e.button !== 0) return;
    touchStartX.current = e.clientX;
    touchStartY.current = e.clientY;
  }, []);

  const handlePointerUp = useCallback(
    (e: React.PointerEvent) => {
      if (touchStartX.current === null || touchStartY.current === null) return;
      const deltaX = e.clientX - touchStartX.current;
      const deltaY = e.clientY - touchStartY.current;
      touchStartX.current = null;
      touchStartY.current = null;

      if (Math.abs(deltaX) > Math.abs(deltaY) && Math.abs(deltaX) > 50) {
        if (deltaX < 0) goNext();
        else goPrev();
      }
    },
    [goNext, goPrev]
  );

  // Calculate circular offset for a given index relative to activeIndex
  const getCircularOffset = useCallback(
    (index: number) => {
      const len = movies.length;
      const rawOffset = index - activeIndex;
      // Find the shortest circular distance
      if (rawOffset > len / 2) return rawOffset - len;
      if (rawOffset < -len / 2) return rawOffset + len;
      return rawOffset;
    },
    [activeIndex, movies.length]
  );

  // Set view mode
  const handleSetViewMode = useCallback((mode: ViewMode) => {
    setViewMode(mode);
  }, []);

  // Empty state
  if (movies.length === 0) {
    return <EmptyState icon={FilmReel} title="No movies yet" variant="inline" />;
  }

  // Spacing between slide centers
  const slideSpacing = posterWidth * 0.85;

  return (
    <CarouselErrorBoundary fallbackMessage="Unable to load movie carousel">
      <div
        ref={measureRef}
        className={cn(
          "transition-opacity duration-150",
          containerWidth > 0 ? "opacity-100" : "opacity-0"
        )}
      >
        {/* Admin toolbar + view mode toggle - shared across all view modes */}
        {(context === "endless" &&
          isAdmin &&
          (onAddMovie || (onConcludeMovie && selectedMovie) || (onCancelMovie && selectedMovie))) ||
        (showViewModeToggle && movies.length > 2) ? (
          <div className="flex items-center justify-between px-2 mb-1">
            {/* Add movie button - left side */}
            <div className="flex items-center gap-1">
              {context === "endless" && isAdmin && onAddMovie && (
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        onClick={onAddMovie}
                        className="bg-[var(--surface-2)] hover:bg-[var(--surface-3)] shadow-sm"
                        aria-label="Add movie to festival"
                      >
                        <Plus className="w-4 h-4" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>Add movie to festival</TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              )}
            </div>

            {/* Conclude + Cancel buttons and view toggle - right side */}
            <div className="flex items-center gap-1">
              {context === "endless" && isAdmin && (
                <>
                  {onConcludeMovie && selectedMovie && (
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon-sm"
                            onClick={() => onConcludeMovie(selectedMovie.id)}
                            className="bg-[var(--surface-2)] hover:bg-[var(--surface-3)] shadow-sm"
                            aria-label={`Conclude ${selectedMovie.title}`}
                          >
                            <CheckCircle className="w-4 h-4" />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>Conclude &quot;{selectedMovie.title}&quot;</TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  )}
                  {onCancelMovie && selectedMovie && (
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon-sm"
                            onClick={() => onCancelMovie(selectedMovie.id)}
                            className="bg-[var(--surface-2)] hover:bg-[var(--surface-3)] shadow-sm"
                            aria-label={`Cancel ${selectedMovie.title}`}
                          >
                            <XCircle className="w-4 h-4" />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>Cancel &quot;{selectedMovie.title}&quot;</TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  )}
                </>
              )}
              {showViewModeToggle && movies.length > 2 && (
                <div className="flex items-center rounded-lg border border-[var(--border)] p-0.5">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleSetViewMode("carousel")}
                    className={cn(
                      "h-7 w-7 p-0 rounded-md",
                      viewMode === "carousel"
                        ? "bg-[var(--surface-2)] text-[var(--text-primary)]"
                        : "text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-transparent"
                    )}
                    aria-label="Carousel view"
                  >
                    <Slideshow className="w-4 h-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleSetViewMode("grid")}
                    className={cn(
                      "h-7 w-7 p-0 rounded-md",
                      viewMode === "grid"
                        ? "bg-[var(--surface-2)] text-[var(--text-primary)]"
                        : "text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-transparent"
                    )}
                    aria-label="Grid view"
                  >
                    <SquaresFour className="w-4 h-4" />
                  </Button>
                </div>
              )}
            </div>
          </div>
        ) : null}

        {/* Carousel/Grid/Few Movies View */}
        {viewMode === "grid" ? (
          <GridView
            movies={movies}
            selectedIndex={activeIndex}
            onSelectMovie={selectIndex}
            onMovieClick={handleMovieClick}
            isMobile={isMobile}
          />
        ) : movies.length <= 2 ? (
          <FewMoviesView
            movies={movies}
            selectedIndex={activeIndex}
            onSelectMovie={selectIndex}
            onMovieClick={handleMovieClick}
            posterWidth={posterWidth}
          />
        ) : (
          /* Transform-based Carousel */
          <div className="movie-carousel relative overflow-hidden">
            {/* Carousel track */}
            <div
              className="relative overflow-hidden cursor-grab active:cursor-grabbing select-none"
              style={{ height: posterHeight + 16, paddingTop: 8, paddingBottom: 8 }}
              onTouchStart={handleTouchStart}
              onTouchEnd={handleTouchEnd}
              onPointerDown={handlePointerDown}
              onPointerUp={handlePointerUp}
            >
              {movies.map((movie, index) => {
                const offset = getCircularOffset(index);

                // Render 1 extra on each side (hidden) so they animate in
                if (Math.abs(offset) > 2) return null;

                const isCenter = offset === 0;
                const isVisible = Math.abs(offset) <= 1;
                const scale = isCenter ? 1 : 0.8;
                const opacity = isVisible ? (isCenter ? 1 : 0.5) : 0;
                const translateX = offset * slideSpacing;
                const zIndex = 10 - Math.abs(offset);

                return (
                  <div
                    key={movie.id}
                    className="absolute left-1/2 top-1/2 transition-all duration-300 ease-out"
                    style={{
                      transform: `translate(-50%, -50%) translateX(${translateX}px) scale(${scale})`,
                      opacity,
                      zIndex,
                    }}
                  >
                    <PosterSlide
                      movie={movie}
                      isActive={isCenter}
                      posterWidth={posterWidth}
                      onClick={() => handleSlideClick(index, movie)}
                    />
                  </div>
                );
              })}
            </div>

            {/* Navigation arrows */}
            <button
              className="absolute left-1 top-1/2 -translate-y-1/2 z-50 rounded-full p-1.5 transition-opacity hover:opacity-80 focus:outline-none focus:ring-2 focus:ring-[var(--primary)]"
              style={{
                backgroundColor: "transparent",
                color: "var(--text-primary)",
              }}
              onClick={goPrev}
              aria-label="Previous movie"
            >
              <CaretLeft className="w-6 h-6" weight="bold" />
            </button>
            <button
              className="absolute right-1 top-1/2 -translate-y-1/2 z-50 rounded-full p-1.5 transition-opacity hover:opacity-80 focus:outline-none focus:ring-2 focus:ring-[var(--primary)]"
              style={{
                backgroundColor: "transparent",
                color: "var(--text-primary)",
              }}
              onClick={goNext}
              aria-label="Next movie"
            >
              <CaretRight className="w-6 h-6" weight="bold" />
            </button>
          </div>
        )}

        {/* Bottom section with title and action buttons */}
        {selectedMovie && (
          <BottomSection
            movie={selectedMovie}
            context={context}
            clubSlug={clubSlug}
            onMarkWatched={onMarkWatched}
            onRate={onRate}
            onGuessNominator={onGuessNominator}
            showGuessNominator={showGuessNominator}
            showRating={showRating}
            detailsUrl={detailsUrl}
            currentUserId={currentUserId}
          />
        )}
      </div>
    </CarouselErrorBoundary>
  );
}
