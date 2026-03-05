"use client";

import Image from "next/image";
import Link from "next/link";
import { useRef, useState, useEffect, useCallback } from "react";
import { Heading, Text } from "@/components/ui/typography";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { useDragScroll } from "@/lib/hooks/useDragScroll";
import { ScrollNavButton } from "@/components/ui/scroll-nav-button";
import { getTMDBBlurDataURL } from "@/lib/utils/blur-placeholder";

export interface CuratedMovie {
  tmdbId: number;
  title: string;
  year: number;
  posterPath: string | null;
  overview?: string;
}

interface CuratedMoviesProps {
  title: string;
  subtitle?: string;
  emoji?: string | null;
  movies: CuratedMovie[];
}

const TMDB_IMAGE_BASE_URL = "https://image.tmdb.org/t/p/w500";

function getPosterUrl(posterPath: string | null): string | null {
  if (!posterPath) return null;
  return `${TMDB_IMAGE_BASE_URL}${posterPath}`;
}

export function CuratedMovies({ title, subtitle, emoji, movies }: CuratedMoviesProps) {
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

  if (movies.length === 0) {
    return null;
  }

  return (
    <div>
      <div className="mb-3">
        <Heading level={3} className="text-left text-xl font-semibold tracking-tight">
          {title} {emoji && <span className="ml-1">{emoji}</span>}
        </Heading>
        {subtitle && (
          <Text size="small" muted className="mt-1">
            {subtitle}
          </Text>
        )}
      </div>
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

        <div className="carousel-trough">
          <div
            ref={(el) => {
              containerRef.current = el;
              if (scrollRef && typeof scrollRef === "object" && "current" in scrollRef) {
                (scrollRef as React.MutableRefObject<HTMLDivElement | null>).current = el;
              }
            }}
            className="flex gap-4 overflow-x-auto scrollbar-hide overscroll-x-contain px-4 py-3"
            data-swipe-ignore
          >
            {movies.map((movie) => {
              const posterUrl = getPosterUrl(movie.posterPath);

              return (
                <Tooltip key={movie.tmdbId}>
                  <TooltipTrigger asChild>
                    <Link href={`/movies/${movie.tmdbId}`} className="group flex-shrink-0">
                      <div className="relative w-24 md:w-28 aspect-[2/3] overflow-hidden rounded-md bg-[var(--surface-1)] poster-card-embossed">
                        {posterUrl ? (
                          <Image
                            src={posterUrl}
                            alt={movie.title}
                            fill
                            className="object-cover"
                            sizes="(max-width: 768px) 96px, 112px"
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
                        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/0 to-black/0 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                        <div className="absolute bottom-0 left-0 right-0 p-1.5 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                          <Text
                            size="tiny"
                            className="font-semibold text-white line-clamp-2 text-[10px] leading-tight"
                          >
                            {movie.title}
                          </Text>
                          <Text size="tiny" className="text-white/90 text-[9px] mt-0.5">
                            {movie.year}
                          </Text>
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
                        <Text size="tiny" muted>
                          {movie.year}
                        </Text>
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
  );
}
