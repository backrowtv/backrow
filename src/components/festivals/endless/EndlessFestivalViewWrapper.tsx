"use client";

import { useState, useTransition, useCallback } from "react";
import { useRouter } from "next/navigation";
import { formatRatingDisplay } from "@/lib/ratings/normalize";
import { EndlessFestivalView, type DiscussionThreadMap } from "./EndlessFestivalView";
import {
  addMovieToPlaying,
  moveToCompleted,
  deleteFromEndlessFestival,
  markMovieWatched,
  unmarkMovieWatched,
  hideFromRecentlyWatched,
} from "@/app/actions/endless-festival";
import { createRating, deleteEndlessRating } from "@/app/actions/ratings";
import { friendlyError } from "@/lib/errors/friendly-messages";
import { AddMovieModal } from "../modals/AddMovieModal";
import { EndlessRatingModal } from "./EndlessRatingModal";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import type { ClubRatingSettings } from "./EndlessFestivalSection";
import toast from "react-hot-toast";

// Extended type for movies with watch/rate state from server
interface EnhancedEndlessMovie {
  id: string;
  tmdb_id: number;
  slug: string | null;
  title: string;
  year: number | null;
  poster_url: string | null;
  backdrop_url: string | null;
  overview: string | null;
  runtime: number | null;
  director: string | null;
  genres: string[] | null;
  certification: string | null;
  curator_note: string | null;
  endless_status: "pool" | "playing" | "completed";
  display_slot: "featured" | "throwback" | null;
  created_at: string;
  completed_at: string | null;
  nominator: {
    id: string;
    display_name: string;
    avatar_url: string | null;
  } | null;
  isWatched?: boolean;
  isRated?: boolean;
  userRating?: number;
}

interface EndlessFestivalViewWrapperProps {
  clubId: string;
  clubSlug: string;
  clubName: string;
  festivalId: string | null;
  festivalName: string | null;
  nowPlaying: EnhancedEndlessMovie[];
  pool: EnhancedEndlessMovie[];
  recentlyPlayed: EnhancedEndlessMovie[];
  discussionThreads?: DiscussionThreadMap;
  isAdmin: boolean;
  isMember: boolean;
  currentUserId: string;
  festivalType?: "standard" | "endless";
  ratingSettings?: ClubRatingSettings;
  /** Hide Recently Played section on desktop (shown in sidebar instead) */
  hideRecentlyPlayedOnDesktop?: boolean;
  onActiveIndexChange?: (index: number) => void;
  detailsUrl?: string;
}

/**
 * Client component wrapper that handles interactions
 */
