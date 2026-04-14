"use client";

import React, { useState, useMemo, useRef, useLayoutEffect, useCallback } from "react";
import {
  Clock,
  ClockCounterClockwise,
  CalendarBlank,
  FilmSlate,
  FilmReel,
  List,
  ListBullets,
} from "@phosphor-icons/react";
import { cn } from "@/lib/utils";
import { TimelineItemCard } from "./TimelineItem";
import { type TimelineItem } from "./timeline-utils";
import { FestivalShareButton } from "@/components/festivals";
import Link from "next/link";
import Image from "next/image";

interface TabMeasurement {
  left: number;
  width: number;
}

const mainTabItems = [
  { value: "upcoming", label: "Upcoming", icon: Clock },
  { value: "history", label: "History", icon: ClockCounterClockwise },
] as const;

const historyTabItems = [
  { value: "seasons", label: "Seasons", icon: CalendarBlank },
  { value: "festivals", label: "Festivals", icon: FilmSlate },
  { value: "movies", label: "Movies", icon: FilmReel },
] as const;

export interface Club {
  id: string;
  name: string;
  slug: string;
  picture_url?: string | null;
  settings?: {
    avatar_icon?: string | null;
    avatar_color_index?: number | null;
    avatar_border_color_index?: number | null;
    festival_type?: string | null;
    [key: string]: unknown;
  } | null;
}

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
}

export interface NominationWithMovie {
  id: string;
  movies: {
    title?: string;
    poster_url?: string;
    year?: number;
  } | null;
  festivals: {
    theme?: string;
    start_date?: string;
  } | null;
}

interface UnifiedTimelineViewProps {
  // Timeline data (for Upcoming tab)
  timelineItems: TimelineItem[];
  clubs: Club[];
  mode: "global" | "club";

  // Historical data (for History sub-tabs)
  seasons: Season[];
  festivals: Festival[];
  nominations: NominationWithMovie[];

  // Club context
  clubSlug: string;
  isEndlessClub: boolean;

  // Initial state
  defaultTab?: "upcoming" | "history";
  defaultHistoryTab?: "seasons" | "festivals" | "movies";

  className?: string;
}

