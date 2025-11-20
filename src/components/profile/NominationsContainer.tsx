"use client";

import React, { useRef, useState, useLayoutEffect, useMemo, useCallback } from "react";
import { Ticket, ClockCounterClockwise } from "@phosphor-icons/react";
import { cn } from "@/lib/utils";
import { FutureNominations } from "./FutureNominations";
import { PastNominations } from "./PastNominations";
import {
  NominationViewToggle,
  getStoredNominationViewMode,
  setStoredNominationViewMode,
  type NominationViewMode,
} from "./NominationViewToggle";

interface NominationsContainerProps {
  userId: string;
}

interface TabMeasurement {
  left: number;
  width: number;
}

const tabItems = [
  { value: "future", label: "Future", icon: Ticket },
  { value: "past", label: "Past", icon: ClockCounterClockwise },
] as const;

type TabValue = (typeof tabItems)[number]["value"];

export function NominationsContainer({ userId }: NominationsContainerProps) {
  const [activeTab, setActiveTab] = useState<TabValue>("future");
  const [viewMode, setViewMode] = useState<NominationViewMode>(() => getStoredNominationViewMode());
  const containerRef = useRef<HTMLDivElement>(null);
  const tabRefs = useRef<(HTMLButtonElement | null)[]>([]);

  const [measurements, setMeasurements] = useState<TabMeasurement[]>([]);
  const [animationEnabled, setAnimationEnabled] = useState(false);

  const activeIndex = useMemo(() => {
    const idx = tabItems.findIndex((item) => item.value === activeTab);
    return idx >= 0 ? idx : 0;
  }, [activeTab]);

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
    const insetRight = activeIndex === tabItems.length - 1 ? 2 : 0;

    return {
      left: `${measurement.left + insetLeft}px`,
      width: `${measurement.width - insetLeft - insetRight}px`,
      opacity: 1,
      transition: animationEnabled ? "left 200ms ease-out, width 200ms ease-out" : "none",
    };
  }, [measurements, activeIndex, animationEnabled]);

  const handleViewModeChange = useCallback((mode: NominationViewMode) => {
    setViewMode(mode);
    setStoredNominationViewMode(mode);
  }, []);

  return (
    <div className="space-y-4">
      {/* Tabs + View Toggle row */}
      <div className="flex items-center gap-3">
        {/* Sliding glass tabs */}
        <div
          className="relative flex-1 overflow-hidden rounded-lg"
          style={{
            background: "light-dark(rgba(0,0,0,0.04), rgba(255,255,255,0.1))",
            boxShadow: `
            inset 0 1px 2px 0 light-dark(rgba(0,0,0,0.08), rgba(0,0,0,0.35)),
            0 1px 0 0 light-dark(rgba(255,255,255,0.6), rgba(255,255,255,0.08))
          `,
            border: "1px solid light-dark(rgba(0,0,0,0.06), rgba(255,255,255,0.06))",
          }}
        >
          <div ref={containerRef} className="relative flex h-8 items-center">
            {/* Sliding pill */}
            <div
              className="pointer-events-none absolute bottom-[2px] top-[2px] rounded-md"
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
                    onClick={() => setActiveTab(item.value)}
                    className={cn(
                      "relative z-10 flex h-full flex-1 items-center justify-center gap-2 text-sm font-medium",
                      "transition-colors duration-150",
                      "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)]",
                      isActive
                        ? "text-[var(--text-primary)]"
                        : "text-[var(--text-muted)] hover:text-[var(--text-secondary)]"
                    )}
                  >
                    <Icon weight="fill" className="h-4 w-4" />
                    {item.label}
                  </button>
                  {showDivider && (
                    <div
                      className="z-10 h-4 w-px flex-shrink-0 bg-[var(--border)]"
                      aria-hidden="true"
                    />
                  )}
                </React.Fragment>
              );
            })}
          </div>
        </div>

        <NominationViewToggle view={viewMode} onChange={handleViewModeChange} />
      </div>

      {/* Tab content */}
      {activeTab === "future" ? (
        <FutureNominations userId={userId} viewMode={viewMode} />
      ) : (
        <PastNominations userId={userId} viewMode={viewMode} />
      )}
    </div>
  );
}
