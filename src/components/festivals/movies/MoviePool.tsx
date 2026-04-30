"use client";

import { useState, useTransition, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useClubPreference } from "@/lib/hooks/useClubPreferences";
import Link from "next/link";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Plus,
  Trash,
  Play,
  MagnifyingGlass,
  FilmReel,
  X,
  Shuffle,
  Sparkle,
} from "@phosphor-icons/react";
import { UpvoteButton } from "@/components/ui/upvote-button";
import toast from "react-hot-toast";
import { cn } from "@/lib/utils";
import { motion, LayoutGroup } from "framer-motion";
import Image from "next/image";
import {
  addMovieToPool,
  moveToPlaying,
  removeFromPool,
  togglePoolMovieVote,
  getPoolMoviesVotes,
  pickRandomFromPool,
  type EndlessMovie,
} from "@/app/actions/endless-festival";
import { searchMovies } from "@/app/actions/tmdb";
import { getTMDBBlurDataURL } from "@/lib/utils/blur-placeholder";
import type { MoviePoolGovernance } from "@/types/club-settings";

interface MoviePoolProps {
  movies: EndlessMovie[];
  clubId: string;
  canManage?: boolean;
  votingEnabled?: boolean;
  governance?: MoviePoolGovernance;
  autoPromoteThreshold?: number;
  allowNonAdminAdd?: boolean;
  /** Visual variant - 'default' has card styling, 'minimal' has transparent background */
  variant?: "default" | "minimal";
  /** Hide internal sort controls */
  hideSort?: boolean;
  /** Callback when a movie is added - used to update parent state */
  onMovieAdded?: (movie: EndlessMovie) => void;
  /** Callback fired after any successful pool mutation (add/remove/move/auto-promote/random-pick). Parents that own pool data should refetch here so counts and other derived state stay in sync. */
  onPoolChanged?: () => void;
  /** Current user ID to filter own submissions */
  currentUserId?: string;
  /** External filter control - show only current user's movies */
  showOnlyMine?: boolean;
  /** Pre-fetched votes to avoid resort on expand */
  initialVotes?: Map<string, VoteState>;
  /** Unique ID to namespace framer-motion layoutIds (prevents cross-instance animation) */
  instanceId?: string;
}

type SortOption = "new" | "top" | "old";

interface VoteState {
  count: number;
  userVoted: boolean;
}

