"use client";

import { memo } from "react";
import { ClubMobileNav } from "./ClubMobileNav";

interface ClubMobileNavWrapperProps {
  clubSlug: string;
  themeColor: string | null;
}

/**
 * Wrapper for ClubMobileNav that handles:
 * - Mobile-only visibility (hidden on md+ screens)
 * - Consistent positioning across all club pages
 * - Proper spacing and container styling
 *
 * Placed in layout to persist across page navigations.
 * Memoized to prevent re-renders when props haven't changed.
 */
export const ClubMobileNavWrapper = memo(function ClubMobileNavWrapper({
  clubSlug,
  themeColor,
}: ClubMobileNavWrapperProps) {
  return (
    <div className="md:hidden sticky top-0 z-40 bg-[var(--background)]/95 backdrop-blur-sm border-b border-[var(--border)] py-2">
      <div className="max-w-3xl mx-auto">
        <ClubMobileNav clubSlug={clubSlug} themeColor={themeColor} />
      </div>
    </div>
  );
});
