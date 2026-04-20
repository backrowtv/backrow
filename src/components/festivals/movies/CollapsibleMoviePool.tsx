"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import { CaretRight } from "@phosphor-icons/react";
import { motion, AnimatePresence } from "framer-motion";
import { MoviePool } from "./MoviePool";
import { getEndlessFestivalData, getMoviePoolCount } from "@/app/actions/endless-festival";
import { useClubPreference } from "@/lib/hooks/useClubPreferences";
import { Skeleton, SkeletonPoster } from "@/components/ui/skeleton";
import type { EndlessMovie } from "@/app/actions/endless-festival";
import type { PoolVoteState } from "@/app/actions/endless-festival/types";
import type { MoviePoolGovernance } from "@/types/club-settings";

interface CollapsibleMoviePoolProps {
  clubId: string;
  canManage?: boolean;
  votingEnabled?: boolean;
  governance?: MoviePoolGovernance;
  autoPromoteThreshold?: number;
  allowNonAdminAdd?: boolean;
  /** Start expanded or collapsed - defaults to collapsed */
  defaultExpanded?: boolean;
  /** Current user ID */
  currentUserId?: string;
  /** Initial count to show before loading - use server-fetched value */
  initialCount?: number;
  /** Unique ID to namespace framer-motion layoutIds (prevents cross-instance animation) */
  instanceId?: string;
}

export function CollapsibleMoviePool({
  clubId,
  canManage = false,
  votingEnabled = false,
  governance = "autocracy",
  autoPromoteThreshold = 5,
  allowNonAdminAdd = true,
  defaultExpanded = false,
  currentUserId,
  initialCount,
  instanceId,
}: CollapsibleMoviePoolProps) {
  const [isExpanded, setIsExpanded, hasHydrated] = useClubPreference(
    clubId,
    "moviePoolExpanded",
    defaultExpanded
  );
  const [movies, setMovies] = useState<EndlessMovie[]>([]);
  const [movieCount, setMovieCount] = useState(initialCount ?? 0);
  const [isLoading, setIsLoading] = useState(false);
  const [hasLoaded, setHasLoaded] = useState(false);
  const [initialVotes, setInitialVotes] = useState<Map<string, PoolVoteState> | undefined>();
  // Track if user has toggled - if not, skip animation on initial render when restoring from localStorage
  const hasInteracted = useRef(false);

  // Skip animation if expanded from localStorage and user hasn't toggled yet
  const shouldAnimate = hasInteracted.current || !hasHydrated;

  // Fetch count on mount if not provided
  useEffect(() => {
    if (initialCount === undefined) {
      getMoviePoolCount(clubId).then((count) => {
        setMovieCount(count);
      });
    }
  }, [clubId, initialCount]);

  // Fetch movies when expanded
  const fetchMovies = useCallback(async () => {
    if (hasLoaded && !isExpanded) return;

    setIsLoading(true);
    try {
      const data = await getEndlessFestivalData(clubId);
      if (!("error" in data)) {
        setMovies(data.pool);
        setMovieCount(data.pool.length);
        // Convert poolVotes object to Map for MoviePool
        if (data.poolVotes) {
          const votesMap = new Map(Object.entries(data.poolVotes).map(([id, vote]) => [id, vote]));
          setInitialVotes(votesMap);
        }
      }
    } finally {
      setIsLoading(false);
      setHasLoaded(true);
    }
  }, [clubId, hasLoaded, isExpanded]);

  // Fetch on mount if expanded
  useEffect(() => {
    if (isExpanded && !hasLoaded) {
      fetchMovies();
    }
  }, [isExpanded, hasLoaded, fetchMovies]);

  // Toggle expand and fetch if needed
  const handleToggle = () => {
    hasInteracted.current = true;
    const willExpand = !isExpanded;
    setIsExpanded(willExpand);
    if (willExpand && !hasLoaded) {
      fetchMovies();
    }
  };

  // Handle when a movie is added from MoviePool
  const handleMovieAdded = useCallback((movie: EndlessMovie) => {
    setMovies((prev) => [movie, ...prev]);
    setMovieCount((prev) => prev + 1);
  }, []);

  return (
    <div className="border-t border-[var(--border)] pt-2 mt-2">
      <button
        onClick={handleToggle}
        className="w-full group flex items-center justify-between py-2 gap-2"
      >
        <h3 className="text-sm font-semibold text-[var(--club-accent,var(--text-primary))] uppercase tracking-wide flex items-center gap-2 whitespace-nowrap">
          Movie Pool
          {movieCount > 0 && (
            <span
              className="px-2 py-0.5 rounded-full font-medium text-sm"
              style={{
                background: "var(--surface-2)",
                color: "var(--text-secondary)",
              }}
            >
              {movieCount}
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
            key="movie-pool-content"
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
              {isLoading ? (
                <div className="py-4 text-center">
                  <p className="text-sm" style={{ color: "var(--text-muted)" }}>
                    Loading...
                  </p>
                </div>
              ) : (
                <MoviePool
                  movies={movies}
                  clubId={clubId}
                  canManage={canManage}
                  votingEnabled={votingEnabled}
                  governance={governance}
                  autoPromoteThreshold={autoPromoteThreshold}
                  allowNonAdminAdd={allowNonAdminAdd}
                  variant="minimal"
                  hideSort={false}
                  onMovieAdded={handleMovieAdded}
                  currentUserId={currentUserId}
                  initialVotes={initialVotes}
                  instanceId={instanceId}
                />
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export function CollapsibleMoviePoolSkeleton({
  expanded = false,
  className,
}: {
  expanded?: boolean;
  className?: string;
}) {
  return (
    <div
      className={`border-t border-[var(--border)] pt-2 mt-2 ${className ?? ""}`}
      aria-hidden="true"
    >
      <div className="w-full flex items-center justify-between py-2 gap-2">
        <div className="flex items-center gap-2">
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-5 w-6 rounded-full" />
        </div>
        <Skeleton className="h-5 w-5 rounded-sm" />
      </div>
      {expanded && (
        <div className="rounded-lg bg-[var(--surface-1)]/50 p-3 mt-1">
          <div className="grid grid-cols-4 gap-3">
            {[0, 1, 2, 3].map((i) => (
              <SkeletonPoster key={i} size="sm" />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
