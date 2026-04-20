"use client";

import { useState, useRef } from "react";
import { CaretRight } from "@phosphor-icons/react";
import { motion, AnimatePresence } from "framer-motion";
import { ThemePool } from "./ThemePool";
import { cn } from "@/lib/utils";
import { useClubPreference } from "@/lib/hooks/useClubPreferences";
import { Skeleton } from "@/components/ui/skeleton";
import type { Database } from "@/types/database";

type ThemeRow = Database["public"]["Tables"]["theme_pool"]["Row"];
type Theme = ThemeRow & {
  added_by_user?: {
    id: string;
    display_name: string | null;
    username: string | null;
    avatar_url: string | null;
  } | null;
};

type SortOption = "new" | "top" | "old";
type VotesMap = Record<string, { upvotes: number; userVote: "upvote" | null }>;

interface CollapsibleThemePoolProps {
  themes: Theme[];
  clubId: string;
  canManage?: boolean;
  themeSubmissionsLocked?: boolean;
  themeVotingEnabled?: boolean;
  /** Start expanded or collapsed - defaults to collapsed */
  defaultExpanded?: boolean;
  /** Current user ID to determine theme ownership */
  currentUserId?: string;
  /** Pre-fetched votes to avoid resort on expand */
  initialVotes?: VotesMap;
}

export function CollapsibleThemePool({
  themes,
  clubId,
  canManage = false,
  themeSubmissionsLocked = false,
  themeVotingEnabled = false,
  defaultExpanded = false,
  currentUserId,
  initialVotes,
}: CollapsibleThemePoolProps) {
  const [isExpanded, setIsExpanded, hasHydrated] = useClubPreference(
    clubId,
    "themePoolExpanded",
    defaultExpanded
  );
  const [sortBy, setSortBy] = useClubPreference<SortOption>(clubId, "themePoolSort", "top");
  const [showOnlyMine, setShowOnlyMine] = useState(false);
  // Track if user has toggled - if not, skip animation on initial render when restoring from localStorage
  const hasInteracted = useRef(false);

  const unusedCount = themes.filter((t) => !t.is_used).length;

  // Skip animation if expanded from localStorage and user hasn't toggled yet
  const shouldAnimate = hasInteracted.current || !hasHydrated;

  const handleToggle = () => {
    hasInteracted.current = true;
    setIsExpanded(!isExpanded);
  };

  return (
    <div>
      <button
        onClick={handleToggle}
        className="w-full group flex items-center justify-between py-2 gap-2"
      >
        <h3 className="text-sm font-semibold text-[var(--club-accent,var(--text-primary))] uppercase tracking-wide flex items-center gap-2 whitespace-nowrap">
          Theme Pool
          {unusedCount > 0 && (
            <span
              className="px-2 py-0.5 rounded-full font-medium text-sm"
              style={{
                background: "var(--surface-2)",
                color: "var(--text-secondary)",
              }}
            >
              {unusedCount}
            </span>
          )}
        </h3>
        <motion.div
          animate={{ rotate: isExpanded ? 90 : 0 }}
          transition={{ duration: 0.2, ease: "easeOut" }}
        >
          <CaretRight className="h-5 w-5 text-[var(--text-muted)] group-hover:text-[var(--text-primary)] transition-colors" />
        </motion.div>
      </button>

      <AnimatePresence initial={false}>
        {isExpanded && (
          <motion.div
            key="theme-pool-content"
            initial={shouldAnimate ? { height: 0, opacity: 0 } : false}
            animate={{
              height: "auto",
              opacity: 1,
              transition: shouldAnimate
                ? {
                    height: { duration: 0.3, ease: [0.04, 0.62, 0.23, 0.98] },
                    opacity: { duration: 0.25, delay: 0.05 },
                  }
                : { duration: 0 },
            }}
            exit={{
              height: 0,
              opacity: 0,
              transition: {
                height: { duration: 0.25, ease: [0.04, 0.62, 0.23, 0.98] },
                opacity: { duration: 0.15 },
              },
            }}
            className="overflow-hidden"
          >
            <div className="rounded-lg bg-[var(--surface-1)]/50 p-3 mt-1">
              {/* Filter and sort controls - inside expanded area */}
              {unusedCount > 0 && (
                <div className="flex items-center justify-between py-1">
                  <div>
                    {currentUserId && (
                      <button
                        onClick={() => setShowOnlyMine((v) => !v)}
                        className={cn(
                          "px-2.5 py-1 text-xs font-medium rounded-md transition-all",
                          showOnlyMine
                            ? "bg-[var(--primary)] text-[var(--primary-foreground)] shadow-sm"
                            : "text-[var(--text-muted)] hover:text-[var(--text-primary)]"
                        )}
                      >
                        My Themes
                      </button>
                    )}
                  </div>
                  {themeVotingEnabled && (
                    <div className="flex items-center gap-0.5">
                      {(["new", "top", "old"] as SortOption[]).map((sort) => (
                        <button
                          key={sort}
                          onClick={() => setSortBy(sort)}
                          className={cn(
                            "px-2 py-0.5 text-xs font-medium rounded transition-colors capitalize",
                            sortBy === sort
                              ? "bg-[var(--surface-2)] text-[var(--text-primary)]"
                              : "text-[var(--text-muted)] hover:text-[var(--text-primary)]"
                          )}
                        >
                          {sort}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}
              <ThemePool
                themes={themes}
                clubId={clubId}
                canManage={canManage}
                themeSubmissionsLocked={themeSubmissionsLocked}
                themeVotingEnabled={themeVotingEnabled}
                variant="minimal"
                sortBy={sortBy}
                hideSort
                currentUserId={currentUserId}
                showOnlyMine={showOnlyMine}
                initialVotes={initialVotes}
              />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export function CollapsibleThemePoolSkeleton({
  expanded = false,
  className,
}: {
  expanded?: boolean;
  className?: string;
}) {
  return (
    <div className={className} aria-hidden="true">
      <div className="w-full flex items-center justify-between py-2 gap-2">
        <div className="flex items-center gap-2">
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-5 w-6 rounded-full" />
        </div>
        <Skeleton className="h-5 w-5 rounded-sm" />
      </div>
      {expanded && (
        <div className="rounded-lg bg-[var(--surface-1)]/50 p-3 mt-1 space-y-2">
          <div className="flex items-center justify-between py-1">
            <Skeleton className="h-6 w-20 rounded-md" />
            <div className="flex items-center gap-1">
              <Skeleton className="h-5 w-10 rounded" />
              <Skeleton className="h-5 w-10 rounded" />
              <Skeleton className="h-5 w-10 rounded" />
            </div>
          </div>
          {[0, 1, 2].map((i) => (
            <div key={i} className="flex items-center gap-2 py-1.5">
              <Skeleton className="h-4 flex-1" />
              <Skeleton className="h-4 w-6" />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
