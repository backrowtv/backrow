"use client";

import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { useCallback, useEffect, useState, useRef } from "react";
import {
  ClubViewToggle,
  type ClubViewMode,
  getStoredViewMode,
  setStoredViewMode,
} from "@/components/clubs/ClubViewToggle";

interface ClubViewToggleWrapperProps {
  initialView: ClubViewMode;
}

export function ClubViewToggleWrapper({ initialView }: ClubViewToggleWrapperProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const pathname = usePathname();
  // Always start with initialView to match server render, then sync with localStorage after hydration
  const [view, setView] = useState<ClubViewMode>(initialView);

  const hasInitialized = useRef(false);

  // Sync with localStorage after hydration (only once)
  useEffect(() => {
    if (hasInitialized.current) return;
    hasInitialized.current = true;

    const urlView = searchParams.get("view");
    if (!urlView) {
      // Check localStorage for stored preference
      const storedView = getStoredViewMode();
      if (storedView !== initialView) {
        setView(storedView);
        // Update URL to match stored preference
        const params = new URLSearchParams(searchParams.toString());
        params.set("view", storedView);
        router.replace(`${pathname}?${params.toString()}`, { scroll: false });
      }
    }
  }, [initialView, pathname, router, searchParams]);

  const handleViewChange = useCallback(
    (newView: ClubViewMode) => {
      setView(newView);
      setStoredViewMode(newView);

      const params = new URLSearchParams(searchParams.toString());
      params.set("view", newView);
      router.replace(`${pathname}?${params.toString()}`, { scroll: false });
    },
    [pathname, router, searchParams]
  );

  return <ClubViewToggle view={view} onChange={handleViewChange} />;
}
