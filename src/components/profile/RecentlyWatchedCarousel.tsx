"use client";

import Image from "next/image";
import Link from "next/link";
import { Text } from "@/components/ui/typography";
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from "@/components/ui/tooltip";
import { useDragScroll } from "@/lib/hooks/useDragScroll";
import { ScrollNavButton } from "@/components/ui/scroll-nav-button";
import { CaretRight, X } from "@phosphor-icons/react";
import { useRef, useState, useEffect, useCallback } from "react";
import type { WatchedMovie } from "./RecentlyWatched";
import { getTMDBBlurDataURL } from "@/lib/utils/blur-placeholder";

interface RecentlyWatchedCarouselProps {
  movies: WatchedMovie[];
  onRemove?: (tmdbId: number) => void;
}

export function RecentlyWatchedCarousel({ movies, onRemove }: RecentlyWatchedCarouselProps) {
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

    const maxScroll = container.scrollWidth - container.clientWidth;
    const currentScroll = container.scrollLeft;
    let scrollAmount = container.clientWidth * 0.75;

    if (direction === "right") {
      // Don't overshoot the end
      const remainingScroll = maxScroll - currentScroll;
      scrollAmount = Math.min(scrollAmount, remainingScroll);
    } else {
      // Don't overshoot the start
      scrollAmount = Math.min(scrollAmount, currentScroll);
    }

    container.scrollBy({
      left: direction === "left" ? -scrollAmount : scrollAmount,
      behavior: "smooth",
    });
  };

  // Helper to build poster URL
  const getPosterUrl = (posterPath: string | null): string | null => {
    if (!posterPath) return null;
    // Handle both full URLs and TMDB paths
    if (posterPath.startsWith("http")) return posterPath;
    return `https://image.tmdb.org/t/p/w500${posterPath}`;
  };

  return (
    <TooltipProvider>
      <div>
        {/* Header */}
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-bold text-[var(--text-primary)] uppercase tracking-wide">
            Recently Watched
          </h3>
          <Link
            href="/activity?category=member_activity&sub=watch_rate"
            className="flex items-center gap-0.5 text-sm text-[var(--primary)] transition-colors"
          >
            All
            <CaretRight className="h-4 w-4" />
          </Link>
        </div>

        {/* Carousel with arrows */}
        <div className="relative">
          {/* Left Arrow */}
          {canScrollLeft && (
            <div className="absolute left-0 top-1/2 -translate-y-1/2 z-10">
              <ScrollNavButton direction="left" onClick={() => scroll("left")} size="md" />
            </div>
          )}

          {/* Right Arrow */}
          {canScrollRight && (
            <div className="absolute right-0 top-1/2 -translate-y-1/2 z-10">
              <ScrollNavButton direction="right" onClick={() => scroll("right")} size="md" />
            </div>
          )}

          {/* Scrollable container */}
          <div className="carousel-trough">
            <div
              ref={(el) => {
                containerRef.current = el;
                if (scrollRef && typeof scrollRef === "object" && "current" in scrollRef) {
                  (scrollRef as React.MutableRefObject<HTMLDivElement | null>).current = el;
                }
              }}
              className="flex gap-3 overflow-x-auto scrollbar-hide overscroll-x-contain px-4 py-3"
              data-swipe-ignore
            >
              {movies.slice(0, 10).map((movie) => {
                const posterUrl = getPosterUrl(movie.poster_url);

                return (
                  <Tooltip key={movie.tmdb_id}>
                    <TooltipTrigger asChild>
                      <Link
                        href={`/movies/${movie.tmdb_id}`}
                        className="group/poster flex-shrink-0"
                      >
                        <div className="relative w-20 md:w-24 aspect-[2/3] overflow-hidden rounded-md bg-[var(--surface-1)] poster-card-embossed">
                          {posterUrl ? (
                            <Image
                              src={posterUrl}
                              alt={movie.title}
                              fill
                              className="object-cover"
                              sizes="(max-width: 768px) 80px, 96px"
                              placeholder="blur"
                              blurDataURL={getTMDBBlurDataURL()}
                            />
                          ) : (
                            <div className="flex h-full w-full flex-col items-center justify-center p-1 text-center border border-dashed border-[var(--border)] bg-[var(--surface-1)]">
                              <Text size="tiny" muted className="font-medium text-[10px]">
                                No poster
                              </Text>
                            </div>
                          )}
                          {onRemove && (
                            <button
                              onClick={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                onRemove(movie.tmdb_id);
                              }}
                              className="absolute top-0.5 right-0.5 z-10 p-0.5 rounded-full bg-black/60 text-white/80 opacity-0 group-hover/poster:opacity-100 focus:opacity-100 hover:bg-black/80 hover:text-white transition-all"
                              aria-label={`Remove ${movie.title} from watch history`}
                            >
                              <X className="w-3 h-3" weight="bold" />
                            </button>
                          )}
                          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/0 to-black/0 opacity-0 group-hover/poster:opacity-100 transition-opacity duration-300" />
                          <div className="absolute bottom-0 left-0 right-0 p-1.5 opacity-0 group-hover/poster:opacity-100 transition-opacity duration-300">
                            <Text
                              size="tiny"
                              className="font-semibold text-white line-clamp-2 text-[10px] leading-tight"
                            >
                              {movie.title}
                            </Text>
                            {movie.year && (
                              <Text size="tiny" className="text-white/90 text-[9px] mt-0.5">
                                {movie.year}
                              </Text>
                            )}
                          </div>
                        </div>
                      </Link>
                    </TooltipTrigger>
                    {movie.overview && (
                      <TooltipContent side="top" className="max-w-xs">
                        <div className="space-y-1">
                          <Text size="small" className="font-semibold">
                            {movie.title}
                          </Text>
                          {movie.year && (
                            <Text size="tiny" muted>
                              {movie.year}
                            </Text>
                          )}
                          <Text size="small" muted className="line-clamp-4">
                            {movie.overview}
                          </Text>
                        </div>
                      </TooltipContent>
                    )}
                  </Tooltip>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </TooltipProvider>
  );
}
