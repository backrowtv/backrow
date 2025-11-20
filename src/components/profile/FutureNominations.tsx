"use client";

import { useState, useEffect, useCallback } from "react";
import Image from "next/image";
import useEmblaCarousel from "embla-carousel-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ConfirmationDialog } from "@/components/ui/confirmation-dialog";
import { EmptyState } from "@/components/shared/EmptyState";

import { getMovieLinkPreferences } from "@/app/actions/navigation-preferences";
import type { MovieLinkType } from "@/lib/navigation-constants";
import { ExternalLink } from "@/components/ui/external-logos";
import { useRouter, useSearchParams } from "next/navigation";
import {
  Plus,
  CaretLeft,
  CaretRight,
  FilmReel,
  Link,
  Trash,
  CircleNotch,
} from "@phosphor-icons/react";
import { AddFutureNominationModal } from "./AddFutureNominationModal";
import { MovieDetailsPanel } from "./MovieDetailsPanel";
import { FutureNominationsList } from "./FutureNominationsList";
import { ManageThemeLinksModal } from "./ManageThemeLinksModal";
import { getTMDBBlurDataURL } from "@/lib/utils/blur-placeholder";
import {
  useFutureNominationsList,
  useFutureNominationDetails,
  useThemeLinking,
  type FutureNominationItem,
} from "./hooks";

interface FutureNominationsProps {
  userId: string;
  showAddButton?: boolean;
  showDetails?: boolean; // Whether to show the movie details panel (overview, cast, etc.)
  viewMode?: "carousel" | "list";
}

// ============================================
// MOVIE CARD COMPONENT
// ============================================

interface MovieCardProps {
  item: FutureNominationItem;
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

          {/* Note badge if exists - positioned at bottom-left */}
          {item.note && (
            <div className="absolute bottom-2 left-2 right-8">
              <Badge
                variant="secondary"
                size="sm"
                className="shadow-lg w-full justify-center truncate text-[10px]"
              >
                <span className="truncate">{item.note}</span>
              </Badge>
            </div>
          )}

          {/* Theme link indicator - small icon at bottom-right */}
          {item.hasThemeLink && (
            <div
              className="absolute bottom-2 right-2 w-5 h-5 rounded flex items-center justify-center shadow-lg"
              style={{ backgroundColor: "var(--primary)" }}
              title="Linked to theme"
            >
              <Link className="w-3 h-3 text-white" />
            </div>
          )}
        </div>
      </div>

