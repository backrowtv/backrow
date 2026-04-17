"use client";

import React, { useState, useMemo, useRef, useCallback, useLayoutEffect } from "react";
import {
  CalendarBlank,
  FilmSlate,
  FilmReel,
  ClockCounterClockwise,
  SquaresFour,
  List,
} from "@phosphor-icons/react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/shared/EmptyState";
import { FestivalShareButton } from "@/components/festivals";
import { FestivalResultsModal } from "@/components/results/FestivalResultsModal";
import Link from "next/link";
import Image from "next/image";
import { PaginationControls } from "@/components/activity/PaginationControls";

interface TabMeasurement {
  left: number;
  width: number;
}

const allHistoryTabItems = [
  { value: "seasons" as const, label: "Seasons", icon: CalendarBlank },
  { value: "festivals" as const, label: "Festivals", icon: FilmSlate },
  { value: "movies" as const, label: "Movies", icon: FilmReel },
];

export interface Season {
  id: string;
  name: string;
  subtitle?: string | null;
  start_date: string;
  end_date: string;
}

export interface Festival {
  id: string;
  slug: string;
  theme: string | null;
  status: string;
  start_date: string;
  season_id?: string | null;
}

export interface NominationWithMovie {
  id: string;
  nominator_name: string | null;
  movies: {
    tmdb_id?: number;
    title?: string;
    poster_url?: string;
    year?: number;
    director?: string | null;
    genres?: string[] | null;
    overview?: string | null;
  } | null;
  festivals: {
    id?: string;
    slug?: string;
    theme?: string;
    status?: string;
    start_date?: string;
  } | null;
}

interface ClubHistoryViewProps {
  seasons: Season[];
  festivals: Festival[];
  nominations: NominationWithMovie[];
  clubSlug: string;
  isEndlessClub: boolean;
  defaultTab?: "seasons" | "festivals" | "movies";
  currentPage: number;
  totalPages: number;
  totalItems: number;
  pageSize: number;
  className?: string;
}

