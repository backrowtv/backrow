"use client";

import { useState, useCallback, useEffect } from "react";
import { cn } from "@/lib/utils";
import { Star, CircleNotch, Plus, Minus, Ticket } from "@phosphor-icons/react";
import toast from "react-hot-toast";
import { useRouter } from "next/navigation";
import { RatingModal } from "@/components/ratings/RatingModal";
import { createClient } from "@/lib/supabase/client";
import type { UserRatingPreferences } from "@/types/user-rating-preferences";
import { DEFAULT_RATING_PREFERENCES } from "@/types/user-rating-preferences";
import type { UserRubric } from "@/app/actions/rubrics.types";
import { addToFutureNominations, removeFromFutureNominations } from "@/app/actions/profile";
import { ensureMovieExists } from "@/app/actions/movies";
import { AnimatedNumber } from "@/components/ui/animated-number";
import { formatRatingDisplay } from "@/lib/ratings/normalize";
import { ManageThemeLinksModal } from "@/components/profile/ManageThemeLinksModal";
import { useThemeLinking } from "@/components/profile/hooks/useThemeLinking";
import { Skeleton } from "@/components/ui/skeleton";

interface MovieActionsProps {
  tmdbId: number;
  movieTitle: string;
  year?: number;
  posterPath?: string | null;
  isWatched: boolean;
  watchCount: number;
  userRating: number | null;
}

