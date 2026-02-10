"use client";

import Image from "next/image";
import Link from "next/link";
import { useDragScroll } from "@/lib/hooks/useDragScroll";
import { ScrollNavButton } from "@/components/ui/scroll-nav-button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Text } from "@/components/ui/typography";
import { CarouselErrorBoundary } from "@/components/ui/carousel-error-boundary";
import { getTMDBBlurDataURL } from "@/lib/utils/blur-placeholder";
import { useRef, useState, useEffect, useCallback } from "react";

interface KnownForMovie {
  id: number;
  title: string;
  poster_path: string | null;
  overview?: string | null;
  year?: number | null;
  character?: string | null;
}

interface KnownForCarouselProps {
  movies: KnownForMovie[];
  maxItems?: number;
}

export function KnownForCarousel({ movies, maxItems = 10 }: KnownForCarouselProps) {
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

  if (!movies || movies.length === 0) return null;

  return (
    <CarouselErrorBoundary fallbackMessage="Unable to load credits">
      <section>
        <h3 className="text-base font-bold text-[var(--text-primary)] uppercase tracking-wide mb-3">
          Known For
        </h3>

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
              className="flex gap-3 overflow-x-auto scrollbar-hide overscroll-x-contain px-4 py-2"
              data-swipe-ignore
            >
              {movies.slice(0, maxItems).map((credit, idx) => (
                <Tooltip key={`known-${credit.id}-${idx}`}>
                  <TooltipTrigger asChild>
                    <Link href={`/movies/${credit.id}`} className="flex-shrink-0 w-[112px] group">
                      <div className="aspect-[2/3] relative rounded-lg overflow-hidden mb-1.5 bg-[var(--surface-1)] poster-card-embossed">
                        {credit.poster_path ? (
                          <Image
                            src={`https://image.tmdb.org/t/p/w185${credit.poster_path}`}
                            alt={credit.title}
                            fill
                            sizes="112px"
                            className="object-cover"
                            placeholder="blur"
                            blurDataURL={getTMDBBlurDataURL()}
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-xs text-center p-2 text-[var(--text-muted)]">
                            No Poster
                          </div>
                        )}
                        {/* Hover overlay */}
                        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/0 to-black/0 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                        <div className="absolute bottom-0 left-0 right-0 p-1.5 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                          <Text
                            size="tiny"
                            className="font-semibold text-white line-clamp-2 text-[10px] leading-tight"
                          >
                            {credit.title}
                          </Text>
                          {credit.year && (
                            <Text size="tiny" className="text-white/90 text-[9px] mt-0.5">
                              {credit.year}
                            </Text>
                          )}
                        </div>
                      </div>
                      {credit.character && (
                        <Text size="tiny" muted className="truncate text-[11px] leading-tight">
                          {credit.character}
                        </Text>
                      )}
                    </Link>
                  </TooltipTrigger>
                  <TooltipContent side="top" className="max-w-xs">
                    <div className="space-y-1">
                      <Text size="small" className="font-semibold">
                        {credit.title}
                      </Text>
                      {credit.year && (
                        <Text size="tiny" muted>
                          {credit.year}
                        </Text>
                      )}
                      {credit.overview && (
                        <Text size="small" muted className="line-clamp-4">
                          {credit.overview}
                        </Text>
                      )}
                    </div>
                  </TooltipContent>
                </Tooltip>
              ))}
            </div>
          </div>
        </div>
      </section>
    </CarouselErrorBoundary>
  );
}
