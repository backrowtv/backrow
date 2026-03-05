"use client";

import { GroupedActivity } from "@/lib/activity/activity-feed";
import { GroupedActivityItem } from "./GroupedActivityItem";
import { Database } from "@/types/database";
import { useMemo, useEffect, useState } from "react";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { shouldShowActivity } from "@/lib/activity/mode-filtering";
import { getTmdbIdFromActivity } from "@/lib/activity/activity-utils";
import { Button } from "@/components/ui/button";
import { CaretLeft, CaretRight, Clock } from "@phosphor-icons/react/dist/ssr";
import { EmptyState } from "@/components/shared/EmptyState";

type Club = Database["public"]["Tables"]["clubs"]["Row"];

interface ActivityFeedWithFiltersProps {
  activities: GroupedActivity[];
  clubMap: Map<string, Club>;
  currentUserId: string;
  userRatedMap: Map<number, boolean>;
  page: number;
  pageSize: number;
  pageSizeOptions: number[];
}

export function ActivityFeedWithFilters({
  activities,
  clubMap,
  currentUserId,
  userRatedMap,
  page,
  pageSize,
  pageSizeOptions,
}: ActivityFeedWithFiltersProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const pathname = usePathname();

  // Track page size in localStorage
  const [_localPageSize, setLocalPageSize] = useState(pageSize);

  useEffect(() => {
    const saved = localStorage.getItem("activityPageSize");
    if (saved) {
      const parsed = parseInt(saved, 10);
      if (pageSizeOptions.includes(parsed) && parsed !== pageSize) {
        // Update URL with saved preference
        updateParams(1, parsed);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- Mount-only: restore saved page size from localStorage
  }, []);

  // Filter activities based on mode-specific rules
  const filteredActivities = useMemo(() => {
    return activities.filter((activity) => {
      if (!activity.club_id) return true;

      const club = clubMap.get(activity.club_id);
      if (!club) return true;

      // Check if activity should be shown based on mode
      if (activity.activities.length > 0) {
        const firstActivity = activity.activities[0];

        // Check if user has rated the specific movie (for Cinephile mode)
        const tmdbId = getTmdbIdFromActivity(firstActivity);
        const userHasRated = tmdbId ? (userRatedMap.get(tmdbId) ?? false) : false;

        return shouldShowActivity(firstActivity, club, userHasRated);
      }

      return true;
    });
  }, [activities, clubMap, userRatedMap]);

  // Calculate pagination
  const totalItems = filteredActivities.length;
  const totalPages = Math.ceil(totalItems / pageSize);
  const startIndex = (page - 1) * pageSize;
  const endIndex = startIndex + pageSize;
  const paginatedActivities = filteredActivities.slice(startIndex, endIndex);

  // Update URL params
  const updateParams = (newPage: number, newPageSize?: number) => {
    const params = new URLSearchParams(searchParams.toString());

    if (newPage > 1) {
      params.set("page", newPage.toString());
    } else {
      params.delete("page");
    }

    const sizeToUse = newPageSize ?? pageSize;
    if (sizeToUse !== 10) {
      params.set("pageSize", sizeToUse.toString());
    } else {
      params.delete("pageSize");
    }

    if (newPageSize) {
      localStorage.setItem("activityPageSize", newPageSize.toString());
      setLocalPageSize(newPageSize);
    }

    const url = params.toString() ? `${pathname}?${params.toString()}` : pathname;
    router.push(url, { scroll: false });
  };

  const handlePageChange = (newPage: number) => {
    if (newPage >= 1 && newPage <= totalPages) {
      updateParams(newPage);
      // Scroll to top of feed
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  };

  const handlePageSizeChange = (newSize: number) => {
    updateParams(1, newSize); // Reset to page 1 when changing page size
  };

  if (filteredActivities.length === 0) {
    return (
      <EmptyState icon={Clock} title="No activity found matching your filters" variant="inline" />
    );
  }

  // Generate page numbers to show
  const getPageNumbers = () => {
    const pages: (number | "ellipsis")[] = [];

    if (totalPages <= 7) {
      for (let i = 1; i <= totalPages; i++) {
        pages.push(i);
      }
    } else {
      pages.push(1);

      if (page > 3) {
        pages.push("ellipsis");
      }

      const start = Math.max(2, page - 1);
      const end = Math.min(totalPages - 1, page + 1);

      for (let i = start; i <= end; i++) {
        pages.push(i);
      }

      if (page < totalPages - 2) {
        pages.push("ellipsis");
      }

      pages.push(totalPages);
    }

    return pages;
  };

  return (
    <div className="divide-y divide-[var(--border)]">
      {paginatedActivities.map((activity, index) => {
        const club = activity.club_id ? clubMap.get(activity.club_id) : null;
        const firstActivity = activity.activities[0];
        const tmdbId = getTmdbIdFromActivity(firstActivity);
        const userHasRated = tmdbId ? (userRatedMap.get(tmdbId) ?? false) : false;

        return (
          <GroupedActivityItem
            key={activity.id}
            activity={activity}
            club={club || undefined}
            currentUserId={currentUserId}
            userHasRated={userHasRated}
            index={index}
          />
        );
      })}

      {/* Pagination Controls */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between pt-6 pb-2 border-t border-[var(--border)] mt-4">
          {/* Page Size Selector */}
          <div className="flex items-center gap-2">
            <span className="text-xs text-[var(--text-muted)]">Show:</span>
            <select
              value={pageSize}
              onChange={(e) => handlePageSizeChange(parseInt(e.target.value, 10))}
              className="h-8 px-2 text-xs rounded-md border border-[var(--border)] bg-[var(--surface-1)] text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--ring)]"
            >
              {pageSizeOptions.map((size) => (
                <option key={size} value={size}>
                  {size}
                </option>
              ))}
            </select>
          </div>

          {/* Page Navigation */}
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => handlePageChange(page - 1)}
              disabled={page === 1}
              className="h-8 w-8 p-0"
            >
              <CaretLeft className="h-4 w-4" />
              <span className="sr-only">Previous page</span>
            </Button>

            <div className="flex items-center gap-1">
              {getPageNumbers().map((pageNum, idx) =>
                pageNum === "ellipsis" ? (
                  <span key={`ellipsis-${idx}`} className="px-1 text-[var(--text-muted)]">
                    ...
                  </span>
                ) : (
                  <button
                    key={pageNum}
                    onClick={() => handlePageChange(pageNum)}
                    className={`h-8 min-w-[2rem] px-2 text-xs font-medium rounded-md transition-colors ${
                      page === pageNum
                        ? "bg-[var(--primary)] text-[var(--primary-foreground)]"
                        : "text-[var(--text-secondary)] hover:bg-[var(--surface-2)] hover:text-[var(--text-primary)]"
                    }`}
                  >
                    {pageNum}
                  </button>
                )
              )}
            </div>

            <Button
              variant="ghost"
              size="sm"
              onClick={() => handlePageChange(page + 1)}
              disabled={page === totalPages}
              className="h-8 w-8 p-0"
            >
              <CaretRight className="h-4 w-4" />
              <span className="sr-only">Next page</span>
            </Button>
          </div>

          {/* Page Info */}
          <span className="text-xs text-[var(--text-muted)] hidden sm:block">
            {startIndex + 1}-{Math.min(endIndex, totalItems)} of {totalItems}
          </span>
        </div>
      )}

      {/* Show count when only one page */}
      {totalPages === 1 && filteredActivities.length > 0 && (
        <div className="flex items-center justify-between pt-4 pb-2 border-t border-[var(--border)] mt-4">
          <div className="flex items-center gap-2">
            <span className="text-xs text-[var(--text-muted)]">Show:</span>
            <select
              value={pageSize}
              onChange={(e) => handlePageSizeChange(parseInt(e.target.value, 10))}
              className="h-8 px-2 text-xs rounded-md border border-[var(--border)] bg-[var(--surface-1)] text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--ring)]"
            >
              {pageSizeOptions.map((size) => (
                <option key={size} value={size}>
                  {size}
                </option>
              ))}
            </select>
          </div>
          <span className="text-xs text-[var(--text-muted)]">
            {totalItems} {totalItems === 1 ? "item" : "items"}
          </span>
        </div>
      )}
    </div>
  );
}
