"use client";

import React, { useRef, useState, useLayoutEffect, useMemo, useCallback } from "react";
import { User, Ticket } from "@phosphor-icons/react";
import { cn } from "@/lib/utils";
import type { ActivityFilterCategory } from "@/lib/activity/activity-filters";

interface ActivityTabsProps {
  value: ActivityFilterCategory | null;
  onChange: (value: ActivityFilterCategory | null) => void;
}

interface TabMeasurement {
  left: number;
  width: number;
}

const tabItems = [
  { value: "club_activity", label: "Club", icon: Ticket },
  { value: "all", label: "All", icon: null },
  { value: "member_activity", label: "Me", icon: User },
] as const;

export function ActivityTabs({ value, onChange }: ActivityTabsProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const tabRefs = useRef<(HTMLButtonElement | null)[]>([]);

  const [measurements, setMeasurements] = useState<TabMeasurement[]>([]);
  const [animationEnabled, setAnimationEnabled] = useState(false);

  // Get active index from value
  const activeIndex = useMemo(() => {
    const idx = tabItems.findIndex((item) =>
      item.value === "all" ? value === null : item.value === value
    );
    return idx >= 0 ? idx : 1; // Default to 'all' (center)
  }, [value]);

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

    // Enable animation after first render
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

    // Add inset for first and last tabs to pad against container edges
    const insetLeft = activeIndex === 0 ? 2 : 0;
    const insetRight = activeIndex === tabItems.length - 1 ? 2 : 0;

    return {
      left: `${measurement.left + insetLeft}px`,
      width: `${measurement.width - insetLeft - insetRight}px`,
      opacity: 1,
      transition: animationEnabled ? "left 200ms ease-out, width 200ms ease-out" : "none",
    };
  }, [measurements, activeIndex, animationEnabled]);

  const handleTabClick = (item: (typeof tabItems)[number]) => {
    onChange(item.value === "all" ? null : (item.value as ActivityFilterCategory));
  };

  return (
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
      {/* Tab container with slider */}
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
          const isActive = index === activeIndex;
          const Icon = item.icon;
          const showDivider = index < tabItems.length - 1;

          return (
            <React.Fragment key={item.value}>
              <button
                ref={(el) => {
                  tabRefs.current[index] = el;
                }}
                type="button"
                onClick={() => handleTabClick(item)}
                className={cn(
                  "relative z-10 flex-1 h-full flex items-center justify-center gap-2 text-sm font-medium",
                  "transition-colors duration-150",
                  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)]",
                  isActive
                    ? "text-[var(--text-primary)]"
                    : "text-[var(--text-muted)] hover:text-[var(--text-secondary)]"
                )}
              >
                {Icon && <Icon weight="fill" className="w-4 h-4" />}
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
  );
}
