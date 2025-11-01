"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import { ArrowsClockwise } from "@phosphor-icons/react";
import { cn } from "@/lib/utils";

/**
 * Pull-to-refresh component for PWA standalone mode.
 *
 * This component enables the native-like pull-to-refresh gesture
 * when the app is installed as a PWA. It only activates when:
 * 1. Running in standalone/fullscreen mode (installed PWA)
 * 2. User is at the top of the page (scrollY === 0)
 * 3. User pulls down with touch gesture
 *
 * The refresh threshold is 80px of pull distance.
 */
export function PullToRefresh() {
  const router = useRouter();
  const [_isPulling, setIsPulling] = useState(false);
  const [pullDistance, setPullDistance] = useState(0);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);

  const startY = useRef(0);
  const currentY = useRef(0);
  const isPullingRef = useRef(false);

  const REFRESH_THRESHOLD = 80;
  const MAX_PULL = 120;

  // Check if running as installed PWA
  useEffect(() => {
    const checkStandalone = () => {
      const isStandaloneMode =
        window.matchMedia("(display-mode: standalone)").matches ||
        window.matchMedia("(display-mode: fullscreen)").matches ||
        // iOS Safari standalone check
        ("standalone" in window.navigator &&
          (window.navigator as Navigator & { standalone?: boolean }).standalone === true);

      setIsStandalone(isStandaloneMode);
    };

    checkStandalone();

    // Listen for display mode changes
    const mediaQuery = window.matchMedia("(display-mode: standalone)");
    mediaQuery.addEventListener("change", checkStandalone);

    return () => {
      mediaQuery.removeEventListener("change", checkStandalone);
    };
  }, []);

  const handleTouchStart = useCallback(
    (e: TouchEvent) => {
      // Only enable pull-to-refresh when at the top of the page
      if (window.scrollY !== 0) return;
      if (isRefreshing) return;

      startY.current = e.touches[0].clientY;
      isPullingRef.current = true;
    },
    [isRefreshing]
  );

  const handleTouchMove = useCallback((e: TouchEvent) => {
    if (!isPullingRef.current) return;
    if (window.scrollY !== 0) {
      // User started scrolling down, cancel pull-to-refresh
      isPullingRef.current = false;
      setIsPulling(false);
      setPullDistance(0);
      return;
    }

    currentY.current = e.touches[0].clientY;
    const diff = currentY.current - startY.current;

    if (diff > 0) {
      // Prevent default to stop browser's native pull-to-refresh on some devices
      e.preventDefault();

      // Apply resistance to the pull
      const resistance = 0.5;
      const pullAmount = Math.min(diff * resistance, MAX_PULL);

      setIsPulling(true);
      setPullDistance(pullAmount);
    }
  }, []);

  const handleTouchEnd = useCallback(() => {
    if (!isPullingRef.current) return;

    isPullingRef.current = false;

    if (pullDistance >= REFRESH_THRESHOLD) {
      // Trigger refresh
      setIsRefreshing(true);
      setPullDistance(REFRESH_THRESHOLD); // Hold at threshold while refreshing

      // Perform the refresh
      setTimeout(() => {
        router.refresh();
        // Reset state after refresh
        setIsRefreshing(false);
        setIsPulling(false);
        setPullDistance(0);
      }, 300); // Small delay for visual feedback
    } else {
      // Not enough pull, reset
      setIsPulling(false);
      setPullDistance(0);
    }
  }, [pullDistance, router]);

  // Attach touch event listeners
  useEffect(() => {
    if (!isStandalone) return;

    // Use passive: false to allow preventDefault on touchmove
    document.addEventListener("touchstart", handleTouchStart, { passive: true });
    document.addEventListener("touchmove", handleTouchMove, { passive: false });
    document.addEventListener("touchend", handleTouchEnd, { passive: true });

    return () => {
      document.removeEventListener("touchstart", handleTouchStart);
      document.removeEventListener("touchmove", handleTouchMove);
      document.removeEventListener("touchend", handleTouchEnd);
    };
  }, [isStandalone, handleTouchStart, handleTouchMove, handleTouchEnd]);

  // Don't render anything if not in standalone mode
  if (!isStandalone) return null;

  const progress = Math.min(pullDistance / REFRESH_THRESHOLD, 1);
  const rotation = progress * 180;
  const opacity = Math.min(progress * 1.5, 1);

  return (
    <div
      className={cn(
        "fixed left-0 right-0 flex justify-center pointer-events-none z-[100]",
        "transition-transform duration-200 ease-out"
      )}
      style={{
        top: 0,
        transform: `translateY(${pullDistance - 40}px)`,
      }}
    >
      <div
        className={cn(
          "flex items-center justify-center",
          "w-10 h-10 rounded-full",
          "bg-[var(--background)] border border-[var(--border)]",
          "shadow-lg",
          isRefreshing && "animate-pulse"
        )}
        style={{ opacity }}
      >
        <ArrowsClockwise
          className={cn("w-5 h-5 text-[var(--primary)]", isRefreshing && "animate-spin")}
          weight="bold"
          style={{
            transform: isRefreshing ? undefined : `rotate(${rotation}deg)`,
            transition: isRefreshing ? undefined : "transform 0.1s ease-out",
          }}
        />
      </div>
    </div>
  );
}