export function UnifiedTimelineView({
  timelineItems,
  clubs: _clubs,
  mode,
  seasons,
  festivals,
  nominations,
  clubSlug,
  isEndlessClub: _isEndlessClub,
  defaultTab = "upcoming",
  defaultHistoryTab = "seasons",
  className,
}: UnifiedTimelineViewProps) {
  const [mainTab, setMainTab] = useState<"upcoming" | "history">(defaultTab);
  const [historyTab, setHistoryTab] = useState<"seasons" | "festivals" | "movies">(
    defaultHistoryTab
  );
  const [historyViewMode, setHistoryViewMode] = useState<"tabs" | "timeline">("tabs");
  const [upcomingVisibleCount, setUpcomingVisibleCount] = useState(15);
  const [historyVisibleCount, setHistoryVisibleCount] = useState(15);

  // Main tabs measurement state
  const mainContainerRef = useRef<HTMLDivElement>(null);
  const mainTabRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const [mainMeasurements, setMainMeasurements] = useState<TabMeasurement[]>([]);
  const [mainAnimationEnabled, setMainAnimationEnabled] = useState(false);

  // History tabs measurement state
  const historyContainerRef = useRef<HTMLDivElement>(null);
  const historyTabRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const [historyMeasurements, setHistoryMeasurements] = useState<TabMeasurement[]>([]);
  const [historyAnimationEnabled, setHistoryAnimationEnabled] = useState(false);

  // Get active indices
  const mainActiveIndex = useMemo(() => {
    const idx = mainTabItems.findIndex((item) => item.value === mainTab);
    return idx >= 0 ? idx : 0;
  }, [mainTab]);

  const historyActiveIndex = useMemo(() => {
    const idx = historyTabItems.findIndex((item) => item.value === historyTab);
    return idx >= 0 ? idx : 0;
  }, [historyTab]);

  // Measure main tabs
  const measureMainTabs = useCallback(() => {
    const newMeasurements: TabMeasurement[] = mainTabRefs.current.map((tab) => {
      if (!tab) return { left: 0, width: 0 };
      return { left: tab.offsetLeft, width: tab.offsetWidth };
    });
    setMainMeasurements((prev) => {
      const hasChanged =
        prev.length !== newMeasurements.length ||
        newMeasurements.some((m, i) => prev[i]?.left !== m.left || prev[i]?.width !== m.width);
      return hasChanged ? newMeasurements : prev;
    });
  }, []);

  // Measure history tabs
  const measureHistoryTabs = useCallback(() => {
    const newMeasurements: TabMeasurement[] = historyTabRefs.current.map((tab) => {
      if (!tab) return { left: 0, width: 0 };
      return { left: tab.offsetLeft, width: tab.offsetWidth };
    });
    setHistoryMeasurements((prev) => {
      const hasChanged =
        prev.length !== newMeasurements.length ||
        newMeasurements.some((m, i) => prev[i]?.left !== m.left || prev[i]?.width !== m.width);
      return hasChanged ? newMeasurements : prev;
    });
  }, []);

  // Measure on mount and resize
  useLayoutEffect(() => {
    measureMainTabs();
    document.fonts.ready.then(measureMainTabs);

    const observer = new ResizeObserver(measureMainTabs);
    if (mainContainerRef.current) {
      observer.observe(mainContainerRef.current);
    }

    requestAnimationFrame(() => {
      setMainAnimationEnabled(true);
    });

    return () => observer.disconnect();
  }, [measureMainTabs]);

  useLayoutEffect(() => {
    measureHistoryTabs();
    document.fonts.ready.then(measureHistoryTabs);

    const observer = new ResizeObserver(measureHistoryTabs);
    if (historyContainerRef.current) {
      observer.observe(historyContainerRef.current);
    }

    requestAnimationFrame(() => {
      setHistoryAnimationEnabled(true);
    });

    return () => observer.disconnect();
  }, [measureHistoryTabs]);

  // Calculate main slider position
  const mainSliderStyle = useMemo(() => {
    const measurement = mainMeasurements[mainActiveIndex];
    if (!measurement || measurement.width === 0) {
      return { opacity: 0 };
    }

    const insetLeft = mainActiveIndex === 0 ? 2 : 0;
    const insetRight = mainActiveIndex === mainTabItems.length - 1 ? 2 : 0;

    return {
      left: `${measurement.left + insetLeft}px`,
      width: `${measurement.width - insetLeft - insetRight}px`,
      opacity: 1,
      transition: mainAnimationEnabled ? "left 200ms ease-out, width 200ms ease-out" : "none",
    };
  }, [mainMeasurements, mainActiveIndex, mainAnimationEnabled]);

  // Calculate history slider position
  const historySliderStyle = useMemo(() => {
    const measurement = historyMeasurements[historyActiveIndex];
    if (!measurement || measurement.width === 0) {
      return { opacity: 0 };
    }

    const insetLeft = historyActiveIndex === 0 ? 2 : 0;
    const insetRight = historyActiveIndex === historyTabItems.length - 1 ? 2 : 0;

    return {
      left: `${measurement.left + insetLeft}px`,
      width: `${measurement.width - insetLeft - insetRight}px`,
      opacity: 1,
      transition: historyAnimationEnabled ? "left 200ms ease-out, width 200ms ease-out" : "none",
    };
  }, [historyMeasurements, historyActiveIndex, historyAnimationEnabled]);

  // Separate upcoming and past timeline items
  const { upcomingItems, pastItems } = useMemo(() => {
    const now = new Date();
    const upcoming: TimelineItem[] = [];
    const past: TimelineItem[] = [];

    timelineItems.forEach((item) => {
      const itemDate = new Date(item.date);
      if (itemDate >= now) {
        upcoming.push(item);
      } else {
        past.push(item);
      }
    });

    // Sort upcoming by date ascending (soonest first)
    upcoming.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    // Sort past by date descending (most recent first)
    past.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    return { upcomingItems: upcoming, pastItems: past };
  }, [timelineItems]);

  const showClub = mode === "global";

  return (
    <div className={cn("space-y-4", className)}>
      {/* Primary tabs: Upcoming | History */}
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
          <div ref={mainContainerRef} className="relative flex items-center h-8">
            {/* Sliding pill */}
            <div
              className="absolute top-[2px] bottom-[2px] pointer-events-none rounded-md"
              style={{
                ...mainSliderStyle,
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
            {mainTabItems.map((item, index) => {
              const isActive = item.value === mainTab;
              const Icon = item.icon;
              const showDivider = index < mainTabItems.length - 1;

              return (
                <React.Fragment key={item.value}>
                  <button
                    ref={(el) => {
                      mainTabRefs.current[index] = el;
                    }}
                    type="button"
                    onClick={() => setMainTab(item.value)}
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

        {/* Upcoming Tab Content */}
        {mainTab === "upcoming" && (
          <div className="mt-4">
            {upcomingItems.length > 0 ? (
              <div className="space-y-1">
                {upcomingItems.slice(0, upcomingVisibleCount).map((item, index) => (
                  <TimelineItemCard
                    key={item.id}
                    item={item}
                    isFirst={index === 0}
                    isLast={index === Math.min(upcomingVisibleCount, upcomingItems.length) - 1}
                    showClub={showClub}
                  />
                ))}

                {/* Show more button */}
                {upcomingItems.length > upcomingVisibleCount && (
                  <button
                    onClick={() => setUpcomingVisibleCount((prev) => prev + 10)}
                    className={cn(
                      "w-full py-3 mt-4 text-sm font-medium rounded-lg transition-colors",
                      "text-[var(--text-secondary)] hover:text-[var(--text-primary)]",
                      "bg-[var(--surface-1)] hover:bg-[var(--surface-2)]",
                      "border border-[var(--border)]"
                    )}
                  >
                    Show more ({upcomingItems.length - upcomingVisibleCount} remaining)
                  </button>
                )}
              </div>
            ) : (
              <EmptyState type="upcoming" mode={mode} />
            )}
          </div>
        )}

        {/* History Tab Content */}
        {mainTab === "history" && (
          <div className="mt-4">
            {/* View mode toggle */}
            <div className="flex justify-end mb-4">
              <button
                onClick={() => setHistoryViewMode(historyViewMode === "tabs" ? "timeline" : "tabs")}
                className={cn(
                  "flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-medium transition-colors",
                  "border border-[var(--border)] bg-[var(--surface-1)] hover:bg-[var(--surface-2)]",
                  "text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
                )}
              >
                {historyViewMode === "tabs" ? (
                  <>
                    <ListBullets className="w-4 h-4" />
                    Timeline View
                  </>
                ) : (
                  <>
                    <List className="w-4 h-4" />
                    Category View
                  </>
                )}
              </button>
            </div>

            {historyViewMode === "tabs" ? (
              /* Tabs view: Seasons | Festivals | Movies */
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
                  <div ref={historyContainerRef} className="relative flex items-center h-8">
                    {/* Sliding pill */}
                    <div
                      className="absolute top-[2px] bottom-[2px] pointer-events-none rounded-md"
                      style={{
                        ...historySliderStyle,
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
                      const isActive = item.value === historyTab;
                      const Icon = item.icon;
                      const showDivider = index < historyTabItems.length - 1;

                      return (
                        <React.Fragment key={item.value}>
                          <button
                            ref={(el) => {
                              historyTabRefs.current[index] = el;
                            }}
                            type="button"
                            onClick={() => setHistoryTab(item.value)}
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

                {/* Seasons Sub-tab */}
                {historyTab === "seasons" && (
                  <div className="mt-4 space-y-2">
                    {seasons && seasons.length > 0 ? (
                      <div className="space-y-2">
                        {seasons.map((season) => (
                          <div
                            key={season.id}
                            className="p-3 rounded-lg border border-[var(--border)]"
                          >
                            <div className="flex items-center justify-between">
                              <div>
                                <h3 className="font-semibold text-sm text-[var(--text-primary)]">
                                  {season.name}
                                </h3>
                                {season.subtitle && (
                                  <p className="text-xs text-[var(--text-muted)]">
                                    {season.subtitle}
                                  </p>
                                )}
                              </div>
                              <div
                                className="text-xs text-[var(--text-muted)]"
                                suppressHydrationWarning
                              >
                                {new Date(season.start_date).toLocaleDateString()} -{" "}
                                {new Date(season.end_date).toLocaleDateString()}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="p-6 rounded-lg border border-[var(--border)] text-center text-sm text-[var(--text-muted)]">
                        No seasons yet
                      </div>
                    )}
                  </div>
                )}

                {/* Festivals Sub-tab */}
                {historyTab === "festivals" && (
                  <div className="mt-4 space-y-2">
                    {festivals && festivals.length > 0 ? (
                      <div className="space-y-2">
                        {festivals.map((festival) => (
                          <div
                            key={festival.id}
                            className="p-3 rounded-lg border border-[var(--border)]"
                          >
                            <div className="flex items-center justify-between">
                              <div className="flex-1 min-w-0">
                                <Link
                                  href={`/club/${clubSlug}/festival/${festival.slug}`}
                                  className="font-semibold text-sm text-[var(--text-primary)] hover:text-[var(--primary)] transition-colors"
                                >
                                  {festival.theme}
                                </Link>
                                <p className="text-xs text-[var(--text-muted)] capitalize">
                                  {festival.status}
                                </p>
                              </div>
                              <div className="flex items-center gap-2">
                                <div
                                  className="text-xs text-[var(--text-muted)]"
                                  suppressHydrationWarning
                                >
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
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="p-6 rounded-lg border border-[var(--border)] text-center text-sm text-[var(--text-muted)]">
                        No festivals completed yet
                      </div>
                    )}
                  </div>
                )}

                {/* Movies Sub-tab */}
                {historyTab === "movies" && (
                  <div className="mt-4 space-y-2">
                    {nominations && nominations.length > 0 ? (
                      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                        {nominations.map((nomination) => {
                          const movie = nomination.movies;
                          const festival = nomination.festivals;
                          return (
                            <div
                              key={nomination.id}
                              className="rounded-lg border border-[var(--border)] overflow-hidden"
                            >
                              {movie?.poster_url && (
                                <Image
                                  src={movie.poster_url}
                                  alt={movie.title || "Movie"}
                                  width={200}
                                  height={300}
                                  className="w-full aspect-[2/3] object-cover"
                                />
                              )}
                              <div className="p-2">
                                <h3 className="font-semibold text-xs text-[var(--text-primary)] line-clamp-1">
                                  {movie?.title || "Unknown Movie"}
                                </h3>
                                {movie?.year && (
                                  <p className="text-[10px] text-[var(--text-muted)]">
                                    {movie.year}
                                  </p>
                                )}
                                {festival?.theme && (
                                  <p className="text-[10px] text-[var(--text-muted)] line-clamp-1">
                                    {festival.theme}
                                  </p>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    ) : (
                      <div className="p-6 rounded-lg border border-[var(--border)] text-center text-sm text-[var(--text-muted)]">
                        No movies yet
                      </div>
                    )}
                  </div>
                )}
              </div>
            ) : /* Timeline view: Chronological list of past events */
            pastItems.length > 0 ? (
              <div className="space-y-1">
                {pastItems.slice(0, historyVisibleCount).map((item, index) => (
                  <TimelineItemCard
                    key={item.id}
                    item={item}
                    isFirst={index === 0}
                    isLast={index === Math.min(historyVisibleCount, pastItems.length) - 1}
                    showClub={showClub}
                  />
                ))}

                {/* Show more button */}
                {pastItems.length > historyVisibleCount && (
                  <button
                    onClick={() => setHistoryVisibleCount((prev) => prev + 10)}
                    className={cn(
                      "w-full py-3 mt-4 text-sm font-medium rounded-lg transition-colors",
                      "text-[var(--text-secondary)] hover:text-[var(--text-primary)]",
                      "bg-[var(--surface-1)] hover:bg-[var(--surface-2)]",
                      "border border-[var(--border)]"
                    )}
                  >
                    Show more ({pastItems.length - historyVisibleCount} remaining)
                  </button>
                )}
              </div>
            ) : (
              <EmptyState type="history" mode={mode} />
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function EmptyState({ type, mode }: { type: "upcoming" | "history"; mode: "global" | "club" }) {
  return (
    <div className="py-16 text-center">
      <div className="w-14 h-14 mx-auto mb-5 rounded-full bg-[var(--surface-1)] flex items-center justify-center">
        {type === "upcoming" ? (
          <CalendarBlank className="w-7 h-7 text-[var(--text-muted)]" />
        ) : (
          <ClockCounterClockwise className="w-7 h-7 text-[var(--text-muted)]" />
        )}
      </div>
      <h3 className="font-medium text-lg text-[var(--text-primary)] mb-2">
        {type === "upcoming" ? "No upcoming events" : "No past events"}
      </h3>
      <p className="text-sm text-[var(--text-muted)] max-w-sm mx-auto leading-relaxed">
        {type === "upcoming"
          ? mode === "global"
            ? "Festival deadlines and events from your clubs will appear here."
            : "Festival deadlines and events will appear here when scheduled."
          : mode === "global"
            ? "Your completed festivals and past events will be listed here."
            : "Completed festivals and past events will appear here."}
      </p>
    </div>
  );
}