export function EndlessFestivalViewWrapper({
  clubId,
  clubSlug,
  clubName,
  festivalId,
  festivalName,
  nowPlaying,
  pool,
  recentlyPlayed,
  discussionThreads,
  isAdmin,
  isMember,
  currentUserId,
  festivalType = "endless",
  ratingSettings,
  hideRecentlyPlayedOnDesktop = false,
  onActiveIndexChange,
  detailsUrl,
}: EndlessFestivalViewWrapperProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [showAddModal, setShowAddModal] = useState(false);

  // Conclude confirmation dialog state
  const [showConcludeDialog, setShowConcludeDialog] = useState(false);
  const [pendingConcludeId, setPendingConcludeId] = useState<string | null>(null);

  // Cancel confirmation dialog state
  const [showCancelDialog, setShowCancelDialog] = useState(false);
  const [pendingCancelId, setPendingCancelId] = useState<string | null>(null);

  // Rating modal state
  const [ratingModalOpen, setRatingModalOpen] = useState(false);
  const [selectedMovie, setSelectedMovie] = useState<EnhancedEndlessMovie | null>(null);
  const [isSubmittingRating, setIsSubmittingRating] = useState(false);

  // Track optimistic UI updates for watched status
  const [optimisticWatched, setOptimisticWatched] = useState<Map<string, boolean>>(new Map());
  // Track optimistic UI updates for ratings
  const [optimisticRatings, setOptimisticRatings] = useState<Map<string, number>>(new Map());
  // Track pending watched operations
  const [pendingWatched, setPendingWatched] = useState<Set<string>>(new Set());

  const handleAddMovie = () => {
    setShowAddModal(true);
  };

  const handleMovieSelected = async (tmdbId: number, curatorNote?: string) => {
    startTransition(async () => {
      const result = await addMovieToPlaying(clubId, tmdbId, curatorNote);
      if ("success" in result && result.success) {
        setShowAddModal(false);
        router.refresh();
      } else if ("error" in result) {
        console.error("Failed to add movie:", result.error);
        toast.error(friendlyError(result.error, "Couldn't add this movie. Please try again."));
      }
    });
  };

  const requestConclude = (nominationId: string) => {
    setPendingConcludeId(nominationId);
    setShowConcludeDialog(true);
  };

  const confirmConclude = () => {
    if (!pendingConcludeId) return;
    const id = pendingConcludeId;
    setShowConcludeDialog(false);
    setPendingConcludeId(null);
    startTransition(async () => {
      const result = await moveToCompleted(id);
      if ("success" in result) {
        router.refresh();
      } else if ("error" in result) {
        console.error("Failed to conclude movie:", result.error);
        toast.error(friendlyError(result.error, "Couldn't finish this movie. Please try again."));
      }
    });
  };

  const requestCancel = (nominationId: string) => {
    setPendingCancelId(nominationId);
    setShowCancelDialog(true);
  };

  const confirmCancel = () => {
    if (!pendingCancelId) return;
    const id = pendingCancelId;
    setShowCancelDialog(false);
    setPendingCancelId(null);
    startTransition(async () => {
      const result = await deleteFromEndlessFestival(id);
      if ("success" in result) {
        toast.success("Movie removed from festival");
        router.refresh();
      } else if ("error" in result) {
        console.error("Failed to cancel movie:", result.error);
        toast.error(friendlyError(result.error, "Couldn't remove this movie. Please try again."));
      }
    });
  };

  // Handle mark watched - persists to watch_history
  const handleMarkWatched = useCallback(
    async (nominationId: string) => {
      const movie = nowPlaying.find((m) => m.id === nominationId);
      if (!movie) return;

      // Check current watched state (server state + optimistic updates)
      const isCurrentlyWatched = optimisticWatched.has(nominationId)
        ? optimisticWatched.get(nominationId)!
        : (movie.isWatched ?? false);

      // Prevent double-clicks
      if (pendingWatched.has(nominationId)) return;
      setPendingWatched((prev) => new Set(prev).add(nominationId));

      // Optimistic update
      setOptimisticWatched((prev) => new Map(prev).set(nominationId, !isCurrentlyWatched));

      try {
        if (isCurrentlyWatched) {
          // Unmark as watched
          const result = await unmarkMovieWatched(movie.tmdb_id);
          if ("error" in result) {
            // Revert optimistic update
            setOptimisticWatched((prev) => new Map(prev).set(nominationId, true));
            toast.error(friendlyError(result.error));
          } else {
            toast.success("Removed from watch history");
            router.refresh();
          }
        } else {
          // Mark as watched
          const result = await markMovieWatched(movie.tmdb_id, {
            clubId,
            clubSlug,
            festivalId: festivalId || undefined,
          });
          if ("error" in result) {
            // Revert optimistic update
            setOptimisticWatched((prev) => new Map(prev).set(nominationId, false));
            toast.error(friendlyError(result.error));
          } else {
            toast.success("Added to watch history!");
            router.refresh();
          }
        }
      } finally {
        setPendingWatched((prev) => {
          const next = new Set(prev);
          next.delete(nominationId);
          return next;
        });
      }
    },
    [nowPlaying, optimisticWatched, pendingWatched, clubId, clubSlug, festivalId, router]
  );

  // Handle rate - open rating modal
  const handleRate = useCallback(
    (nominationId: string) => {
      const movie = nowPlaying.find((m) => m.id === nominationId);
      if (movie) {
        setSelectedMovie(movie);
        setRatingModalOpen(true);
      }
    },
    [nowPlaying]
  );

  // Handle hide from recently watched - admin only
  const handleHideFromRecentlyWatched = useCallback(
    async (nominationId: string) => {
      const movie = recentlyPlayed.find((m) => m.id === nominationId);
      if (!movie) return;

      startTransition(async () => {
        const result = await hideFromRecentlyWatched(nominationId);
        if ("success" in result) {
          toast.success(`${movie.title} hidden from Recently Watched`);
          router.refresh();
        } else if ("error" in result) {
          toast.error(friendlyError(result.error));
        }
      });
    },
    [recentlyPlayed, router]
  );

  // Handle rating submission
  const handleRatingSubmit = async (rating: number) => {
    if (!selectedMovie || !festivalId) {
      toast.error("Unable to submit rating");
      return;
    }

    setIsSubmittingRating(true);

    // Optimistic update
    setOptimisticRatings((prev) => new Map(prev).set(selectedMovie.id, rating));

    const formData = new FormData();
    formData.append("festivalId", festivalId);
    formData.append("nominationId", selectedMovie.id);
    formData.append("rating", rating.toString());

    const result = await createRating(null, formData);

    setIsSubmittingRating(false);

    if (result && "error" in result && result.error) {
      // Revert optimistic update
      setOptimisticRatings((prev) => {
        const next = new Map(prev);
        next.delete(selectedMovie.id);
        return next;
      });
      toast.error(friendlyError(result.error));
    } else {
      const isUpdate = selectedMovie.userRating !== undefined;
      toast.success(
        isUpdate
          ? `Updated rating for ${selectedMovie.title}: ${formatRatingDisplay(rating)}`
          : `Rated ${selectedMovie.title}: ${formatRatingDisplay(rating)}`
      );
      setRatingModalOpen(false);
      setSelectedMovie(null);
      router.refresh();
    }
  };

  // Handle rating deletion
  const handleRatingDelete = async () => {
    if (!selectedMovie || !festivalId) {
      toast.error("Unable to delete rating");
      return;
    }

    setIsSubmittingRating(true);

    // Optimistic update - remove rating
    setOptimisticRatings((prev) => {
      const next = new Map(prev);
      next.delete(selectedMovie.id);
      return next;
    });

    const result = await deleteEndlessRating(festivalId, selectedMovie.id);

    setIsSubmittingRating(false);

    if (result && "error" in result && result.error) {
      toast.error(friendlyError(result.error));
    } else {
      toast.success(`Removed rating for ${selectedMovie.title}`);
      setRatingModalOpen(false);
      setSelectedMovie(null);
      router.refresh();
    }
  };

  // Enhance nowPlaying with optimistic watched/rated state
  const enhancedNowPlaying = nowPlaying.map((movie) => ({
    ...movie,
    // Use optimistic state if available, otherwise fall back to server state
    isWatched: optimisticWatched.has(movie.id)
      ? optimisticWatched.get(movie.id)!
      : (movie.isWatched ?? false),
    isRated: optimisticRatings.has(movie.id) || movie.isRated,
    userRating: optimisticRatings.get(movie.id) ?? movie.userRating,
  }));

  return (
    <>
      <EndlessFestivalView
        clubId={clubId}
        clubSlug={clubSlug}
        clubName={clubName}
        festivalId={festivalId}
        festivalName={festivalName}
        nowPlaying={enhancedNowPlaying}
        queue={pool}
        recentlyPlayed={recentlyPlayed}
        discussionThreads={discussionThreads}
        isAdmin={isAdmin}
        isMember={isMember}
        currentUserId={currentUserId}
        festivalType={festivalType}
        onAddMovie={handleAddMovie}
        onAdvanceQueue={requestConclude}
        onCancelMovie={requestCancel}
        onMarkWatched={handleMarkWatched}
        onRate={handleRate}
        onHideFromRecentlyWatched={handleHideFromRecentlyWatched}
        hideRecentlyPlayedOnDesktop={hideRecentlyPlayedOnDesktop}
        onActiveIndexChange={onActiveIndexChange}
        detailsUrl={detailsUrl}
      />

      {isAdmin && (
        <AddMovieModal
          open={showAddModal}
          onOpenChange={setShowAddModal}
          onMovieSelected={handleMovieSelected}
          isPending={isPending}
          clubName={clubName}
        />
      )}

      {/* Rating Modal */}
      {ratingSettings && (
        <EndlessRatingModal
          open={ratingModalOpen}
          onOpenChange={setRatingModalOpen}
          movie={selectedMovie}
          ratingSettings={ratingSettings}
          onSubmit={handleRatingSubmit}
          onDelete={handleRatingDelete}
          isSubmitting={isSubmittingRating}
          initialRating={
            selectedMovie
              ? (optimisticRatings.get(selectedMovie.id) ?? selectedMovie.userRating)
              : undefined
          }
        />
      )}

      {/* Conclude Movie Confirmation Dialog */}
      <AlertDialog open={showConcludeDialog} onOpenChange={setShowConcludeDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Conclude this movie?</AlertDialogTitle>
            <AlertDialogDescription>
              {(() => {
                const movie = nowPlaying.find((m) => m.id === pendingConcludeId);
                return movie
                  ? `"${movie.title}" will be moved to Recently Played and all members will be notified. This cannot be undone.`
                  : "This movie will be moved to Recently Played and all members will be notified. This cannot be undone.";
              })()}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmConclude}>Conclude</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Cancel Movie Confirmation Dialog */}
      <AlertDialog open={showCancelDialog} onOpenChange={setShowCancelDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove this movie?</AlertDialogTitle>
            <AlertDialogDescription>
              {(() => {
                const movie = nowPlaying.find((m) => m.id === pendingCancelId);
                return movie
                  ? `"${movie.title}" will be removed from the festival entirely. It will not appear in Recently Played.`
                  : "This movie will be removed from the festival entirely. It will not appear in Recently Played.";
              })()}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Keep it</AlertDialogCancel>
            <AlertDialogAction onClick={confirmCancel}>Remove</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
