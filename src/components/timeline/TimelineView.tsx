"use client";

import React, { useState, useMemo, useRef, useLayoutEffect, useCallback } from "react";
import { Clock, ClockCounterClockwise, Funnel, CalendarBlank } from "@phosphor-icons/react";
import { cn } from "@/lib/utils";
import { EmptyState } from "@/components/shared/EmptyState";

interface TabMeasurement {
  left: number;
  width: number;
}

const tabItems = [
  { value: "upcoming", label: "Upcoming", icon: Clock },
  { value: "history", label: "History", icon: ClockCounterClockwise },
] as const;

type TabValue = (typeof tabItems)[number]["value"];
import { TimelineItemCard } from "./TimelineItem";
import { type TimelineItem } from "./timeline-utils";

export interface Club {
  id: string;
  name: string;
  slug: string;
  picture_url?: string | null;
  avatar_icon?: string | null;
  avatar_color_index?: number | null;
  avatar_border_color_index?: number | null;
}

interface TimelineViewProps {
  items: TimelineItem[];
  clubs: Club[];
  mode: "global" | "club";
  className?: string;
}

const INITIAL_ITEMS_LIMIT = 15;
const LOAD_MORE_COUNT = 10;

export function TimelineView({ items, clubs, mode, className }: TimelineViewProps) {
  const [view, setView] = useState<TabValue>("upcoming");
  const [selectedClubId, setSelectedClubId] = useState<string>("all");
  const [visibleCount, setVisibleCount] = useState(INITIAL_ITEMS_LIMIT);

  // Tab measurement state
  const containerRef = useRef<HTMLDivElement>(null);
  const tabRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const [measurements, setMeasurements] = useState<TabMeasurement[]>([]);
  const [animationEnabled, setAnimationEnabled] = useState(false);

  // Get active index
  const activeIndex = useMemo(() => {
    const idx = tabItems.findIndex((item) => item.value === view);
    return idx >= 0 ? idx : 0;
  }, [view]);

  // Measure tabs
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

  // Measure on mount and resize
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

  // Calculate slider position
  const sliderStyle = useMemo(() => {
    const measurement = measurements[activeIndex];
    if (!measurement || measurement.width === 0) {
      return { opacity: 0 };
    }

    const insetLeft = activeIndex === 0 ? 2 : 0;
    const insetRight = activeIndex === tabItems.length - 1 ? 2 : 0;

    return {
      left: `${measurement.left + insetLeft}px`,
      width: `${measurement.width - insetLeft - insetRight}px`,
      opacity: 1,
      transition: animationEnabled ? "left 200ms ease-out, width 200ms ease-out" : "none",
    };
  }, [measurements, activeIndex, animationEnabled]);

  // Filter items by selected club
  const filteredItems = useMemo(() => {
    let filtered = items;
    if (selectedClubId !== "all") {
      filtered = items.filter((item) => item.clubId === selectedClubId);
    }
    return filtered;
  }, [items, selectedClubId]);

  // Separate upcoming and past items
  const { upcomingItems, pastItems } = useMemo(() => {
    const now = new Date();
    const upcoming: TimelineItem[] = [];
    const past: TimelineItem[] = [];

    filteredItems.forEach((item) => {
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
  }, [filteredItems]);

  // Reset visible count when view or filter changes
  React.useEffect(() => {
    setVisibleCount(INITIAL_ITEMS_LIMIT);
  }, [view, selectedClubId]);

  const allDisplayItems = view === "upcoming" ? upcomingItems : pastItems;
  const displayItems = allDisplayItems.slice(0, visibleCount);
  const hasMore = allDisplayItems.length > visibleCount;
  const showClub = mode === "global";

  return (
    <div className={cn("space-y-6", className)}>
      {/* Tabs with sliding animation */}
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
          {tabItems.map((item, index) => {
            const isActive = item.value === view;
            const Icon = item.icon;
            const showDivider = index < tabItems.length - 1;

            return (
              <React.Fragment key={item.value}>
                <button
                  ref={(el) => {
                    tabRefs.current[index] = el;
                  }}
                  type="button"
                  onClick={() => setView(item.value)}
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

      {/* Club Filter (Global Mode Only) */}
      {mode === "global" && clubs.length > 1 && (
        <div className="flex items-center gap-2">
          <Funnel className="w-4 h-4 text-[var(--text-muted)]" />
          <select
            value={selectedClubId}
            onChange={(e) => setSelectedClubId(e.target.value)}
            className={cn(
              "h-8 text-sm rounded-full px-3 pr-8",
              "border border-[var(--border)] bg-[var(--surface-1)]",
              "text-[var(--text-primary)]",
              "focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/20 focus:border-[var(--primary)]",
              "appearance-none cursor-pointer"
            )}
            style={{
              backgroundImage: `url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3e%3cpath stroke='%236b7280' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='m6 8 4 4 4-4'/%3e%3c/svg%3e")`,
              backgroundPosition: "right 0.5rem center",
              backgroundRepeat: "no-repeat",
              backgroundSize: "1.25rem 1.25rem",
            }}
          >
            <option value="all">All Clubs</option>
            {clubs.map((club) => (
              <option key={club.id} value={club.id}>
                {club.name}
              </option>
            ))}
          </select>
        </div>
      )}

      {/* Timeline Items */}
      {displayItems.length > 0 ? (
        <div className="space-y-1">
          {displayItems.map((item, index) => (
            <TimelineItemCard
              key={item.id}
              item={item}
              isFirst={index === 0}
              isLast={index === displayItems.length - 1}
              showClub={showClub}
            />
          ))}

          {/* Show more button */}
          {hasMore && (
            <button
              onClick={() => setVisibleCount((prev) => prev + LOAD_MORE_COUNT)}
              className={cn(
                "w-full py-3 mt-4 text-sm font-medium rounded-lg transition-colors",
                "text-[var(--text-secondary)] hover:text-[var(--text-primary)]",
                "bg-[var(--surface-1)] hover:bg-[var(--surface-2)]",
                "border border-[var(--border)]"
              )}
            >
              Show more ({allDisplayItems.length - visibleCount} remaining)
            </button>
          )}
        </div>
      ) : (
        <TimelineEmptyState type={view} mode={mode} />
      )}
    </div>
  );
}

function TimelineEmptyState({
  type,
  mode,
}: {
  type: "upcoming" | "history";
  mode: "global" | "club";
}) {
  const icon = type === "upcoming" ? CalendarBlank : ClockCounterClockwise;
  const title = type === "upcoming" ? "No upcoming events" : "No past events";
  const message =
    type === "upcoming"
      ? mode === "global"
        ? "Festival deadlines and events from your clubs will appear here."
        : "Festival deadlines and events will appear here when scheduled."
      : mode === "global"
        ? "Your completed festivals and past events will be listed here."
        : "Completed festivals and past events will appear here.";

  return <EmptyState icon={icon} title={title} message={message} variant="inline" />;
}
