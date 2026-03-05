"use client";

import React, { useRef, useState, useLayoutEffect, useMemo, useCallback } from "react";
import { Bug, Lightbulb } from "@phosphor-icons/react";
import { cn } from "@/lib/utils";
import { FeedbackPool } from "./FeedbackPool";
import type { FeedbackItemWithUser } from "@/app/actions/feedback.types";

interface FeedbackTabsProps {
  bugItems: FeedbackItemWithUser[];
  featureItems: FeedbackItemWithUser[];
  userVotes: Set<string>;
  currentUserId: string | null;
  isAdmin: boolean;
}

interface TabMeasurement {
  left: number;
  width: number;
}

const tabItems = [
  { value: "bugs", label: "Bug Reports", icon: Bug },
  { value: "features", label: "Features", icon: Lightbulb },
] as const;

type TabValue = (typeof tabItems)[number]["value"];

export function FeedbackTabs({
  bugItems,
  featureItems,
  userVotes,
  currentUserId,
  isAdmin,
}: FeedbackTabsProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const tabRefs = useRef<(HTMLButtonElement | null)[]>([]);

  const [activeTab, setActiveTab] = useState<TabValue>("bugs");
  const [measurements, setMeasurements] = useState<TabMeasurement[]>([]);
  const [animationEnabled, setAnimationEnabled] = useState(false);

  // Get active index
  const activeIndex = useMemo(() => {
    const idx = tabItems.findIndex((item) => item.value === activeTab);
    return idx >= 0 ? idx : 0;
  }, [activeTab]);

  // Get count for each tab
  const getCounts = (value: TabValue) => {
    return value === "bugs" ? bugItems.length : featureItems.length;
  };

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
            const isActive = item.value === activeTab;
            const Icon = item.icon;
            const showDivider = index < tabItems.length - 1;
            const count = getCounts(item.value);

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
                  {count > 0 && (
                    <span
                      className={cn(
                        "text-xs px-1.5 py-0.5 rounded-full",
                        isActive
                          ? "bg-[var(--surface-3)] text-[var(--text-primary)] font-semibold"
                          : "bg-[var(--surface-2)] text-[var(--text-muted)]"
                      )}
                    >
                      {count}
                    </span>
                  )}
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
      {activeTab === "bugs" && (
        <div className="mt-4">
          <FeedbackPool
            items={bugItems}
            type="bug"
            userVotes={userVotes}
            currentUserId={currentUserId}
            isAdmin={isAdmin}
          />
        </div>
      )}

      {activeTab === "features" && (
        <div className="mt-4">
          <FeedbackPool
            items={featureItems}
            type="feature"
            userVotes={userVotes}
            currentUserId={currentUserId}
            isAdmin={isAdmin}
          />
        </div>
      )}
    </div>
  );
}
