"use client";

import React, { useRef, useState, useLayoutEffect, useMemo, useCallback } from "react";
import { cn } from "@/lib/utils";
import { Standings } from "./Standings";
import { PointsDisplay } from "./PointsDisplay";
import { ResultsSummary } from "./ResultsSummary";
import { RatingsTab } from "./RatingsTab";
import { GuessesTab } from "./GuessesTab";
import type {
  NominationWithRelations,
  RatingWithRelations,
  GuessWithRelations,
  MemberForResults,
} from "@/types/results";

interface ResultsData {
  standings?: Array<{
    user_id: string;
    user_name: string;
    points: number;
  }>;
  nominations?: Array<{
    nomination_id: string;
    tmdb_id: number;
    average_rating: number;
    rating_count: number;
    movie_title?: string;
  }>;
}

interface ResultsTabsProps {
  results: ResultsData;
  memberCount: number;
  calculatedAt: string;
  nominations: NominationWithRelations[];
  ratings: RatingWithRelations[];
  guesses: GuessWithRelations[];
  members: MemberForResults[];
}

interface TabMeasurement {
  left: number;
  width: number;
}

const tabItems = [
  { value: "summary", label: "Summary" },
  { value: "ratings", label: "Ratings" },
  { value: "guesses", label: "Guesses" },
] as const;

type TabValue = (typeof tabItems)[number]["value"];

export function ResultsTabs({
  results,
  memberCount,
  calculatedAt,
  nominations,
  ratings,
  guesses,
  members,
}: ResultsTabsProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const tabRefs = useRef<(HTMLButtonElement | null)[]>([]);

  const [activeTab, setActiveTab] = useState<TabValue>("summary");
  const [measurements, setMeasurements] = useState<TabMeasurement[]>([]);
  const [animationEnabled, setAnimationEnabled] = useState(false);

  // Get active index
  const activeIndex = useMemo(() => {
    const idx = tabItems.findIndex((item) => item.value === activeTab);
    return idx >= 0 ? idx : 0;
  }, [activeTab]);

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

  // Calculate slider position with edge insets
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

  return (
    <div className="w-full">
      {/* Tab selector */}
      <div
        className="rounded-lg overflow-hidden relative w-full mb-6"
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
            const isActive = item.value === activeTab;
            const showDivider = index < tabItems.length - 1;

            return (
              <React.Fragment key={item.value}>
                <button
                  ref={(el) => {
                    tabRefs.current[index] = el;
                  }}
                  type="button"
                  onClick={() => setActiveTab(item.value)}
                  className={cn(
                    "relative z-10 flex-1 h-full flex items-center justify-center text-sm font-medium",
                    "transition-colors duration-150",
                    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)]",
                    isActive
                      ? "text-[var(--text-primary)]"
                      : "text-[var(--text-muted)] hover:text-[var(--text-secondary)]"
                  )}
                >
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

      {/* Tab content */}
      {activeTab === "summary" && (
        <div className="space-y-6">
          <div className="rounded-lg bg-white dark:bg-zinc-900 p-6 shadow-lg border border-zinc-200 dark:border-zinc-800">
            <h2 className="text-2xl font-semibold text-zinc-950 dark:text-zinc-50 mb-6">
              Standings
            </h2>
            <Standings entries={results.standings || []} />
          </div>

          <div className="rounded-lg bg-white dark:bg-zinc-900 p-6 shadow-lg border border-zinc-200 dark:border-zinc-800">
            <PointsDisplay breakdown={results.nominations || []} memberCount={memberCount} />
          </div>

          <ResultsSummary memberCount={memberCount} calculatedAt={calculatedAt} />
        </div>
      )}

      {activeTab === "ratings" && (
        <div className="rounded-lg bg-white dark:bg-zinc-900 p-6 shadow-lg border border-zinc-200 dark:border-zinc-800">
          <RatingsTab nominations={nominations} ratings={ratings} members={members} />
        </div>
      )}

      {activeTab === "guesses" && (
        <div className="rounded-lg bg-white dark:bg-zinc-900 p-6 shadow-lg border border-zinc-200 dark:border-zinc-800">
          <GuessesTab nominations={nominations} guesses={guesses} members={members} />
        </div>
      )}
    </div>
  );
}