export function MovieActions({
  tmdbId,
  movieTitle,
  year,
  posterPath,
  isWatched: initialIsWatched,
  watchCount: initialWatchCount,
  userRating: initialUserRating,
}: MovieActionsProps) {
  const router = useRouter();
  const [isWatched, setIsWatched] = useState(initialIsWatched);
  const [watchCount, setWatchCount] = useState(initialWatchCount || 1);
  const [userRating, setUserRating] = useState(initialUserRating);
  const [isWatchedLoading, setIsWatchedLoading] = useState(false);
  const [isCountLoading, setIsCountLoading] = useState(false);
  const [isRatingLoading, setIsRatingLoading] = useState(false);
  const [ratingModalOpen, setRatingModalOpen] = useState(false);
  const [ratingPreferences, setRatingPreferences] = useState<UserRatingPreferences>(
    DEFAULT_RATING_PREFERENCES
  );
  const [userRubrics, setUserRubrics] = useState<UserRubric[]>([]);
  const [isFutureNomLoading, setIsFutureNomLoading] = useState(false);
  const [isInFutureNomList, setIsInFutureNomList] = useState(false);
  const [futureNomId, setFutureNomId] = useState<string | null>(null);
  const [linkModalOpen, setLinkModalOpen] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);

  // Theme linking for future nominations modal
  const { clubThemes, linkingLoading, handleNominate } = useThemeLinking(userId || "");

  // Fetch user's rating preferences, rubrics, and check if movie is in future nominations
  useEffect(() => {
    async function fetchPreferencesAndRubrics() {
      const supabase = createClient();

      // Get current user first
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;
      setUserId(user.id);

      // Fetch preferences, rubrics, and future nomination status in parallel
      const [prefsResult, rubricsResult, futureNomResult] = await Promise.all([
        supabase.from("users").select("rating_preferences").eq("id", user.id).single(),
        supabase.from("user_rubrics").select("*").order("created_at", { ascending: false }),
        supabase.from("future_nomination_list").select("id").eq("tmdb_id", tmdbId).maybeSingle(),
      ]);

      if (prefsResult.data?.rating_preferences) {
        setRatingPreferences(prefsResult.data.rating_preferences as UserRatingPreferences);
      }

      if (rubricsResult.data) {
        setUserRubrics(
          rubricsResult.data.map((r) => ({
            id: r.id,
            user_id: r.user_id,
            name: r.name,
            categories: r.categories as UserRubric["categories"],
            is_default: r.is_default,
            created_at: r.created_at,
            updated_at: r.updated_at,
          }))
        );
      }

      setIsInFutureNomList(!!futureNomResult.data);
      if (futureNomResult.data) {
        setFutureNomId(futureNomResult.data.id);
      }
    }

    fetchPreferencesAndRubrics();
  }, [tmdbId]);

  const handleToggleWatched = useCallback(async () => {
    setIsWatchedLoading(true);
    try {
      if (isWatched) {
        const { unmarkMovieWatched } = await import("@/app/actions/endless-festival");
        const result = await unmarkMovieWatched(tmdbId);
        if ("error" in result) {
          toast.error(result.error);
        } else {
          setIsWatched(false);
          setWatchCount(1);
          toast.success("Removed from watched");
          router.refresh();
        }
      } else {
        // First ensure the movie exists in the database
        const { ensureMovieExists } = await import("@/app/actions/movies");
        await ensureMovieExists(tmdbId, movieTitle, year, posterPath);

        const { markMovieWatched } = await import("@/app/actions/endless-festival");
        const result = await markMovieWatched(tmdbId);
        if ("error" in result) {
          toast.error(result.error);
        } else {
          setIsWatched(true);
          setWatchCount(1);
          toast.success("Marked as watched!");
          router.refresh();
        }
      }
    } catch (error) {
      console.error("Error toggling watched:", error);
      toast.error("Something went wrong");
    } finally {
      setIsWatchedLoading(false);
    }
  }, [isWatched, tmdbId, movieTitle, year, posterPath, router]);

  const handleUpdateWatchCount = useCallback(
    async (delta: number) => {
      if (!isWatched) return;

      const newCount = watchCount + delta;

      // If going to 0, unmark as unwatched instead
      if (newCount < 1) {
        await handleToggleWatched();
        return;
      }

      setIsCountLoading(true);
      try {
        const { updateWatchCount } = await import("@/app/actions/endless-festival");
        const result = await updateWatchCount(tmdbId, newCount);
        if ("error" in result) {
          toast.error(result.error);
        } else {
          setWatchCount(newCount);
        }
      } catch (error) {
        console.error("Error updating watch count:", error);
        toast.error("Failed to update");
      } finally {
        setIsCountLoading(false);
      }
    },
    [isWatched, tmdbId, watchCount, handleToggleWatched]
  );

  const handleRating = useCallback(
    async (rating: number) => {
      setIsRatingLoading(true);
      try {
        // First ensure the movie exists in the database
        const { ensureMovieExists } = await import("@/app/actions/movies");
        await ensureMovieExists(tmdbId, movieTitle, year, posterPath);

        // Rating is already on 0-10 scale
        const { updateGenericRating } = await import("@/app/actions/ratings");
        const result = await updateGenericRating(tmdbId, rating, 0, 10);
        if ("error" in result && result.error) {
          toast.error(result.error);
        } else if (!("error" in result)) {
          setUserRating(rating);
          setRatingModalOpen(false);
          toast.success(`Rated ${rating.toFixed(1)}/10`);
          router.refresh();
        }
      } catch (error) {
        console.error("Error rating:", error);
        toast.error("Failed to submit rating");
      } finally {
        setIsRatingLoading(false);
      }
    },
    [tmdbId, movieTitle, year, posterPath, router]
  );

  // Handle rubric-based rating - uses the weighted score from the rubric
  const handleRatingWithRubric = useCallback(
    async (weightedRating: number, _rubricId: string, _rubricRatings: Record<string, number>) => {
      // For generic ratings on movie pages, we just store the final weighted score
      await handleRating(weightedRating);
    },
    [handleRating]
  );

  const handleRemoveRating = useCallback(async () => {
    setIsRatingLoading(true);
    try {
      const { deleteGenericRating } = await import("@/app/actions/ratings");
      const result = await deleteGenericRating(tmdbId);
      if ("error" in result && result.error) {
        toast.error(result.error);
      } else {
        setUserRating(null);
        setRatingModalOpen(false);
        toast.success("Rating removed");
        router.refresh();
      }
    } catch (error) {
      console.error("Error removing rating:", error);
      toast.error("Failed to remove rating");
    } finally {
      setIsRatingLoading(false);
    }
  }, [tmdbId, router]);

  const handleAddToFutureNominations = useCallback(async () => {
    if (isInFutureNomList) {
      // Already in list — open the Link Theme modal
      setLinkModalOpen(true);
      return;
    }

    setIsFutureNomLoading(true);
    try {
      // First ensure the movie exists in the database
      await ensureMovieExists(tmdbId, movieTitle, year, posterPath);

      const result = await addToFutureNominations(tmdbId);
      if ("error" in result && result.error) {
        toast.error(result.error);
      } else {
        setIsInFutureNomList(true);
        if ("id" in result && result.id) {
          setFutureNomId(result.id);
        }
        toast.success("Added to future nominations!");
      }
    } catch (error) {
      console.error("Error adding to future nominations:", error);
      toast.error("Failed to add to future nominations");
    } finally {
      setIsFutureNomLoading(false);
    }
  }, [isInFutureNomList, tmdbId, movieTitle, year, posterPath]);

  return (
    <div className="grid grid-cols-3 gap-2 w-fit">
      {/* Watched Card */}
      {isWatched ? (
        <div
          className={cn(
            "flex flex-col items-center justify-center gap-0.5 p-2 rounded-lg font-medium transition-colors min-w-[72px] min-h-[72px] aspect-square overflow-hidden",
            "bg-[var(--active-info-bg)] text-[var(--active-info-text)] border border-[var(--active-info-border)] shadow-[inset_0_1px_3px_rgba(0,0,0,0.15)]"
          )}
        >
          <div className="flex items-center gap-0.5">
            <button
              onClick={() => handleUpdateWatchCount(-1)}
              disabled={isWatchedLoading || isCountLoading}
              className={cn(
                "flex items-center justify-center w-5 h-5 rounded-full transition-all flex-shrink-0",
                "hover:bg-[var(--active-info-border)]",
                "disabled:opacity-50 disabled:cursor-not-allowed"
              )}
              aria-label={watchCount === 1 ? "Remove from watched" : "Decrease watch count"}
            >
              {isWatchedLoading ? (
                <CircleNotch className="w-3 h-3 animate-spin" />
              ) : (
                <Minus className="w-3 h-3" weight="bold" />
              )}
            </button>
            <span className="text-base lg:text-lg font-bold tabular-nums">
              <AnimatedNumber value={watchCount} timing="snappy" />
            </span>
            <button
              onClick={() => handleUpdateWatchCount(1)}
              disabled={isCountLoading}
              className={cn(
                "flex items-center justify-center w-5 h-5 rounded-full transition-all flex-shrink-0",
                "hover:bg-[var(--active-info-border)]",
                "disabled:opacity-50 disabled:cursor-not-allowed"
              )}
              aria-label="Increase watch count"
            >
              <Plus className="w-3 h-3" weight="bold" />
            </button>
          </div>
          <span className="text-[10px] opacity-70">{watchCount === 1 ? "watch" : "watches"}</span>
        </div>
      ) : (
        <button
          onClick={handleToggleWatched}
          disabled={isWatchedLoading}
          title="Mark as watched"
          className={cn(
            "flex flex-col items-center justify-center gap-0.5 p-2 rounded-lg font-medium transition-colors min-w-[72px] min-h-[72px] aspect-square overflow-hidden",
            "bg-[var(--surface-2)]/60 text-[var(--text-secondary)] border border-[var(--border)]/50 hover:border-[var(--info)]/50 hover:text-[var(--info)]",
            "disabled:opacity-50 disabled:cursor-not-allowed"
          )}
        >
          {isWatchedLoading ? (
            <CircleNotch className="w-4 h-4 lg:w-5 lg:h-5 animate-spin" />
          ) : (
            <>
              <Plus className="w-4 h-4 lg:w-5 lg:h-5" />
              <span className="text-[10px] lg:text-xs">Watched</span>
            </>
          )}
        </button>
      )}

      {/* Future Nomination Card */}
      <button
        onClick={handleAddToFutureNominations}
        disabled={isFutureNomLoading}
        className={cn(
          "flex flex-col items-center justify-center gap-0.5 p-2 rounded-lg font-medium transition-colors min-w-[72px] min-h-[72px] aspect-square overflow-hidden",
          isInFutureNomList
            ? "bg-[var(--active-primary-bg)] text-[var(--active-primary-text)] border border-[var(--active-primary-border)] shadow-[inset_0_1px_3px_rgba(0,0,0,0.15)]"
            : "bg-[var(--surface-2)]/60 text-[var(--text-secondary)] border border-[var(--border)]/50 hover:border-[var(--primary)]/50 hover:text-[var(--primary)]",
          "disabled:opacity-50 disabled:cursor-not-allowed"
        )}
        title={isInFutureNomList ? "View future nominations" : "Add to future nominations"}
      >
        {isFutureNomLoading ? (
          <CircleNotch className="w-4 h-4 lg:w-5 lg:h-5 animate-spin" />
        ) : (
          <>
            <Ticket
              className="w-4 h-4 lg:w-5 lg:h-5"
              weight={isInFutureNomList ? "fill" : "regular"}
            />
            <span className="text-[10px] lg:text-xs text-center leading-tight">
              Future
              <br />
              Nomination
            </span>
          </>
        )}
      </button>

      {/* Rating Card */}
      <button
        onClick={() => setRatingModalOpen(true)}
        disabled={isRatingLoading}
        title={userRating !== null ? "Update rating" : "Rate this movie"}
        className={cn(
          "flex flex-col items-center justify-center gap-0.5 p-2 rounded-lg font-medium transition-colors min-w-[72px] min-h-[72px] aspect-square overflow-hidden",
          userRating !== null
            ? "bg-[var(--surface-2)]/60 text-[var(--text-primary)] border border-[var(--border)]/50 hover:border-[var(--primary)]/50"
            : "bg-[var(--surface-2)]/60 text-[var(--text-secondary)] border border-[var(--border)]/50 hover:border-[var(--primary)]/50 hover:text-[var(--primary)]",
          "disabled:opacity-50 disabled:cursor-not-allowed"
        )}
      >
        {isRatingLoading ? (
          <CircleNotch className="w-4 h-4 lg:w-5 lg:h-5 animate-spin" />
        ) : userRating !== null ? (
          <span className="flex items-baseline tabular-nums">
            <span className="text-2xl lg:text-3xl font-bold leading-none">
              {formatRatingDisplay(userRating)}
            </span>
            <span className="text-[10px] lg:text-xs opacity-40 font-medium self-end mb-0.5 ml-px">
              /10
            </span>
          </span>
        ) : (
          <>
            <Star className="w-4 h-4 lg:w-5 lg:h-5" />
            <span className="text-[10px] lg:text-xs">Rate</span>
          </>
        )}
      </button>

      {/* Rating Modal */}
      <RatingModal
        open={ratingModalOpen}
        onOpenChange={setRatingModalOpen}
        tmdbId={tmdbId}
        movieTitle={movieTitle}
        year={year}
        posterPath={posterPath}
        currentRating={userRating}
        onRated={handleRating}
        onRatedWithRubric={handleRatingWithRubric}
        isSubmitting={isRatingLoading}
        ratingPreferences={ratingPreferences}
        userRubrics={userRubrics}
        onRemoveRating={userRating !== null ? handleRemoveRating : undefined}
      />

      {/* Link Theme Modal (for future nominations) */}
      <ManageThemeLinksModal
        open={linkModalOpen}
        onOpenChange={setLinkModalOpen}
        item={
          futureNomId
            ? {
                id: futureNomId,
                movie: {
                  title: movieTitle,
                  year: year ?? null,
                  poster_url: posterPath ?? null,
                },
              }
            : null
        }
        clubThemes={clubThemes}
        onNominate={async (futureNominationId, clubId, festivalId) => {
          await handleNominate(
            futureNominationId,
            clubId,
            festivalId,
            async () => {},
            () => {}
          );
        }}
        onLinksChanged={() => router.refresh()}
        loading={linkingLoading}
        onRemove={
          futureNomId
            ? async () => {
                const result = await removeFromFutureNominations(futureNomId);
                if ("error" in result && result.error) {
                  toast.error(result.error);
                } else {
                  setIsInFutureNomList(false);
                  setFutureNomId(null);
                  setLinkModalOpen(false);
                  toast.success("Removed from future nominations");
                  router.refresh();
                }
              }
            : undefined
        }
      />
    </div>
  );
}

export function MovieActionsSkeleton({ className }: { className?: string }) {
  return (
    <div className={cn("grid grid-cols-3 gap-2 w-fit", className)} aria-hidden="true">
      {[0, 1, 2].map((i) => (
        <Skeleton key={i} className="min-w-[72px] min-h-[72px] aspect-square rounded-lg" />
      ))}
    </div>
  );
}
