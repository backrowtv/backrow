"use client";

import { useState, useEffect, useCallback } from "react";
import Image from "next/image";
import useEmblaCarousel from "embla-carousel-react";
import type { PastNominationItem } from "@/app/actions/profile/past-nominations";
import { EmptyState } from "@/components/shared/EmptyState";
import { usePastNominationData } from "./hooks/usePastNominationData";
import { useRouter } from "next/navigation";
import { CaretLeft, CaretRight, FilmReel, FilmSlate, CircleNotch } from "@phosphor-icons/react";
import { ExternalLink } from "@/components/ui/external-logos";
import { MovieDetailsPanel } from "./MovieDetailsPanel";
import { EntityAvatar } from "@/components/ui/entity-avatar";
import { clubToAvatarData } from "@/lib/avatar-helpers";
import { getTMDBBlurDataURL } from "@/lib/utils/blur-placeholder";
import { PastNominationsList } from "./PastNominationsList";

interface PastNominationsProps {
  userId: string;
  showDetails?: boolean;
  viewMode?: "carousel" | "list";
}

// ============================================
// MOVIE CARD COMPONENT (Read-only version)
// ============================================

interface MovieCardProps {
  item: PastNominationItem;
  isSelected: boolean;
  isMobile: boolean;
  onClick?: () => void;
}

function MovieCard({ item, isSelected, isMobile, onClick }: MovieCardProps) {
  const movie = item.movie;

  return (
    <div
      className="flex flex-col items-center cursor-pointer transition-all"
      role="button"
      tabIndex={0}
      onClick={onClick}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onClick?.();
        }
      }}
    >
      {/* Poster Container */}
      <div className="p-1">
        <div
          className="relative rounded-lg overflow-hidden shadow-xl transition-all duration-300"
          style={{
            backgroundColor: "var(--surface-2)",
            width: isMobile ? "140px" : "160px",
            aspectRatio: "2/3",
          }}
        >
          {movie?.poster_url ? (
            <Image
              src={
                movie.poster_url.startsWith("http")
                  ? movie.poster_url
                  : `https://image.tmdb.org/t/p/w500${movie.poster_url}`
              }
              alt={movie.title || "Movie"}
              fill
              className="object-cover"
              sizes={isMobile ? "140px" : "160px"}
              priority={isSelected}
              placeholder="blur"
              blurDataURL={getTMDBBlurDataURL()}
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <FilmReel className="w-12 h-12" style={{ color: "var(--text-muted)" }} />
            </div>
          )}

          {/* Festival theme badge removed - shown in details card below */}
        </div>
      </div>

      {/* Title & Details */}
      <div
        className={`mt-2 text-center w-full ${isMobile ? (isSelected ? "max-w-[160px]" : "max-w-[140px]") : isSelected ? "max-w-[180px]" : "max-w-[160px]"}`}
      >
        <h3
          className={`font-semibold leading-tight ${isSelected ? "line-clamp-2" : "truncate"} ${isMobile ? "text-xs" : "text-sm"}`}
          style={{ color: "var(--text-primary)" }}
        >
          {movie?.title || "Unknown Movie"}
        </h3>
      </div>
    </div>
  );
}

// ============================================
// FOCUS CAROUSEL (Linear, no loop)
// ============================================

interface FocusCarouselProps {
  items: PastNominationItem[];
  selectedIndex: number;
  onSelectMovie: (index: number) => void;
  onNavigateToMovie: (tmdbId: number) => void;
  isMobile: boolean;
}

