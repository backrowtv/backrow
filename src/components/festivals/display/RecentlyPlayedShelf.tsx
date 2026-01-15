"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import {
  ClockCounterClockwise,
  CaretLeft,
  CaretRight,
  FilmReel,
  ChatCircleText,
  X,
} from "@phosphor-icons/react";
import { useDragScroll } from "@/lib/hooks/useDragScroll";
import type { EndlessMovie } from "@/app/actions/endless-festival";

export interface DiscussionThreadMap {
  [tmdbId: number]: { id: string; slug: string | null };
}

interface RecentlyPlayedShelfProps {
  movies: EndlessMovie[];
  clubSlug: string;
  isAdmin?: boolean;
  discussionThreads?: DiscussionThreadMap;
  onHide?: (nominationId: string) => void;
}

export function RecentlyPlayedShelf({
  movies,
  clubSlug,
  isAdmin = false,
  discussionThreads,
  onHide,
}: RecentlyPlayedShelfProps) {
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

  const getDiscussionLink = (tmdbId: number) => {
    const thread = discussionThreads?.[tmdbId];
    if (thread) {
      return `/club/${clubSlug}/discuss/${thread.slug || thread.id}`;
    }
    return `/club/${clubSlug}/discuss?movie=${tmdbId}`;
  };

  return (
    <div>
      <div className="flex items-center justify-between py-2 gap-2 mb-2">
        <h3 className="text-sm font-semibold text-[var(--club-accent,var(--text-primary))] uppercase tracking-wide flex items-center gap-2">
          <ClockCounterClockwise className="w-4 h-4" />
          Recently Played
        </h3>
        <div className="flex items-center gap-1">
          <span className="text-xs text-[var(--text-muted)]">{movies.length}</span>
          <div className="hidden sm:flex gap-0.5">
            <button
              onClick={() => scroll("left")}
              disabled={!canScrollLeft}
              className="p-1 rounded-full transition-all hover:bg-[var(--surface-2)] disabled:opacity-50 disabled:cursor-not-allowed"
              style={{ color: "var(--text-primary)" }}
              aria-label="Scroll left"
            >
              <CaretLeft className="w-4 h-4" weight="bold" />
            </button>
            <button
              onClick={() => scroll("right")}
              disabled={!canScrollRight}
              className="p-1 rounded-full transition-all hover:bg-[var(--surface-2)] disabled:opacity-50 disabled:cursor-not-allowed"
              style={{ color: "var(--text-primary)" }}
              aria-label="Scroll right"
            >
              <CaretRight className="w-4 h-4" weight="bold" />
            </button>
          </div>
        </div>
      </div>

      <div className="carousel-trough rounded-lg">
        <div
          ref={(el) => {
            containerRef.current = el;
            if (scrollRef && typeof scrollRef === "object" && "current" in scrollRef) {
              (scrollRef as React.MutableRefObject<HTMLDivElement | null>).current = el;
            }
          }}
          className="flex gap-3 overflow-x-auto scrollbar-hide overscroll-x-contain px-3 py-3"
          data-swipe-ignore
        >
          {movies.map((movie) => (
            <div key={movie.id} className="flex-shrink-0 group relative">
              <Link href={`/movies/${movie.tmdb_id}`} className="block">
                <div className="relative w-20 md:w-24 aspect-[2/3] overflow-hidden rounded-md bg-[var(--surface-1)] poster-card-embossed">
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

                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 z-[5]" />

                  <div className="absolute bottom-0 left-0 right-0 p-1.5 opacity-0 group-hover:opacity-100 transition-opacity duration-300 z-[6]">
                    <p className="font-semibold text-white line-clamp-2 text-[10px] leading-tight">
                      {movie.title}
                    </p>
                    {movie.year && <p className="text-white/90 text-[9px] mt-0.5">{movie.year}</p>}
                  </div>

                  {isAdmin && onHide && (
                    <button
                      onClick={(e) => handleHide(e, movie.id)}
                      className="absolute top-1 right-1 p-1 rounded-full bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity hover:bg-black/80 z-[15]"
                      title="Hide from Recently Played"
                    >
                      <X className="w-3 h-3 text-white" />
                    </button>
                  )}
                </div>
              </Link>

              <Link
                href={getDiscussionLink(movie.tmdb_id)}
                className="absolute -bottom-1 -right-1 p-1.5 rounded-full bg-[var(--primary)] hover:bg-[var(--primary-hover)] shadow-md transition-all hover:scale-110 z-[20]"
                onClick={(e) => e.stopPropagation()}
                title="View Discussion"
              >
                <ChatCircleText
                  className="w-3.5 h-3.5 text-[var(--primary-foreground)]"
                  weight="fill"
                />
              </Link>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