      {/* Title & Details */}
      <div className={`mt-2 text-center w-full ${isMobile ? "max-w-[140px]" : "max-w-[160px]"}`}>
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
  items: FutureNominationItem[];
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
    duration: 80, // Very slow cinematic scroll (default is 25, higher = slower)
  });

  const canGoPrev = currentIndex > 0;
  const canGoNext = currentIndex < items.length - 1;

  // Listen to Embla selection changes and sync with parent
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

  // Sync Embla when selectedIndex changes from parent
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

  // Calculate poster height for arrow positioning (2:3 aspect ratio)
  const posterHeight = isMobile ? 200 : 230;
  const arrowTop = posterHeight / 2;

  return (
    <div className="relative">
      {/* Embla Carousel */}
      <div className="overflow-hidden mx-10 md:mx-14" ref={emblaRef} data-swipe-ignore>
        <div className="flex items-start pt-3" style={{ minHeight: isMobile ? "300px" : "330px" }}>
          {items.map((item, index) => {
            const isSelected = index === currentIndex;
            return (
              <div
                key={item.id}
                role="button"
                tabIndex={0}
                className="flex-[0_0_auto] min-w-0 px-2 cursor-pointer"
                style={{ width: isMobile ? "155px" : "175px" }}
                onClick={() => {
                  if (isSelected && item.tmdb_id) {
                    onNavigateToMovie(item.tmdb_id);
                  } else if (!isSelected) {
                    emblaApi?.scrollTo(index);
                  }
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    if (isSelected && item.tmdb_id) {
                      onNavigateToMovie(item.tmdb_id);
                    } else if (!isSelected) {
                      emblaApi?.scrollTo(index);
                    }
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

      {/* Position indicator - individual dots for linear carousel */}
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

// ManageThemeLinksModal has been extracted to ./ManageThemeLinksModal.tsx

// MAIN COMPONENT
// ============================================

// Helper to format currency
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

// Helper to format runtime
function formatRuntime(minutes: number): string {
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  if (hours === 0) return `${mins}m`;
  if (mins === 0) return `${hours}h`;
  return `${hours}h ${mins}m`;
}

export function FutureNominations({
  userId,
  showAddButton = true,
  showDetails = true,
  viewMode = "carousel",
}: FutureNominationsProps) {
  // Use custom hooks for core functionality
  const {
    items,
    loading,
    selectedIndex,
    setSelectedIndex,
    deletingId,
    loadFutureNominations,
    handleDeleteItem,
  } = useFutureNominationsList(userId);

  const { movieDetails, detailsLoading } = useFutureNominationDetails(items[selectedIndex] || null);

  const {
    clubThemes,
    linkingLoading,
    handleNominate: hookHandleNominate,
  } = useThemeLinking(userId);

  // UI-specific state
  const [isMobile, setIsMobile] = useState(false);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isManageLinksModalOpen, setIsManageLinksModalOpen] = useState(false);
  const [itemToDelete, setItemToDelete] = useState<{ id: string; title: string } | null>(null);
  const [listManageLinkItem, setListManageLinkItem] = useState<FutureNominationItem | null>(null);
  const [visibleLinks, setVisibleLinks] = useState<MovieLinkType[]>([]);
  const [initialMovieHandled, setInitialMovieHandled] = useState(false);
  const router = useRouter();
  const searchParams = useSearchParams();

  // Check for mobile viewport
  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  // Load user's movie link preferences
  useEffect(() => {
    async function loadLinkPreferences() {
      try {
        const prefs = await getMovieLinkPreferences();
        setVisibleLinks(prefs.visibleLinks);
      } catch (error) {
        console.error("Error loading link preferences:", error);
        // Default to all links if there's an error
        setVisibleLinks(["imdb", "letterboxd", "trakt", "tmdb", "wikipedia"]);
      }
    }
    loadLinkPreferences();
  }, []);

  // Handle initial movie selection from URL param (e.g., ?movie=12345)
  useEffect(() => {
    if (initialMovieHandled || items.length === 0) return;

    const movieParam = searchParams.get("movie");
    if (!movieParam) {
      setInitialMovieHandled(true);
      return;
    }

    const tmdbId = parseInt(movieParam, 10);
    if (isNaN(tmdbId)) {
      setInitialMovieHandled(true);
      return;
    }

    const index = items.findIndex((item) => item.tmdb_id === tmdbId);
    if (index !== -1) {
      setSelectedIndex(index);
    }
    setInitialMovieHandled(true);
  }, [items, searchParams, initialMovieHandled, setSelectedIndex]);

  function handleDeleteClick(itemId: string) {
    const item = items.find((i) => i.id === itemId);
    const title = item?.movie?.title || "this movie";
    setItemToDelete({ id: itemId, title });
  }

  async function handleConfirmDelete() {
    if (!itemToDelete) return;
    await handleDeleteItem(itemToDelete.id);
    setItemToDelete(null);
  }

  async function handleNominate(futureNominationId: string, clubId: string, festivalId: string) {
    await hookHandleNominate(
      futureNominationId,
      clubId,
      festivalId,
      loadFutureNominations,
      (stillExists) => {
        if (!stillExists) {
          setIsManageLinksModalOpen(false);
        }
      }
    );
  }

  const currentItem = viewMode === "list" ? listManageLinkItem : items[selectedIndex];

  function handleListManageLinks(item: FutureNominationItem) {
    setListManageLinkItem(item);
    setIsManageLinksModalOpen(true);
  }

  if (loading) {
    return (
      <div className="flex justify-center items-center py-20">
        <CircleNotch className="w-8 h-8 animate-spin" style={{ color: "var(--text-muted)" }} />
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <>
        <EmptyState
          icon={FilmReel}
          title="No future nominations"
          message="Add movies here to nominate them in upcoming festivals"
          variant="card"
          action={
            showAddButton ? (
              <Button variant="outline" size="sm" onClick={() => setIsAddModalOpen(true)}>
                <Plus className="w-4 h-4 mr-2" />
                Add Movie
              </Button>
            ) : undefined
          }
        />
        <AddFutureNominationModal
          open={isAddModalOpen}
          onOpenChange={setIsAddModalOpen}
          onSuccess={loadFutureNominations}
        />
      </>
    );
  }

  return (
    <>
      <div className="space-y-4">
        {viewMode === "list" ? (
          <FutureNominationsList
            items={items}
            onDeleteClick={handleDeleteClick}
            onManageLinks={handleListManageLinks}
            onNavigateToMovie={(tmdbId) => router.push(`/movies/${tmdbId}`)}
            deletingId={deletingId}
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

            {/* Action bar for selected movie */}
            {currentItem && (
              <div className="flex items-center justify-center gap-2 pt-2">
                {/* Link Theme button */}
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => setIsManageLinksModalOpen(true)}
                >
                  <Link className="w-4 h-4 mr-1.5" />
                  Link Theme
                  {currentItem.linkCount ? (
                    <Badge
                      variant="secondary"
                      size="sm"
                      className="ml-1.5 bg-[var(--primary)] text-[var(--primary-foreground)] border-0 px-1.5 py-0"
                    >
                      {currentItem.linkCount}
                    </Badge>
                  ) : null}
                </Button>

                {/* Delete button */}
                <Button
                  variant="danger"
                  size="sm"
                  onClick={() => handleDeleteClick(currentItem.id)}
                  disabled={deletingId === currentItem.id}
                >
                  {deletingId === currentItem.id ? (
                    <CircleNotch className="w-4 h-4 animate-spin" />
                  ) : (
                    <Trash className="w-4 h-4" />
                  )}
                </Button>

                {/* Add movie button */}
                {showAddButton && (
                  <Button variant="outline" size="sm" onClick={() => setIsAddModalOpen(true)}>
                    <Plus className="w-4 h-4" />
                  </Button>
                )}
              </div>
            )}

            {/* Movie Details Panel - only shown when showDetails is true */}
            {showDetails && currentItem && (
              <>
                {/* Movie Info Bar */}
                {movieDetails && (
                  <div
                    className="py-3 px-4 space-y-2 rounded-lg flex flex-col items-center justify-center min-h-[96px]"
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

        {/* Add Movie button (visible in list view) */}
        {showAddButton && viewMode === "list" && (
          <div className="flex justify-center pt-2">
            <Button variant="outline" size="sm" onClick={() => setIsAddModalOpen(true)}>
              <Plus className="w-4 h-4 mr-2" />
              Add Movie
            </Button>
          </div>
        )}
      </div>

      {/* Manage Theme Links Modal */}
      <ManageThemeLinksModal
        open={isManageLinksModalOpen}
        onOpenChange={setIsManageLinksModalOpen}
        item={currentItem}
        clubThemes={clubThemes}
        onNominate={handleNominate}
        onLinksChanged={loadFutureNominations}
        loading={linkingLoading}
      />

      {/* Add Movie Modal */}
      <AddFutureNominationModal
        open={isAddModalOpen}
        onOpenChange={setIsAddModalOpen}
        onSuccess={loadFutureNominations}
      />

      {/* Delete Confirmation Dialog */}
      <ConfirmationDialog
        open={itemToDelete !== null}
        onOpenChange={(open) => !open && setItemToDelete(null)}
        title="Remove from Future Nominations?"
        description={
          <span>
            Are you sure you want to remove <strong>{itemToDelete?.title}</strong> from your future
            nominations?
          </span>
        }
        confirmText="Remove"
        onConfirm={handleConfirmDelete}
        variant="danger"
        isLoading={deletingId !== null}
      />
    </>
  );
}