export function MoviePool({
  movies,
  clubId,
  canManage = false,
  votingEnabled = false,
  governance = "autocracy",
  autoPromoteThreshold = 5,
  allowNonAdminAdd = true,
  variant = "default",
  hideSort = false,
  onMovieAdded,
  onPoolChanged,
  currentUserId,
  showOnlyMine: externalShowOnlyMine,
  initialVotes,
  instanceId,
}: MoviePoolProps) {
  const isMinimal = variant === "minimal";
  const [optimisticMovies, setOptimisticMovies] = useState<EndlessMovie[]>(movies);
  const [deletingMovieId, setDeletingMovieId] = useState<string | null>(null);
  const [isDeleting, startDeleting] = useTransition();
  const [isAdding, startAdding] = useTransition();
  const [isMoving, startMoving] = useTransition();
  const [isVoting, startVoting] = useTransition();
  const [isPickingRandom, startPickingRandom] = useTransition();
  const [sortBy, setSortBy] = useClubPreference<SortOption>(
    clubId,
    "moviePoolSort",
    votingEnabled ? "top" : "new"
  );
  const [hoveredMovieId, setHoveredMovieId] = useState<string | null>(null);
  const [internalShowOnlyMine, setShowOnlyMine] = useState(false);
  const showOnlyMine = externalShowOnlyMine ?? internalShowOnlyMine;
  const [showAddModal, setShowAddModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<
    Array<{
      id: number;
      title: string;
      year: number | null;
      poster_path: string | null;
    }>
  >([]);
  const [isSearching, setIsSearching] = useState(false);
  const [selectedMovie, setSelectedMovie] = useState<{
    id: number;
    title: string;
    year: number | null;
    poster_path: string | null;
  } | null>(null);
  const [curatorNote, setCuratorNote] = useState("");
  const [votesMap, setVotesMap] = useState<Map<string, VoteState>>(initialVotes || new Map());
  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();

  // Sync optimistic movies with prop changes
  useEffect(() => {
    setOptimisticMovies(movies);
  }, [movies]);

  // Fetch vote counts when movies change
  const fetchVotes = useCallback(async () => {
    if (!votingEnabled || movies.length === 0) return;

    const nominationIds = movies.map((m) => m.id);
    const votes = await getPoolMoviesVotes(nominationIds);
    setVotesMap(votes);
  }, [movies, votingEnabled]);

  // Fetch votes on mount, but skip if initialVotes provided (already pre-fetched)
  useEffect(() => {
    if (!initialVotes) {
      fetchVotes();
    }
  }, [fetchVotes, initialVotes]);

  // Handle search with debounce
  useEffect(() => {
    if (searchQuery.trim().length < 2) {
      setSearchResults([]);
      return;
    }

    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }

    searchTimeoutRef.current = setTimeout(async () => {
      setIsSearching(true);
      const results = await searchMovies(searchQuery);
      if (results && !("error" in results)) {
        setSearchResults(results.slice(0, 10));
      }
      setIsSearching(false);
    }, 300);

    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
    };
  }, [searchQuery]);

  // Get vote count for a movie (from votesMap or default)
  const getVoteCount = (movieId: string): number => {
    return votesMap.get(movieId)?.count || 0;
  };

  // Check if user voted for a movie
  const hasUserVoted = (movieId: string): boolean => {
    return votesMap.get(movieId)?.userVoted || false;
  };

  // Sort movies
  const sortedMovies = [...optimisticMovies].sort((a, b) => {
    if (sortBy === "new") {
      const aDate = new Date(a.created_at).getTime();
      const bDate = new Date(b.created_at).getTime();
      return bDate - aDate;
    } else if (sortBy === "old") {
      const aDate = new Date(a.created_at).getTime();
      const bDate = new Date(b.created_at).getTime();
      return aDate - bDate;
    } else if (sortBy === "top") {
      const aVotes = getVoteCount(a.id);
      const bVotes = getVoteCount(b.id);
      return bVotes - aVotes;
    }
    return 0;
  });

  const filteredMovies =
    showOnlyMine && currentUserId
      ? sortedMovies.filter((m) => m.nominator?.id === currentUserId)
      : sortedMovies;

  // Handle vote toggle
  const handleVote = async (movie: EndlessMovie) => {
    const currentVoteState = votesMap.get(movie.id) || { count: 0, userVoted: false };
    const willVote = !currentVoteState.userVoted;

    // Optimistic update
    setVotesMap((prev) => {
      const newMap = new Map(prev);
      newMap.set(movie.id, {
        count: currentVoteState.count + (willVote ? 1 : -1),
        userVoted: willVote,
      });
      return newMap;
    });

    startVoting(async () => {
      const result = await togglePoolMovieVote(movie.id);

      if ("error" in result) {
        // Revert optimistic update
        setVotesMap((prev) => {
          const newMap = new Map(prev);
          newMap.set(movie.id, currentVoteState);
          return newMap;
        });
        toast.error(result.error);
      } else {
        // Sync state with server response (handles race conditions)
        setVotesMap((prev) => {
          const newMap = new Map(prev);
          const currentCount = prev.get(movie.id)?.count || 0;
          newMap.set(movie.id, {
            // Adjust count based on actual server state vs what we expected
            count: result.voted
              ? Math.max(currentCount, 1)
              : Math.max(currentCount - (willVote ? 1 : 0), 0),
            userVoted: result.voted,
          });
          return newMap;
        });

        if (result.voted && result.autoPromoted) {
          toast.success(
            `🎉 "${movie.title}" reached ${autoPromoteThreshold} votes and is now showing!`
          );
          setOptimisticMovies((prev) => prev.filter((m) => m.id !== movie.id));
          router.refresh();
          onPoolChanged?.();
        }
      }
    });
  };

  // Handle random pick (for random governance)
  const handlePickRandom = async () => {
    startPickingRandom(async () => {
      const result = await pickRandomFromPool(clubId);

      if ("error" in result) {
        toast.error(result.error);
      } else {
        toast.success(`🎲 "${result.movieTitle}" was randomly selected and is now showing!`);
        if (result.poolItemId) {
          setOptimisticMovies((prev) => prev.filter((m) => m.id !== result.poolItemId));
        }
        router.refresh();
        onPoolChanged?.();
      }
    });
  };

  const handleAddMovie = async () => {
    if (!selectedMovie) return;

    // Store movie info before clearing state
    const movieToAdd = selectedMovie;
    const noteToAdd = curatorNote;

    startAdding(async () => {
      const result = await addMovieToPool(clubId, movieToAdd.id, noteToAdd || undefined);

      if ("error" in result) {
        toast.error(result.error);
      } else {
        // Create optimistic movie object
        const newMovie: EndlessMovie = {
          id: result.poolItemId || `temp-${Date.now()}`,
          tmdb_id: movieToAdd.id,
          slug: null,
          title: movieToAdd.title,
          year: movieToAdd.year,
          poster_url: movieToAdd.poster_path
            ? `https://image.tmdb.org/t/p/w500${movieToAdd.poster_path}`
            : null,
          backdrop_url: null,
          overview: null,
          runtime: null,
          director: null,
          genres: null,
          certification: null,
          curator_note: noteToAdd || null,
          endless_status: "pool",
          display_slot: null,
          created_at: new Date().toISOString(),
          completed_at: null,
          nominator: null, // Will be filled on refresh
        };

        // Update local state immediately
        setOptimisticMovies((prev) => [newMovie, ...prev]);

        // Notify parent component
        onMovieAdded?.(newMovie);

        toast.success(`${movieToAdd.title} added to pool`);
        setShowAddModal(false);
        setSelectedMovie(null);
        setSearchQuery("");
        setCuratorNote("");
        setSearchResults([]);
        router.refresh();
        onPoolChanged?.();
      }
    });
  };

  const handleMoveToPlaying = async (movie: EndlessMovie) => {
    startMoving(async () => {
      const result = await moveToPlaying(movie.id);

      if ("error" in result) {
        toast.error(result.error);
      } else {
        toast.success(`${movie.title} is now playing!`);
        setOptimisticMovies((prev) => prev.filter((m) => m.id !== movie.id));
        router.refresh();
        onPoolChanged?.();
      }
    });
  };

  const handleRemove = async (movieId: string) => {
    const movieToDelete = optimisticMovies.find((m) => m.id === movieId);
    if (!movieToDelete) return;

    setOptimisticMovies((prev) => prev.filter((m) => m.id !== movieId));

    startDeleting(async () => {
      const result = await removeFromPool(movieId);

      if ("error" in result) {
        setOptimisticMovies((prev) => [...prev, movieToDelete]);
        toast.error(result.error);
      } else {
        toast.success("Movie removed from pool");
        router.refresh();
        onPoolChanged?.();
      }
      setDeletingMovieId(null);
    });
  };

  const deletingMovie = deletingMovieId
    ? optimisticMovies.find((m) => m.id === deletingMovieId)
    : null;

  return (
    <div
      className={cn("overflow-hidden", !isMinimal && "rounded-lg border")}
      style={
        !isMinimal
          ? {
              background: "var(--surface-1)",
              borderColor: "var(--border)",
            }
          : undefined
      }
    >
      {/* Header with count and sort - hidden in minimal mode */}
      {!isMinimal && (
        <div
          className="flex items-center justify-between px-4 py-3 border-b"
          style={{ borderColor: "var(--border)" }}
        >
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>
              Movie Pool
            </h3>
            <span
              className="text-xs px-1.5 py-0.5 rounded-full"
              style={{
                background: "var(--surface-2)",
                color: "var(--text-secondary)",
              }}
            >
              {optimisticMovies.length}
            </span>
          </div>
          <div className="flex items-center gap-2">
            {currentUserId && optimisticMovies.length > 0 && (
              <button
                onClick={() => setShowOnlyMine((v) => !v)}
                className={cn(
                  "px-2.5 py-1 text-xs font-medium rounded-md transition-all",
                  showOnlyMine
                    ? "bg-[var(--primary)] text-[var(--primary-foreground)] shadow-sm"
                    : "text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
                )}
              >
                My Movies
              </button>
            )}
            {optimisticMovies.length > 0 && (
              <div
                className="flex items-center gap-0.5 rounded-md p-0.5"
                style={{ background: "var(--surface-2)" }}
              >
                {((votingEnabled ? ["new", "top", "old"] : ["new", "old"]) as SortOption[]).map(
                  (sort) => (
                    <button
                      key={sort}
                      onClick={() => setSortBy(sort)}
                      className={cn(
                        "px-2 py-1 text-xs font-medium rounded transition-colors capitalize",
                        sortBy === sort
                          ? "bg-[var(--background)] text-[var(--text-primary)] shadow-sm"
                          : "text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
                      )}
                    >
                      {sort}
                    </button>
                  )
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Minimal mode controls - filter + sort */}
      {isMinimal && !hideSort && optimisticMovies.length > 0 && (
        <div className="flex items-center justify-between mb-2">
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
                My Movies
              </button>
            )}
          </div>
          <div
            className="flex items-center gap-0.5 rounded-md p-0.5"
            style={{ background: "var(--surface-1)/50" }}
          >
            {((votingEnabled ? ["new", "top", "old"] : ["new", "old"]) as SortOption[]).map(
              (sort) => (
                <button
                  key={sort}
                  onClick={() => setSortBy(sort)}
                  className={cn(
                    "px-2 py-1 text-xs font-medium rounded transition-colors capitalize",
                    sortBy === sort
                      ? "bg-[var(--surface-2)] text-[var(--text-primary)]"
                      : "text-[var(--text-muted)] hover:text-[var(--text-primary)]"
                  )}
                >
                  {sort}
                </button>
              )
            )}
          </div>
        </div>
      )}

      {/* Governance info - only in default mode */}
      {!isMinimal && optimisticMovies.length > 0 && (
        <div
          className="flex items-center justify-between px-4 py-2 border-b"
          style={{ borderColor: "var(--border)" }}
        >
          <div className="flex items-center gap-1.5">
            {governance === "democracy" && votingEnabled && (
              <>
                <Sparkle className="w-3.5 h-3.5" style={{ color: "var(--primary)" }} />
                <span className="text-xs" style={{ color: "var(--text-muted)" }}>
                  <strong>Members Vote</strong> · {autoPromoteThreshold}+ votes auto-starts
                </span>
              </>
            )}
            {governance === "random" && (
              <>
                <Shuffle className="w-3.5 h-3.5" style={{ color: "var(--text-muted)" }} />
                <span className="text-xs" style={{ color: "var(--text-muted)" }}>
                  <strong>Random Pick</strong>
                </span>
              </>
            )}
            {governance === "autocracy" && (
              <span className="text-xs" style={{ color: "var(--text-muted)" }}>
                <strong>Host Decides</strong> what&apos;s next
              </span>
            )}
          </div>

          {/* Random pick button (for random governance, admin only) */}
          {governance === "random" && canManage && optimisticMovies.length > 0 && (
            <Button
              variant="secondary"
              size="sm"
              onClick={handlePickRandom}
              disabled={isPickingRandom}
              className="h-7 text-xs"
            >
              <Shuffle className="w-3.5 h-3.5 mr-1" />
              {isPickingRandom ? "Picking..." : "Pick Random"}
            </Button>
          )}
        </div>
      )}

      {/* Movie list - scrollable */}
      <div
        className={cn("overflow-y-auto", isMinimal ? "max-h-[320px]" : "max-h-[280px]")}
        style={{
          scrollbarWidth: "thin",
          scrollbarColor: "var(--border) transparent",
        }}
      >
        {optimisticMovies.length === 0 ? (
          <div className={cn("text-center", isMinimal ? "py-4" : "px-4 py-8")}>
            <p className="text-sm" style={{ color: "var(--text-secondary)" }}>
              No movies yet
            </p>
          </div>
        ) : (
          <LayoutGroup id={instanceId}>
            <div
              className={cn(!isMinimal && "divide-y")}
              style={!isMinimal ? { borderColor: "var(--border)" } : undefined}
            >
              {filteredMovies.map((movie) => {
                const isHovered = hoveredMovieId === movie.id;

                return (
                  <motion.div
                    key={movie.id}
                    layout
                    layoutId={movie.id}
                    transition={{
                      layout: {
                        type: "spring",
                        stiffness: 500,
                        damping: 35,
                      },
                    }}
                    className={cn(
                      "group flex items-start gap-2 transition-colors",
                      isMinimal ? "px-2 py-2 rounded-lg mb-1" : "px-3 py-2",
                      isHovered &&
                        (isMinimal ? "bg-[var(--surface-1)]/60" : "bg-[var(--surface-2)]")
                    )}
                    style={!isMinimal ? { borderColor: "var(--border)" } : undefined}
                    onMouseEnter={() => setHoveredMovieId(movie.id)}
                    onMouseLeave={() => setHoveredMovieId(null)}
                  >
                    {/* Vote button */}
                    {votingEnabled && (
                      <UpvoteButton
                        count={getVoteCount(movie.id)}
                        isVoted={hasUserVoted(movie.id)}
                        onVote={() => handleVote(movie)}
                        disabled={isVoting}
                        size="sm"
                      />
                    )}

                    {/* Poster */}
                    <Link
                      href={`/movies/${movie.slug || movie.tmdb_id}`}
                      className="relative w-10 h-14 rounded overflow-hidden bg-[var(--surface-2)] flex-shrink-0 hover:ring-2 hover:ring-[var(--primary)]/50 transition-shadow"
                    >
                      {movie.poster_url ? (
                        <Image
                          src={
                            movie.poster_url.startsWith("http")
                              ? movie.poster_url
                              : `https://image.tmdb.org/t/p/w92${movie.poster_url}`
                          }
                          alt={movie.title}
                          fill
                          className="object-cover"
                          sizes="40px"
                          placeholder="blur"
                          blurDataURL={getTMDBBlurDataURL()}
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <FilmReel className="w-4 h-4" style={{ color: "var(--text-muted)" }} />
                        </div>
                      )}
                    </Link>

                    {/* Movie info */}
                    <div className="flex-1 min-w-0">
                      <span
                        className="text-sm line-clamp-2"
                        style={{ color: "var(--text-primary)" }}
                        title={movie.title}
                      >
                        {movie.title}
                      </span>
                      {/* Metadata row with action buttons */}
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-xs truncate" style={{ color: "var(--text-muted)" }}>
                          {movie.year || "Unknown"}
                          {movie.nominator && <> · {movie.nominator.display_name}</>}
                        </span>
                        {/* Action buttons - slide in on hover (desktop), always visible (mobile) */}
                        {canManage && (
                          <div
                            className={cn(
                              "flex items-center gap-0.5 transition-all duration-200 ease-out",
                              // Mobile: always visible (base state)
                              "translate-x-0 opacity-100",
                              // Desktop (hover-capable): hidden by default, slide in on group hover
                              "[@media(hover:hover)]:translate-x-2 [@media(hover:hover)]:opacity-0",
                              "[@media(hover:hover)]:group-hover:translate-x-0 [@media(hover:hover)]:group-hover:opacity-100"
                            )}
                          >
                            <button
                              onClick={() => handleMoveToPlaying(movie)}
                              disabled={isMoving}
                              aria-label="Start playing"
                              className="p-1 rounded transition-colors hover:bg-[var(--primary)]/10"
                              style={{ color: "var(--primary)" }}
                              title="Start playing"
                            >
                              <Play className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => setDeletingMovieId(movie.id)}
                              disabled={isDeleting}
                              aria-label="Remove"
                              className="p-1 rounded hover:bg-[var(--error)]/10 transition-colors"
                              style={{ color: "var(--error)" }}
                            >
                              <Trash className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          </LayoutGroup>
        )}
      </div>

      {/* Add movie link - compact footer */}
      {(canManage || allowNonAdminAdd) && (
        <div
          className={cn(isMinimal ? "pt-2" : "border-t px-3 py-2", "flex justify-end")}
          style={!isMinimal ? { borderColor: "var(--border)" } : undefined}
        >
          <button
            onClick={() => setShowAddModal(true)}
            className="flex items-center gap-1.5 text-xs font-medium py-1 text-[var(--club-accent,var(--primary))] hover:opacity-80 transition-colors"
          >
            <Plus className="w-3.5 h-3.5" />
            Add Movie
          </button>
        </div>
      )}

      {/* Add Movie Modal */}
      <Modal
        open={showAddModal}
        onOpenChange={setShowAddModal}
        title="Add Movie to Pool"
        description="Search for a movie to add to the pool"
        size="lg"
      >
        <div className="space-y-4">
          {/* Search input */}
          <div className="relative">
            <MagnifyingGlass
              className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4"
              style={{ color: "var(--text-muted)" }}
            />
            <Input
              ref={searchInputRef as React.Ref<HTMLInputElement>}
              type="text"
              placeholder="Search for a movie..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 search-input-debossed"
            />
          </div>

          {/* Selected movie preview */}
          {selectedMovie && (
            <div
              className="flex items-center gap-3 p-3 rounded-lg border"
              style={{
                background: "var(--primary)/5",
                borderColor: "var(--primary)/30",
              }}
            >
              <div className="relative w-12 h-18 rounded overflow-hidden bg-[var(--surface-2)] flex-shrink-0">
                {selectedMovie.poster_path ? (
                  <Image
                    src={`https://image.tmdb.org/t/p/w92${selectedMovie.poster_path}`}
                    alt={selectedMovie.title}
                    fill
                    className="object-cover"
                    sizes="48px"
                    placeholder="blur"
                    blurDataURL={getTMDBBlurDataURL()}
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <FilmReel className="w-5 h-5" style={{ color: "var(--text-muted)" }} />
                  </div>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-medium" style={{ color: "var(--text-primary)" }}>
                  {selectedMovie.title}
                </p>
                <p className="text-sm" style={{ color: "var(--text-muted)" }}>
                  {selectedMovie.year || "Unknown year"}
                </p>
              </div>
              <button
                onClick={() => setSelectedMovie(null)}
                className="p-1 rounded hover:bg-[var(--surface-2)]"
              >
                <X className="w-4 h-4" style={{ color: "var(--text-muted)" }} />
              </button>
            </div>
          )}

          {/* Search results */}
          {!selectedMovie && searchQuery.length >= 2 && (
            <div
              className="max-h-[300px] overflow-y-auto rounded-lg border"
              style={{ borderColor: "var(--border)" }}
            >
              {isSearching ? (
                <div className="p-4 text-center">
                  <p className="text-sm" style={{ color: "var(--text-muted)" }}>
                    Searching...
                  </p>
                </div>
              ) : searchResults.length === 0 ? (
                <div className="p-4 text-center">
                  <p className="text-sm" style={{ color: "var(--text-muted)" }}>
                    No results found
                  </p>
                </div>
              ) : (
                <div className="divide-y" style={{ borderColor: "var(--border)" }}>
                  {searchResults.map((movie) => (
                    <button
                      key={movie.id}
                      onClick={() => setSelectedMovie(movie)}
                      className="w-full flex items-center gap-3 p-2 hover:bg-[var(--surface-2)] transition-colors text-left"
                    >
                      <div className="relative w-10 h-14 rounded overflow-hidden bg-[var(--surface-2)] flex-shrink-0">
                        {movie.poster_path ? (
                          <Image
                            src={`https://image.tmdb.org/t/p/w92${movie.poster_path}`}
                            alt={movie.title}
                            fill
                            className="object-cover"
                            sizes="40px"
                            placeholder="blur"
                            blurDataURL={getTMDBBlurDataURL()}
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <FilmReel className="w-4 h-4" style={{ color: "var(--text-muted)" }} />
                          </div>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p
                          className="text-sm font-medium truncate"
                          style={{ color: "var(--text-primary)" }}
                        >
                          {movie.title}
                        </p>
                        <p className="text-xs" style={{ color: "var(--text-muted)" }}>
                          {movie.year || "Unknown year"}
                        </p>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Curator note */}
          {selectedMovie && (
            <div>
              <label
                htmlFor="moviepool-curator-note"
                className="block text-sm font-medium mb-1"
                style={{ color: "var(--text-primary)" }}
              >
                Note (optional)
              </label>
              <Input
                id="moviepool-curator-note"
                type="text"
                placeholder="Why should we watch this?"
                value={curatorNote}
                onChange={(e) => setCuratorNote(e.target.value)}
              />
            </div>
          )}

          {/* Actions */}
          <div className="flex items-center justify-end gap-2 pt-2">
            <Button
              variant="secondary"
              onClick={() => {
                setShowAddModal(false);
                setSelectedMovie(null);
                setSearchQuery("");
                setCuratorNote("");
                setSearchResults([]);
              }}
            >
              Cancel
            </Button>
            <Button
              onClick={handleAddMovie}
              disabled={!selectedMovie || isAdding}
              isLoading={isAdding}
            >
              Add to Pool
            </Button>
          </div>
        </div>
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal
        open={deletingMovieId !== null}
        onOpenChange={() => setDeletingMovieId(null)}
        title="Remove Movie"
        description="Are you sure you want to remove this movie from the pool?"
        size="md"
      >
        <div className="space-y-4">
          <div
            className="rounded-md p-3 border"
            style={{
              background: "rgba(239, 68, 68, 0.1)",
              borderColor: "rgba(239, 68, 68, 0.3)",
            }}
          >
            <p className="text-sm" style={{ color: "var(--text-primary)" }}>
              <span style={{ color: "var(--error)" }}>This cannot be undone.</span>
              {deletingMovie && (
                <span className="block mt-1">
                  Movie: <strong>{deletingMovie.title}</strong>
                </span>
              )}
            </p>
          </div>

          <div className="flex items-center justify-end gap-2">
            <Button
              variant="secondary"
              size="sm"
              onClick={() => setDeletingMovieId(null)}
              disabled={isDeleting}
            >
              Cancel
            </Button>
            <Button
              variant="danger"
              size="sm"
              onClick={() => deletingMovieId && handleRemove(deletingMovieId)}
              disabled={isDeleting}
              isLoading={isDeleting}
            >
              Remove
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
