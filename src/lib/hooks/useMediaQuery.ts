"use client";

import { useEffect, useState } from "react";

/**
 * Subscribes to a CSS media query. Returns true when the viewport matches.
 *
 * During SSR returns false (initial desktop/mobile resolution happens on mount).
 * Callers that render inside a Radix Portal won't hydrate-flash since portals
 * skip SSR; other callers should handle the first-paint value explicitly.
 */
export function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = useState<boolean>(() => {
    if (typeof window === "undefined") return false;
    return window.matchMedia(query).matches;
  });

  useEffect(() => {
    const mq = window.matchMedia(query);
    const update = () => setMatches(mq.matches);
    update();
    mq.addEventListener("change", update);
    return () => mq.removeEventListener("change", update);
  }, [query]);

  return matches;
}
