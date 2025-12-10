"use client";

import { useRef, useEffect, useCallback, useState, useLayoutEffect, useMemo, memo } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

interface ClubMobileNavProps {
  clubSlug: string;
  themeColor: string | null;
  className?: string;
}

interface TabMeasurement {
  left: number;
  width: number;
}

interface SliderPosition {
  left: number;
  width: number;
  index: number; // Store index to calculate edge insets consistently
}

const navItems = [
  { href: "", label: "Overview" },
  { href: "/discuss", label: "Discuss" },
  { href: "/stats", label: "Stats" },
  { href: "/events", label: "Events" },
  { href: "/history", label: "History" },
  { href: "/display-case", label: "Display Case" },
  { href: "/polls", label: "Polls" },
  { href: "/members", label: "Members" },
];

// Global cache that persists across component remounts
const globalNavCache = new Map<
  string,
  {
    measurements: TabMeasurement[];
    lastPosition: SliderPosition | null;
  }
>();

/**
 * Mobile-only horizontal scrollable navigation for club pages.
 * Uses global cache to persist state and enable animations across remounts.
 */
export const ClubMobileNav = memo(function ClubMobileNav({
  clubSlug,
  className,
}: ClubMobileNavProps) {
  const pathname = usePathname();
  const basePath = `/club/${clubSlug}`;
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const tabRefs = useRef<(HTMLAnchorElement | null)[]>([]);

  // Get cached data once at mount
  const cachedDataRef = useRef(globalNavCache.get(clubSlug));
  const cachedData = cachedDataRef.current;

  // Initialize from cache
  const [measurements, setMeasurements] = useState<TabMeasurement[]>(
    cachedData?.measurements || []
  );

  // Start at cached position (will animate from here to target)
  const [displayPosition, setDisplayPosition] = useState<SliderPosition | null>(
    cachedData?.lastPosition || null
  );

  // Track if animation should be enabled - enable immediately if we have cache
  const animationEnabledRef = useRef(!!cachedData?.lastPosition);

  // Track if we've mounted (for showing slider)
  const hasMountedRef = useRef(false);

  // Track scroll overflow for edge indicators
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

  // Optimistic index for immediate visual feedback on tap
  const [optimisticIndex, setOptimisticIndex] = useState<number | null>(null);

  // Determine active tab from URL
  const urlActiveIndex = useMemo(() => {
    for (let i = navItems.length - 1; i >= 0; i--) {
      const item = navItems[i];
      const fullPath = item.href ? `${basePath}${item.href}` : basePath;
      if (item.href === "") {
        if (pathname === basePath) return i;
      } else {
        if (pathname.startsWith(fullPath)) return i;
      }
    }
    return 0;
  }, [pathname, basePath]);

  // Use optimistic index for immediate feedback, fall back to URL-based index
  const activeIndex = optimisticIndex ?? urlActiveIndex;

  // Clear optimistic index once URL catches up
  useEffect(() => {
    if (optimisticIndex !== null && urlActiveIndex === optimisticIndex) {
      setOptimisticIndex(null);
    }
  }, [urlActiveIndex, optimisticIndex]);

  // Handle immediate tab click - move slider before navigation
  const handleTabClick = useCallback((index: number) => {
    // Enable animation and set optimistic index immediately
    animationEnabledRef.current = true;
    setOptimisticIndex(index);
  }, []);

  // Calculate target position - use actual left edge, not center
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

  // Measure tabs on mount - use useLayoutEffect to run synchronously before paint
  useLayoutEffect(() => {
    hasMountedRef.current = true;

    // Measure immediately, then again after fonts load for accuracy
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

  // Listen for scroll events to update indicators
  useEffect(() => {
    const container = scrollContainerRef.current;
    if (!container) return;

    const handleScroll = () => updateScrollIndicators();
    container.addEventListener("scroll", handleScroll, { passive: true });
    return () => container.removeEventListener("scroll", handleScroll);
  }, [updateScrollIndicators]);

  // Update display position when target changes - use useLayoutEffect for synchronous updates
  useLayoutEffect(() => {
    if (!targetPosition) return;

    // Update position immediately (CSS transition handles animation)
    setDisplayPosition(targetPosition);

    // Enable animation after first position is set
    if (!animationEnabledRef.current) {
      // Use microtask to enable animation after this render cycle completes
      queueMicrotask(() => {
        animationEnabledRef.current = true;
      });
    }

    // Update cache
    globalNavCache.set(clubSlug, {
      measurements,
      lastPosition: targetPosition,
    });
  }, [targetPosition, clubSlug, measurements]);

  // Auto-scroll active tab into view - ONLY if not fully visible
  useEffect(() => {
    const activeTab = tabRefs.current[activeIndex];
    const container = scrollContainerRef.current;
    if (!activeTab || !container) return;

    const tabLeft = activeTab.offsetLeft;
    const tabRight = tabLeft + activeTab.offsetWidth;
    const scrollLeft = container.scrollLeft;
    const containerWidth = container.offsetWidth;

    // Only scroll if tab is actually outside visible area
    const isLeftHidden = tabLeft < scrollLeft;
    const isRightHidden = tabRight > scrollLeft + containerWidth;

    if (isLeftHidden) {
      // Tab's left edge is hidden - scroll to show it with small margin
      container.scrollTo({ left: Math.max(0, tabLeft - 8), behavior: "smooth" });
    } else if (isRightHidden) {
      // Tab's right edge is hidden - scroll to show it with small margin
      container.scrollTo({ left: tabRight - containerWidth + 8, behavior: "smooth" });
    }
    // If tab is fully visible, don't scroll at all
  }, [activeIndex]);

  // Check reduced motion preference
  const prefersReducedMotion = useMemo(() => {
    if (typeof window === "undefined") return false;
    return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  }, []);

  const shouldAnimate = animationEnabledRef.current && !prefersReducedMotion;

  return (
    <nav aria-label="Club navigation" className={cn("w-full px-4", className)}>
      <div
        className="rounded-[6px] overflow-hidden inline-flex max-w-full backdrop-blur-xl relative"
        style={{
          // De-bossed effect: inverted colors (darker in light mode, lighter in dark mode)
          // Creates an inset "tray" that the glass slider sits inside
          background: "light-dark(rgba(0,0,0,0.04), rgba(255,255,255,0.1))",
          boxShadow: `
            inset 0 1px 2px 0 light-dark(rgba(0,0,0,0.08), rgba(0,0,0,0.35)),
            0 1px 0 0 light-dark(rgba(255,255,255,0.6), rgba(255,255,255,0.08))
          `,
          border: "1px solid light-dark(rgba(0,0,0,0.06), rgba(255,255,255,0.06))",
        }}
      >
        {/* Left scroll indicator - subtle fade */}
        <div
          className="absolute left-0 top-0 bottom-0 w-5 pointer-events-none z-20 rounded-l-[6px] transition-opacity duration-200"
          style={{
            opacity: canScrollLeft ? 1 : 0,
            background:
              "linear-gradient(to right, light-dark(rgba(0,0,0,0.1), rgba(255,255,255,0.1)) 0%, transparent 100%)",
          }}
          aria-hidden="true"
        />
        {/* Right scroll indicator - subtle fade */}
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
          className="flex overflow-x-auto overflow-y-hidden scrollbar-hide relative"
          style={{
            WebkitOverflowScrolling: "touch",
            scrollbarWidth: "none",
            msOverflowStyle: "none",
          }}
        >
          {/* Glass pill slider - raised element sitting inside de-bossed tray */}
          <div
            className="absolute top-[2px] bottom-[2px] pointer-events-none rounded-[4px]"
            style={{
              // Use stored index for edge insets to prevent snap on URL catch-up
              left: displayPosition
                ? `${displayPosition.left + (displayPosition.index === 0 ? 2 : 0)}px`
                : "2px",
              width: displayPosition
                ? `${displayPosition.width - (displayPosition.index === 0 ? 2 : 0) - (displayPosition.index === navItems.length - 1 ? 2 : 0)}px`
                : "66px",
              opacity: displayPosition ? 1 : 0,
              // Raised glass effect - bold and defined
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

          {/* Tab links */}
          {navItems.map((item, index) => {
            const isActive = index === activeIndex;
            const fullHref = item.href ? `${basePath}${item.href}` : basePath;
            const showSeparator = index < navItems.length - 1;

            return (
              <div key={item.href} className="flex items-center flex-shrink-0">
                <Link
                  ref={(el) => {
                    tabRefs.current[index] = el;
                  }}
                  href={fullHref}
                  prefetch={true}
                  onClick={() => handleTabClick(index)}
                  aria-current={isActive ? "page" : undefined}
                  className={cn(
                    "flex-shrink-0 h-7 px-3 text-sm whitespace-nowrap",
                    "inline-flex items-center justify-center",
                    "transition-colors duration-150",
                    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)] focus-visible:ring-offset-1",
                    "relative z-10",
                    isActive
                      ? "text-[var(--text-primary)] font-semibold"
                      : "text-[var(--text-muted)] font-medium hover:text-[var(--text-secondary)]"
                  )}
                >
                  {item.label}
                </Link>
                {showSeparator && (
                  <div className="flex-shrink-0 w-px h-3 bg-[var(--border)]" aria-hidden="true" />
                )}
              </div>
            );
          })}
        </div>
      </div>
    </nav>
  );
});
