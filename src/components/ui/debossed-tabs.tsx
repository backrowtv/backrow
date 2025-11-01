"use client";

import * as React from "react";
import { useRef, useEffect, useCallback, useState, useLayoutEffect, useMemo } from "react";
import { cn } from "@/lib/utils";

interface TabMeasurement {
  left: number;
  width: number;
}

interface SliderPosition {
  left: number;
  width: number;
  index: number;
}

interface DebossedTabOption {
  value: string;
  label: string;
  count?: number;
  icon?: React.ComponentType<{ className?: string }>;
}

interface DebossedTabsProps {
  options: DebossedTabOption[];
  value: string;
  onChange: (value: string) => void;
  className?: string;
  /** Makes the tabs container take full width */
  fullWidth?: boolean;
  /** Compact size - reduces height by ~20% */
  compact?: boolean;
}

/**
 * Debossed-style tabs with animated glass pill slider.
 * Creates an inset "tray" effect with a raised slider that moves between options.
 * Similar to iOS/macOS segmented controls.
 */
export function DebossedTabs({
  options,
  value,
  onChange,
  className,
  fullWidth = false,
  compact = false,
}: DebossedTabsProps) {
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const tabRefs = useRef<(HTMLButtonElement | null)[]>([]);

  const [measurements, setMeasurements] = useState<TabMeasurement[]>([]);
  const [displayPosition, setDisplayPosition] = useState<SliderPosition | null>(null);
  const animationEnabledRef = useRef(false);
  const hasMountedRef = useRef(false);

  // Track scroll overflow for edge indicators
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

  // Get active index from value
  const activeIndex = useMemo(() => {
    const idx = options.findIndex((opt) => opt.value === value);
    return idx >= 0 ? idx : 0;
  }, [options, value]);

  // Calculate target position
  const targetPosition = useMemo((): SliderPosition | null => {
    const measurement = measurements[activeIndex];
    if (!measurement || measurement.width === 0) return null;
    return {
      left: measurement.left,
      width: measurement.width,
      index: activeIndex,
    };
  }, [measurements, activeIndex]);

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

  // Update scroll overflow indicators
  const updateScrollIndicators = useCallback(() => {
    const container = scrollContainerRef.current;
    if (!container) return;

    const { scrollLeft, scrollWidth, clientWidth } = container;
    setCanScrollLeft(scrollLeft > 1);
    setCanScrollRight(scrollLeft + clientWidth < scrollWidth - 1);
  }, []);

  // Measure tabs on mount
  useLayoutEffect(() => {
    hasMountedRef.current = true;

    measureTabs();
    updateScrollIndicators();
    document.fonts.ready.then(() => {
      measureTabs();
      updateScrollIndicators();
    });

    const observer = new ResizeObserver(() => {
      measureTabs();
      updateScrollIndicators();
    });
    if (scrollContainerRef.current) {
      observer.observe(scrollContainerRef.current);
    }
    return () => observer.disconnect();
  }, [measureTabs, updateScrollIndicators]);

  // Listen for scroll events
  useEffect(() => {
    const container = scrollContainerRef.current;
    if (!container) return;

    const handleScroll = () => updateScrollIndicators();
    container.addEventListener("scroll", handleScroll, { passive: true });
    return () => container.removeEventListener("scroll", handleScroll);
  }, [updateScrollIndicators]);

  // Update display position when target changes
  useLayoutEffect(() => {
    if (!targetPosition) return;

    setDisplayPosition(targetPosition);

    if (!animationEnabledRef.current) {
      queueMicrotask(() => {
        animationEnabledRef.current = true;
      });
    }
  }, [targetPosition]);

  // Auto-scroll active tab into view
  useEffect(() => {
    const activeTab = tabRefs.current[activeIndex];
    const container = scrollContainerRef.current;
    if (!activeTab || !container) return;

    const tabLeft = activeTab.offsetLeft;
    const tabRight = tabLeft + activeTab.offsetWidth;
    const scrollLeft = container.scrollLeft;
    const containerWidth = container.offsetWidth;

    const isLeftHidden = tabLeft < scrollLeft;
    const isRightHidden = tabRight > scrollLeft + containerWidth;

    if (isLeftHidden) {
      container.scrollTo({ left: Math.max(0, tabLeft - 8), behavior: "smooth" });
    } else if (isRightHidden) {
      container.scrollTo({ left: tabRight - containerWidth + 8, behavior: "smooth" });
    }
  }, [activeIndex]);

  // Check reduced motion preference
  const prefersReducedMotion = useMemo(() => {
    if (typeof window === "undefined") return false;
    return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  }, []);

  const shouldAnimate = animationEnabledRef.current && !prefersReducedMotion;

  return (
    <div className={cn("w-full", className)}>
      <div
        className={cn(
          "rounded-[6px] overflow-hidden backdrop-blur-xl relative",
          fullWidth ? "flex w-full" : "inline-flex max-w-full"
        )}
        style={{
          background: "light-dark(rgba(0,0,0,0.04), rgba(255,255,255,0.1))",
          boxShadow: `
            inset 0 1px 2px 0 light-dark(rgba(0,0,0,0.08), rgba(0,0,0,0.35)),
            0 1px 0 0 light-dark(rgba(255,255,255,0.6), rgba(255,255,255,0.08))
          `,
          border: "1px solid light-dark(rgba(0,0,0,0.06), rgba(255,255,255,0.06))",
        }}
      >
        {/* Left scroll indicator */}
        <div
          className="absolute left-0 top-0 bottom-0 w-5 pointer-events-none z-20 rounded-l-[6px] transition-opacity duration-200"
          style={{
            opacity: canScrollLeft ? 1 : 0,
            background:
              "linear-gradient(to right, light-dark(rgba(0,0,0,0.1), rgba(255,255,255,0.1)) 0%, transparent 100%)",
          }}
          aria-hidden="true"
        />
        {/* Right scroll indicator */}
        <div
          className="absolute right-0 top-0 bottom-0 w-5 pointer-events-none z-20 rounded-r-[6px] transition-opacity duration-200"
          style={{
            opacity: canScrollRight ? 1 : 0,
            background:
              "linear-gradient(to left, light-dark(rgba(0,0,0,0.1), rgba(255,255,255,0.1)) 0%, transparent 100%)",
          }}
          aria-hidden="true"
        />
        <div
          ref={scrollContainerRef}
          className={cn(
            "flex overflow-x-auto overflow-y-hidden scrollbar-hide relative",
            fullWidth && "w-full"
          )}
          style={{
            WebkitOverflowScrolling: "touch",
            scrollbarWidth: "none",
            msOverflowStyle: "none",
          }}
        >
          {/* Glass pill slider */}
          <div
            className="absolute top-[2px] bottom-[2px] pointer-events-none rounded-[4px]"
            style={{
              left: displayPosition
                ? `${displayPosition.left + (displayPosition.index === 0 ? 2 : 0)}px`
                : "2px",
              width: displayPosition
                ? `${displayPosition.width - (displayPosition.index === 0 ? 2 : 0) - (displayPosition.index === options.length - 1 ? 2 : 0)}px`
                : "66px",
              opacity: displayPosition ? 1 : 0,
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
              transition: shouldAnimate ? "left 200ms ease-out, width 200ms ease-out" : "none",
              willChange: "left, width",
              zIndex: 1,
            }}
          />

          {/* Tab buttons */}
          {options.map((option, index) => {
            const isActive = index === activeIndex;

            return (
              <button
                key={option.value}
                ref={(el) => {
                  tabRefs.current[index] = el;
                }}
                onClick={() => onChange(option.value)}
                aria-pressed={isActive}
                className={cn(
                  "px-3 whitespace-nowrap",
                  "inline-flex items-center justify-center gap-1.5",
                  "transition-colors duration-150",
                  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)] focus-visible:ring-offset-1",
                  "relative z-10",
                  fullWidth ? "flex-1 w-full" : "flex-shrink-0",
                  compact ? "h-7 text-[13px]" : "h-9 text-sm",
                  isActive
                    ? "text-[var(--text-primary)] font-semibold"
                    : "text-[var(--text-muted)] font-medium hover:text-[var(--text-secondary)]"
                )}
              >
                {option.icon && <option.icon className="w-4 h-4" />}
                {option.label}
                {option.count !== undefined && (
                  <span
                    className={cn(
                      "text-xs",
                      isActive ? "text-[var(--text-secondary)]" : "text-[var(--text-muted)]"
                    )}
                  >
                    ({option.count})
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