function FocusCarousel({
  items,
  selectedIndex,
  onSelectMovie,
  onNavigateToMovie,
  isMobile,
}: FocusCarouselProps) {
  const [currentIndex, setCurrentIndex] = useState(selectedIndex);
  const [emblaRef, emblaApi] = useEmblaCarousel({
    loop: false,
    align: "center",
    containScroll: false,
    startIndex: selectedIndex,
    duration: 80,
  });

  const canGoPrev = currentIndex > 0;
  const canGoNext = currentIndex < items.length - 1;

  useEffect(() => {
    if (!emblaApi) return;

    const onSelect = () => {
      const index = emblaApi.selectedScrollSnap();
      setCurrentIndex(index);
      if (index !== selectedIndex) {
        onSelectMovie(index);
      }
    };

    onSelect();
    emblaApi.on("select", onSelect);
    return () => {
      emblaApi.off("select", onSelect);
    };
  }, [emblaApi, selectedIndex, onSelectMovie]);

  useEffect(() => {
    if (emblaApi && selectedIndex !== currentIndex) {
      emblaApi.scrollTo(selectedIndex);
    }
  }, [emblaApi, selectedIndex, currentIndex]);

  const scrollPrev = useCallback(() => {
    if (emblaApi && canGoPrev) emblaApi.scrollPrev();
  }, [emblaApi, canGoPrev]);

  const scrollNext = useCallback(() => {
    if (emblaApi && canGoNext) emblaApi.scrollNext();
  }, [emblaApi, canGoNext]);

  const posterHeight = isMobile ? 200 : 230;
  const arrowTop = posterHeight / 2;

  return (
    <div className="relative">
      <div className="overflow-hidden mx-10 md:mx-14" ref={emblaRef} data-swipe-ignore>
        <div className="flex items-end pt-3" style={{ minHeight: isMobile ? "340px" : "370px" }}>
          {items.map((item, index) => {
            const isSelected = index === currentIndex;
            return (
              <div
                key={item.id}
                className="flex-[0_0_auto] min-w-0 px-3 cursor-pointer"
                style={{ width: isMobile ? "155px" : "175px" }}
                onClick={() => {
                  if (isSelected && item.tmdb_id) {
                    onNavigateToMovie(item.tmdb_id);
                  } else if (!isSelected) {
                    emblaApi?.scrollTo(index);
                  }
                }}
              >
                <div
                  className="transition-all duration-700 ease-out"
                  style={{
                    transform: isSelected ? "scale(1.08)" : "scale(0.85)",
                    opacity: isSelected ? 1 : 0.5,
                  }}
                >
                  <MovieCard item={item} isSelected={isSelected} isMobile={isMobile} />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Arrow buttons */}
      <button
        onClick={scrollPrev}
        disabled={!canGoPrev}
        className="absolute left-0 md:left-2 z-40 p-2 rounded-full transition-transform duration-200 ease-out hover:scale-110 shadow-lg disabled:opacity-50 disabled:cursor-not-allowed -translate-y-1/2"
        style={{
          backgroundColor: "var(--surface-1)",
          color: "var(--text-primary)",
          border: "1px solid var(--border)",
          top: `${arrowTop}px`,
        }}
        aria-label="Previous movie"
      >
        <CaretLeft className="w-5 h-5" />
      </button>
      <button
        onClick={scrollNext}
        disabled={!canGoNext}
        className="absolute right-0 md:right-2 z-40 p-2 rounded-full transition-transform duration-200 ease-out hover:scale-110 shadow-lg disabled:opacity-50 disabled:cursor-not-allowed -translate-y-1/2"
        style={{
          backgroundColor: "var(--surface-1)",
          color: "var(--text-primary)",
          border: "1px solid var(--border)",
          top: `${arrowTop}px`,
        }}
        aria-label="Next movie"
      >
        <CaretRight className="w-5 h-5" />
      </button>

      {/* Position indicator dots */}
      <div className="flex justify-center items-center gap-1.5 mt-2">
        {items.map((_, index) => (
          <button
            key={index}
            onClick={() => emblaApi?.scrollTo(index)}
            className={`rounded-full transition-all duration-200 ${
              index === currentIndex ? "w-6 h-2.5" : "w-2 h-2 opacity-50 hover:opacity-80"
            }`}
            style={{
              backgroundColor: index === currentIndex ? "var(--primary)" : "var(--surface-3)",
            }}
            aria-label={`Go to movie ${index + 1}`}
          />
        ))}
      </div>
    </div>
  );
}

// ============================================
// MAIN COMPONENT
// ============================================

function formatCurrency(amount: number): string {
  if (amount >= 1_000_000_000) {
    return `$${(amount / 1_000_000_000).toFixed(1)}B`;
  }
  if (amount >= 1_000_000) {
    return `$${(amount / 1_000_000).toFixed(0)}M`;
  }
  if (amount >= 1_000) {
    return `$${(amount / 1_000).toFixed(0)}K`;
  }
  return `$${amount}`;
}

function formatRuntime(minutes: number): string {
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  if (hours === 0) return `${mins}m`;
  if (mins === 0) return `${hours}h`;
  return `${hours}h ${mins}m`;
}

export function PastNominations({
  userId,
  showDetails = true,
  viewMode = "carousel",
}: PastNominationsProps) {
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [isMobile, setIsMobile] = useState(false);
  const router = useRouter();

  // Data loading: nominations, movie details, link preferences
  const { items, loading, movieDetails, detailsLoading, visibleLinks } = usePastNominationData({
    userId,
    selectedIndex,
  });

  // Check for mobile viewport
  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  const currentItem = items[selectedIndex];

  if (loading) {
    return (
      <div className="flex justify-center items-center py-20">
        <CircleNotch className="w-8 h-8 animate-spin" style={{ color: "var(--text-muted)" }} />
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <EmptyState
        icon={FilmSlate}
        title="No past nominations"
        message="Movies you nominate in completed festivals will appear here"
        variant="card"
      />
    );
  }

  return (
    <div className="space-y-4">
      {viewMode === "list" ? (
        <PastNominationsList
          items={items}
          onNavigateToMovie={(tmdbId) => router.push(`/movies/${tmdbId}`)}
        />
      ) : (
        <>
          {/* Carousel */}
          <FocusCarousel
            items={items}
            selectedIndex={selectedIndex}
            onSelectMovie={setSelectedIndex}
            onNavigateToMovie={(tmdbId) => router.push(`/movies/${tmdbId}`)}
            isMobile={isMobile}
          />

          {/* Festival/Club context for selected movie */}
          {currentItem?.festival && (
            <div
              className="flex items-center justify-center gap-3 py-3 px-4 rounded-lg"
              style={{ backgroundColor: "var(--surface-1)" }}
            >
              {currentItem.festival.club && (
                <>
                  <EntityAvatar
                    entity={clubToAvatarData(currentItem.festival.club)}
                    emojiSet="club"
                    size="sm"
                  />
                  <div className="text-center">
                    <p className="text-sm font-medium" style={{ color: "var(--text-primary)" }}>
                      {currentItem.festival.theme || "Untitled Festival"}
                    </p>
                    <p className="text-xs" style={{ color: "var(--text-muted)" }}>
                      {currentItem.festival.club.name}
                    </p>
                  </div>
                </>
              )}
            </div>
          )}

          {/* Movie Details Panel */}
          {showDetails && currentItem && (
            <>
              {/* Movie Info Bar */}
              {movieDetails && (
                <div
                  className="py-3 px-4 space-y-2 rounded-lg flex flex-col items-center justify-center min-h-[120px]"
                  style={{ backgroundColor: "var(--surface-1)" }}
                >
                  <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-1.5">
                    {movieDetails.year && (
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs" style={{ color: "var(--text-muted)" }}>
                          Year
                        </span>
                        <span
                          className="text-sm font-medium"
                          style={{ color: "var(--text-primary)" }}
                        >
                          {movieDetails.year}
                        </span>
                      </div>
                    )}
                    {movieDetails.certification && (
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs" style={{ color: "var(--text-muted)" }}>
                          Rated
                        </span>
                        <span
                          className="text-sm font-medium"
                          style={{ color: "var(--text-primary)" }}
                        >
                          {movieDetails.certification}
                        </span>
                      </div>
                    )}
                    {movieDetails.runtime && (
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs" style={{ color: "var(--text-muted)" }}>
                          Runtime
                        </span>
                        <span
                          className="text-sm font-medium"
                          style={{ color: "var(--text-primary)" }}
                        >
                          {formatRuntime(movieDetails.runtime)}
                        </span>
                      </div>
                    )}
                    {movieDetails.budget && (
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs" style={{ color: "var(--text-muted)" }}>
                          Budget
                        </span>
                        <span
                          className="text-sm font-medium"
                          style={{ color: "var(--text-primary)" }}
                        >
                          {formatCurrency(movieDetails.budget)}
                        </span>
                      </div>
                    )}
                    {movieDetails.revenue && (
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs" style={{ color: "var(--text-muted)" }}>
                          Box Office
                        </span>
                        <span
                          className="text-sm font-medium"
                          style={{ color: "var(--text-primary)" }}
                        >
                          {formatCurrency(movieDetails.revenue)}
                        </span>
                      </div>
                    )}
                    {movieDetails.studio && (
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs" style={{ color: "var(--text-muted)" }}>
                          Studio
                        </span>
                        <span
                          className="text-sm font-medium"
                          style={{ color: "var(--text-primary)" }}
                        >
                          {movieDetails.studio}
                        </span>
                      </div>
                    )}
                  </div>
                  {visibleLinks.length > 0 && (
                    <div className="flex items-center justify-center gap-1.5">
                      {visibleLinks.includes("imdb") && movieDetails.external_ids.imdb_id && (
                        <ExternalLink
                          href={`https://www.imdb.com/title/${movieDetails.external_ids.imdb_id}`}
                          logo="imdb"
                          label="View on IMDb"
                        />
                      )}
                      {visibleLinks.includes("letterboxd") && (
                        <ExternalLink
                          href={`https://letterboxd.com/tmdb/${movieDetails.tmdb_id}`}
                          logo="letterboxd"
                          label="View on Letterboxd"
                        />
                      )}
                      {visibleLinks.includes("trakt") && (
                        <ExternalLink
                          href={`https://trakt.tv/search/tmdb/${movieDetails.tmdb_id}?id_type=movie`}
                          logo="trakt"
                          label="View on Trakt"
                        />
                      )}
                      {visibleLinks.includes("tmdb") && (
                        <ExternalLink
                          href={`https://www.themoviedb.org/movie/${movieDetails.tmdb_id}`}
                          logo="tmdb"
                          label="View on TMDB"
                        />
                      )}
                      {visibleLinks.includes("wikipedia") &&
                        (movieDetails.external_ids.wikidata_id ? (
                          <ExternalLink
                            href={`https://www.wikidata.org/wiki/Special:GoToLinkedPage/enwiki/${movieDetails.external_ids.wikidata_id}`}
                            logo="wikipedia"
                            label="View on Wikipedia"
                          />
                        ) : (
                          <ExternalLink
                            href={`https://en.wikipedia.org/wiki/Special:Search?search=${encodeURIComponent(movieDetails.title + (movieDetails.year ? ` (${movieDetails.year} film)` : " (film)"))}`}
                            logo="wikipedia"
                            label="Search on Wikipedia"
                          />
                        ))}
                    </div>
                  )}
                </div>
              )}

              <MovieDetailsPanel
                movie={movieDetails}
                visibleLinks={visibleLinks}
                loading={detailsLoading}
              />
            </>
          )}
        </>
      )}
    </div>
  );
}