export function ClubHistoryView({
  seasons,
  festivals,
  nominations,
  clubSlug,
  isEndlessClub,
  defaultTab = "seasons",
  currentPage,
  totalPages,
  totalItems,
  pageSize,
  className,
}: ClubHistoryViewProps) {
  // Hide the festivals tab for endless clubs
  const historyTabItems = isEndlessClub
    ? allHistoryTabItems.filter((t) => t.value !== "festivals")
    : allHistoryTabItems;

  const safeDefault = isEndlessClub && defaultTab === "festivals" ? "movies" : defaultTab;
  const [activeTab, setActiveTab] = useState<"seasons" | "festivals" | "movies">(safeDefault);
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [selectedFestivalId, setSelectedFestivalId] = useState<string | null>(null);
  const [expandedSeasonId, setExpandedSeasonId] = useState<string | null>(null);

  // Tab measurement state for sliding pill
  const containerRef = useRef<HTMLDivElement>(null);
  const tabRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const [measurements, setMeasurements] = useState<TabMeasurement[]>([]);
  const [animationEnabled, setAnimationEnabled] = useState(false);

  const activeIndex = useMemo(() => {
    const idx = historyTabItems.findIndex((item) => item.value === activeTab);
    return idx >= 0 ? idx : 0;
  }, [activeTab, historyTabItems]);

  const measureTabs = useCallback(() => {
    const newMeasurements: TabMeasurement[] = tabRefs.current.map((tab) => {
      if (!tab) return { left: 0, width: 0 };
      return { left: tab.offsetLeft, width: tab.offsetWidth };
    });
    setMeasurements((prev) => {
      const hasChanged =
        prev.length !== newMeasurements.length ||
        newMeasurements.some((m, i) => prev[i]?.left !== m.left || prev[i]?.width !== m.width);
      return hasChanged ? newMeasurements : prev;
    });
  }, []);

  useLayoutEffect(() => {
    measureTabs();
    document.fonts.ready.then(measureTabs);

    const observer = new ResizeObserver(measureTabs);
    if (containerRef.current) {
      observer.observe(containerRef.current);
    }

    requestAnimationFrame(() => {
      setAnimationEnabled(true);
    });

    return () => observer.disconnect();
  }, [measureTabs]);

  const sliderStyle = useMemo(() => {
    const measurement = measurements[activeIndex];
    if (!measurement || measurement.width === 0) {
      return { opacity: 0 };
    }

    const insetLeft = activeIndex === 0 ? 2 : 0;
    const insetRight = activeIndex === historyTabItems.length - 1 ? 2 : 0;

    return {
      left: `${measurement.left + insetLeft}px`,
      width: `${measurement.width - insetLeft - insetRight}px`,
      opacity: 1,
      transition: animationEnabled ? "left 200ms ease-out, width 200ms ease-out" : "none",
    };
  }, [measurements, activeIndex, animationEnabled, historyTabItems.length]);

  // Check if there's any data at all
  const hasAnyData = seasons.length > 0 || festivals.length > 0 || nominations.length > 0;

  if (!hasAnyData) {
    return (
      <EmptyState
        icon={ClockCounterClockwise}
        title="No history yet"
        message="Completed festivals and past events will appear here."
        variant="inline"
        className={className}
      />
    );
  }

  return (
    <div className={cn("space-y-4", className)}>
      {/* Tabs: Seasons | Festivals | Movies */}
      <div className="w-full">
        <div
          className="rounded-lg overflow-hidden relative w-full"
          style={{
            background: "light-dark(rgba(0,0,0,0.04), rgba(255,255,255,0.1))",
            boxShadow: `
              inset 0 1px 2px 0 light-dark(rgba(0,0,0,0.08), rgba(0,0,0,0.35)),
              0 1px 0 0 light-dark(rgba(255,255,255,0.6), rgba(255,255,255,0.08))
            `,
            border: "1px solid light-dark(rgba(0,0,0,0.06), rgba(255,255,255,0.06))",
          }}
        >
          <div ref={containerRef} className="relative flex items-center h-8">
            {/* Sliding pill */}
            <div
              className="absolute top-[2px] bottom-[2px] pointer-events-none rounded-md"
              style={{
                ...sliderStyle,
                background: `light-dark(
                  linear-gradient(180deg, rgba(255,255,255,1) 0%, rgba(245,245,245,1) 100%),
                  linear-gradient(180deg, rgba(255,255,255,0.28) 0%, rgba(255,255,255,0.16) 100%)
                )`,
                boxShadow: `
                  inset 0 1px 0 0 light-dark(rgba(255,255,255,1), rgba(255,255,255,0.4)),
                  inset 0 -1px 0 0 light-dark(rgba(0,0,0,0.08), rgba(0,0,0,0.3)),
                  0 1px 2px 0 light-dark(rgba(0,0,0,0.15), rgba(0,0,0,0.5)),
                  0 3px 8px 0 light-dark(rgba(0,0,0,0.08), rgba(0,0,0,0.35)),
                  0 0 0 1px light-dark(rgba(0,0,0,0.12), rgba(255,255,255,0.2))
                `,
                willChange: "left, width",
                zIndex: 1,
              }}
            />

            {/* Tab buttons with dividers */}
            {historyTabItems.map((item, index) => {
              const isActive = item.value === activeTab;
              const Icon = item.icon;
              const showDivider = index < historyTabItems.length - 1;

              return (
                <React.Fragment key={item.value}>
                  <button
                    ref={(el) => {
                      tabRefs.current[index] = el;
                    }}
                    type="button"
                    onClick={() => setActiveTab(item.value)}
                    className={cn(
                      "relative z-10 flex-1 h-full flex items-center justify-center gap-2 text-sm font-medium",
                      "transition-colors duration-150",
                      "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)]",
                      isActive
                        ? "text-[var(--text-primary)]"
                        : "text-[var(--text-muted)] hover:text-[var(--text-secondary)]"
                    )}
                  >
                    <Icon className="w-4 h-4" />
                    {item.label}
                  </button>
                  {showDivider && (
                    <div
                      className="w-px h-4 bg-[var(--border)] flex-shrink-0 z-10"
                      aria-hidden="true"
                    />
                  )}
                </React.Fragment>
              );
            })}
          </div>
        </div>

        {/* Seasons Tab */}
        {activeTab === "seasons" && (
          <div className="mt-4 space-y-2">
            {seasons.length > 0 ? (
              <div className="space-y-2">
                {seasons.map((season) => {
                  const isExpanded = expandedSeasonId === season.id;
                  const seasonFestivals = festivals.filter((f) => f.season_id === season.id);

                  return (
                    <div key={season.id}>
                      <button
                        type="button"
                        aria-label={`View festivals in ${season.name}`}
                        onClick={() => setExpandedSeasonId(isExpanded ? null : season.id)}
                        className={cn(
                          "w-full text-left p-3 rounded-lg border transition-colors",
                          isExpanded
                            ? "border-[var(--primary)]/30 bg-[var(--surface-1)]"
                            : "border-[var(--border)] hover:border-[var(--primary)]/30 hover:bg-[var(--surface-1)]"
                        )}
                      >
                        <div className="flex items-center justify-between">
                          <div>
                            <h3 className="font-semibold text-sm text-[var(--text-primary)]">
                              {season.name}
                            </h3>
                            {season.subtitle && (
                              <p className="text-xs text-[var(--text-muted)]">{season.subtitle}</p>
                            )}
                          </div>
                          <div className="flex items-center gap-3">
                            {seasonFestivals.length > 0 && (
                              <span className="text-xs text-[var(--text-muted)]">
                                {seasonFestivals.length} festival
                                {seasonFestivals.length !== 1 ? "s" : ""}
                              </span>
                            )}
                            <span
                              className="text-xs text-[var(--text-muted)]"
                              suppressHydrationWarning
                            >
                              {new Date(season.start_date).toLocaleDateString()} -{" "}
                              {new Date(season.end_date).toLocaleDateString()}
                            </span>
                          </div>
                        </div>
                      </button>

                      {/* Expanded festivals list */}
                      {isExpanded && seasonFestivals.length > 0 && (
                        <div className="ml-4 mt-1 space-y-1 border-l-2 border-[var(--border)] pl-3">
                          {seasonFestivals.map((festival) => (
                            <button
                              key={festival.id}
                              type="button"
                              aria-label={`View results for ${festival.theme || "festival"}`}
                              onClick={() => {
                                if (festival.status === "completed") {
                                  setSelectedFestivalId(festival.id);
                                }
                              }}
                              className={cn(
                                "w-full text-left p-2 rounded-md text-sm transition-colors",
                                festival.status === "completed"
                                  ? "hover:bg-[var(--surface-2)] cursor-pointer"
                                  : "opacity-60"
                              )}
                            >
                              <div className="flex items-center justify-between">
                                <span className="font-medium text-[var(--text-primary)]">
                                  {festival.theme || "Untitled"}
                                </span>
                                <div className="flex items-center gap-2">
                                  <span className="text-xs text-[var(--text-muted)] capitalize">
                                    {festival.status}
                                  </span>
                                  <span
                                    className="text-xs text-[var(--text-muted)]"
                                    suppressHydrationWarning
                                  >
                                    {new Date(festival.start_date).toLocaleDateString()}
                                  </span>
                                </div>
                              </div>
                            </button>
                          ))}
                        </div>
                      )}

                      {isExpanded && seasonFestivals.length === 0 && (
                        <div className="ml-4 mt-1 pl-3 border-l-2 border-[var(--border)]">
                          <p className="text-xs text-[var(--text-muted)] py-2">
                            No festivals in this season
                          </p>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            ) : (
              <EmptyState icon={CalendarBlank} title="No seasons yet" variant="inline" />
            )}
          </div>
        )}

        {/* Festivals Tab */}
        {activeTab === "festivals" && (
          <div className="mt-4 space-y-2">
            {festivals.length > 0 ? (
              <div className="space-y-2">
                {festivals.map((festival) => (
                  <button
                    key={festival.id}
                    type="button"
                    aria-label={`View results for ${festival.theme || "festival"}`}
                    onClick={() => {
                      if (festival.status === "completed") {
                        setSelectedFestivalId(festival.id);
                      }
                    }}
                    className={cn(
                      "w-full text-left p-3 rounded-lg border border-[var(--border)] transition-colors",
                      festival.status === "completed" &&
                        "cursor-pointer hover:border-[var(--primary)]/30 hover:bg-[var(--surface-1)]"
                    )}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex-1 min-w-0">
                        <span className="font-semibold text-sm text-[var(--text-primary)]">
                          {festival.theme}
                        </span>
                        <p className="text-xs text-[var(--text-muted)] capitalize">
                          {festival.status}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="text-xs text-[var(--text-muted)]" suppressHydrationWarning>
                          {new Date(festival.start_date).toLocaleDateString()}
                        </div>
                        {festival.status === "completed" && festival.slug && (
                          <FestivalShareButton
                            festivalSlug={festival.slug}
                            clubSlug={clubSlug}
                            theme={festival.theme || ""}
                          />
                        )}
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            ) : (
              <EmptyState icon={FilmReel} title="No festivals completed yet" variant="inline" />
            )}
          </div>
        )}

        {/* Movies Tab */}
        {activeTab === "movies" && (
          <div className="mt-4 space-y-2">
            {nominations.length > 0 ? (
              <>
                {/* View toggle */}
                <div className="flex justify-end mb-2">
                  <div className="flex items-center rounded-lg border border-[var(--border)] p-0.5">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setViewMode("grid")}
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
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setViewMode("list")}
                      className={cn(
                        "h-7 w-7 p-0 rounded-md",
                        viewMode === "list"
                          ? "bg-[var(--surface-2)] text-[var(--text-primary)]"
                          : "text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-transparent"
                      )}
                      aria-label="List view"
                    >
                      <List className="w-4 h-4" />
                    </Button>
                  </div>
                </div>

                {/* Grid View */}
                {viewMode === "grid" && (
                  <div className="grid grid-cols-4 md:grid-cols-5 gap-1.5">
                    {nominations.map((nomination) => {
                      const movie = nomination.movies;
                      return (
                        <Link
                          key={nomination.id}
                          href={movie?.tmdb_id ? `/movies/${movie.tmdb_id}` : "#"}
                          className="rounded-md border border-[var(--border)] overflow-hidden hover:border-[var(--primary)] transition-colors"
                        >
                          {movie?.poster_url ? (
                            <Image
                              src={movie.poster_url}
                              alt={movie.title || "Movie"}
                              width={200}
                              height={300}
                              className="w-full aspect-[2/3] object-cover"
                            />
                          ) : (
                            <div className="w-full aspect-[2/3] bg-[var(--surface-1)] flex items-center justify-center">
                              <FilmReel className="w-6 h-6 text-[var(--text-muted)]" />
                            </div>
                          )}
                          <div className="p-1">
                            <h3 className="font-semibold text-[10px] md:text-xs text-[var(--text-primary)] line-clamp-1">
                              {movie?.title || "Unknown Movie"}
                            </h3>
                            {movie?.year && (
                              <p className="text-[9px] md:text-[10px] text-[var(--text-muted)]">
                                {movie.year}
                              </p>
                            )}
                          </div>
                        </Link>
                      );
                    })}
                  </div>
                )}

                {/* List View */}
                {viewMode === "list" && (
                  <div className="divide-y divide-[var(--border)] rounded-lg border border-[var(--border)] overflow-hidden">
                    {nominations.map((nomination) => {
                      const movie = nomination.movies;
                      const festival = nomination.festivals;
                      const showFestivalContext =
                        !isEndlessClub && festival?.status === "completed";
                      const genres = movie?.genres?.slice(0, 2);

                      return (
                        <Link
                          key={nomination.id}
                          href={movie?.tmdb_id ? `/movies/${movie.tmdb_id}` : "#"}
                          className="flex gap-3 py-2 px-3 hover:bg-[var(--surface-1)] transition-colors"
                        >
                          {movie?.poster_url ? (
                            <Image
                              src={movie.poster_url}
                              alt={movie.title || "Movie"}
                              width={40}
                              height={60}
                              className="w-10 aspect-[2/3] rounded object-cover flex-shrink-0"
                            />
                          ) : (
                            <div className="w-10 aspect-[2/3] rounded bg-[var(--surface-2)] flex items-center justify-center flex-shrink-0">
                              <FilmReel className="w-4 h-4 text-[var(--text-muted)]" />
                            </div>
                          )}
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-sm text-[var(--text-primary)] line-clamp-1">
                              {movie?.title || "Unknown Movie"}
                              {movie?.year && (
                                <span className="text-[var(--text-muted)] font-normal">
                                  {" "}
                                  ({movie.year})
                                </span>
                              )}
                            </p>
                            {(movie?.director || (genres && genres.length > 0)) && (
                              <p className="text-xs text-[var(--text-muted)] mt-0.5 line-clamp-1">
                                {movie?.director && <span>Dir. {movie.director}</span>}
                                {movie?.director && genres && genres.length > 0 && <span> · </span>}
                                {genres && genres.length > 0 && <span>{genres.join(", ")}</span>}
                              </p>
                            )}
                            {movie?.overview && (
                              <p className="text-xs text-[var(--text-muted)] mt-0.5 line-clamp-2">
                                {movie.overview}
                              </p>
                            )}
                            {showFestivalContext &&
                              (nomination.nominator_name || festival?.theme) && (
                                <p className="text-[10px] text-[var(--text-muted)] mt-1 line-clamp-1">
                                  {nomination.nominator_name && (
                                    <span>Nominated by {nomination.nominator_name}</span>
                                  )}
                                  {nomination.nominator_name && festival?.theme && <span> · </span>}
                                  {festival?.theme && <span>{festival.theme}</span>}
                                </p>
                              )}
                          </div>
                        </Link>
                      );
                    })}
                  </div>
                )}

                {/* Pagination */}
                <div className="mt-4">
                  <PaginationControls
                    currentPage={currentPage}
                    totalPages={totalPages}
                    totalItems={totalItems}
                    pageSize={pageSize}
                    basePath={`/club/${clubSlug}/history`}
                    filterParams="tab=movies"
                    pageSizeOptions={[20, 40, 60, 100]}
                  />
                </div>
              </>
            ) : (
              <EmptyState icon={FilmReel} title="No movies yet" variant="inline" />
            )}
          </div>
        )}
      </div>

      {/* Festival Results Modal */}
      {selectedFestivalId && (
        <FestivalResultsModal
          open={!!selectedFestivalId}
          onOpenChange={(open) => !open && setSelectedFestivalId(null)}
          festivalId={selectedFestivalId}
        />
      )}
    </div>
  );
}
