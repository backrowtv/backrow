"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { CaretLeft, CaretRight } from "@phosphor-icons/react";
import { FlipCountdown } from "@/components/ui/flip-countdown";
import { MovieCarousel, type CarouselMovie } from "./MovieCarousel";
import { MovieGridModal } from "../modals/MovieGridModal";
import { EndlessRatingModal } from "../endless/EndlessRatingModal";
import { markMovieWatched, unmarkMovieWatched } from "@/app/actions/endless-festival";
import { createRating } from "@/app/actions/ratings";
import { advanceFestivalPhase, revertFestivalPhase } from "@/app/actions/festivals";
import type { ClubRatingSettings } from "../endless/EndlessFestivalSection";
import toast from "react-hot-toast";

interface EnhancedCarouselMovie extends CarouselMovie {
  isWatched?: boolean;
  isRated?: boolean;
  userRating?: number;
}

interface FestivalCarouselWrapperProps {
  festivalId: string;
  festivalSlug: string;
  clubId: string;
  clubSlug: string;
  clubName: string;
  movies: EnhancedCarouselMovie[];
  theme: string;
  ratingDeadline: string | null;
  guessingEnabled: boolean;
  isAdmin: boolean;
  isMember: boolean;
  currentUserId: string;
  festivalType?: "standard" | "endless";
  ratingSettings: ClubRatingSettings;
}

export function FestivalCarouselWrapper({
  festivalId,
  festivalSlug,
  clubId,
  clubSlug,
  movies,
  theme,
  ratingDeadline,
  guessingEnabled,
  isAdmin,
  isMember,
  currentUserId,
  ratingSettings,
}: FestivalCarouselWrapperProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [gridModalOpen, setGridModalOpen] = useState(false);
  const [ratingModalOpen, setRatingModalOpen] = useState(false);
  const [selectedMovieId, setSelectedMovieId] = useState<string | null>(null);

  // Get the selected movie for rating modal
  const selectedMovie = selectedMovieId ? movies.find((m) => m.id === selectedMovieId) : null;

  // Convert to rating modal format
  const ratingMovie = selectedMovie
    ? {
        id: selectedMovie.id,
        tmdb_id: selectedMovie.tmdb_id || 0,
        title: selectedMovie.title,
        year: selectedMovie.year,
        poster_url: selectedMovie.poster_url,
        director: selectedMovie.director || null,
      }
    : null;

  // Handle mark watched
  const handleMarkWatched = async (movieId: string) => {
    const movie = movies.find((m) => m.id === movieId);
    if (!movie?.tmdb_id) return;

    const isCurrentlyWatched = movie.isWatched ?? false;

    startTransition(async () => {
      if (isCurrentlyWatched) {
        const result = await unmarkMovieWatched(movie.tmdb_id!);
        if ("error" in result) {
          toast.error(result.error);
        } else {
          toast.success("Removed from watch history");
          router.refresh();
        }
      } else {
        const result = await markMovieWatched(movie.tmdb_id!, {
          clubId,
          clubSlug,
          festivalId,
        });
        if ("error" in result) {
          toast.error(result.error);
        } else {
          toast.success("Added to watch history!");
          router.refresh();
        }
      }
    });
  };

  // Handle open rating modal
  const handleRate = (movieId: string) => {
    setSelectedMovieId(movieId);
    setRatingModalOpen(true);
  };

  // Handle submit rating
  const handleSubmitRating = async (rating: number) => {
    if (!selectedMovieId) return;

    startTransition(async () => {
      const formData = new FormData();
      formData.append("festivalId", festivalId);
      formData.append("nominationId", selectedMovieId);
      formData.append("rating", rating.toString());

      const result = await createRating(null, formData);

      if (result && "error" in result && result.error) {
        toast.error(result.error);
      } else {
        toast.success("Rating submitted!");
        setRatingModalOpen(false);
        router.refresh();
      }
    });
  };

  // Handle guess nominator
  const handleGuessNominator = (movieId: string) => {
    router.push(`/club/${clubSlug}/festival/${festivalSlug}?guess=${movieId}`);
  };

  // Handle phase navigation (admin only)
  const handlePrevPhase = async () => {
    startTransition(async () => {
      const result = await revertFestivalPhase(festivalId);
      if ("error" in result && result.error) {
        toast.error(result.error);
      } else {
        toast.success("Phase reverted");
        router.refresh();
      }
    });
  };

  const handleNextPhase = async () => {
    startTransition(async () => {
      const result = await advanceFestivalPhase(festivalId);
      if ("error" in result && result.error) {
        toast.error(result.error);
      } else {
        toast.success("Phase advanced");
        router.refresh();
      }
    });
  };

  const festivalUrl = `/club/${clubSlug}/festival/${festivalSlug}`;

  return (
    <div className="space-y-4">
      {/* Header Section */}
      <div className="text-center">
        {/* 1. Festival Title - TOP */}
        <h2
          className="text-xl md:text-2xl font-bold mb-2"
          style={{ color: "var(--club-accent, var(--text-primary))" }}
        >
          {theme}
        </h2>

        {/* 2. Phase Progress Breadcrumbs */}
        <div className="flex items-center justify-center gap-3 text-xs mb-4">
          {isAdmin && (
            <button
              onClick={handlePrevPhase}
              disabled={isPending}
              className="p-1 rounded transition-colors hover:bg-[var(--surface-2)] hover:text-[var(--primary)]"
              style={{ color: "var(--text-muted)" }}
              title="Go to previous phase"
            >
              <CaretLeft className="h-4 w-4" />
            </button>
          )}

          <div className="flex items-center">
            <Link
              href={festivalUrl}
              className="px-1.5 py-0.5 rounded transition-all opacity-60 hover:opacity-80"
              style={{ color: "var(--text-muted)" }}
            >
              Theme
            </Link>
            <span
              className="mx-1.5 text-[10px]"
              style={{ color: "var(--text-muted)", opacity: 0.4 }}
            >
              •
            </span>
            <Link
              href={festivalUrl}
              className="px-1.5 py-0.5 rounded transition-all opacity-60 hover:opacity-80"
              style={{ color: "var(--text-muted)" }}
            >
              Nominate
            </Link>
            <span
              className="mx-1.5 text-[10px]"
              style={{ color: "var(--text-muted)", opacity: 0.4 }}
            >
              •
            </span>
            <span
              className="px-1.5 py-0.5 rounded font-medium"
              style={{ color: "var(--text-primary)", backgroundColor: "var(--surface-2)" }}
            >
              Watch
            </span>
            <span
              className="mx-1.5 text-[10px]"
              style={{ color: "var(--text-muted)", opacity: 0.4 }}
            >
              •
            </span>
            <Link
              href={festivalUrl}
              className="px-1.5 py-0.5 rounded transition-all opacity-40 hover:opacity-60"
              style={{ color: "var(--text-muted)" }}
            >
              Results
            </Link>
          </div>

          {isAdmin && (
            <button
              onClick={handleNextPhase}
              disabled={isPending}
              className="p-1 rounded transition-colors hover:bg-[var(--surface-2)] hover:text-[var(--primary)]"
              style={{ color: "var(--text-muted)" }}
              title="Go to next phase"
            >
              <CaretRight className="h-4 w-4" />
            </button>
          )}
        </div>

        {/* 3. Flip Countdown Timer */}
        {ratingDeadline && (
          <div className="mb-4">
            <FlipCountdown
              deadline={ratingDeadline}
              label="Ratings close"
              showDays={true}
              showSeconds={true}
              size="compact"
            />
          </div>
        )}
      </div>

      {/* Movie Carousel */}
      <MovieCarousel
        movies={movies}
        context="regular"
        clubSlug={clubSlug}
        currentUserId={currentUserId}
        isAdmin={isAdmin}
        onMarkWatched={isMember ? handleMarkWatched : undefined}
        onRate={isMember && ratingSettings.club_ratings_enabled ? handleRate : undefined}
        onGuessNominator={isMember && guessingEnabled ? handleGuessNominator : undefined}
        showGuessNominator={guessingEnabled}
        showRating={ratingSettings.club_ratings_enabled}
        detailsUrl={festivalUrl}
      />

      {/* Grid Modal */}
      <MovieGridModal
        open={gridModalOpen}
        onOpenChange={setGridModalOpen}
        movies={movies}
        context="regular"
        onMarkWatched={isMember ? handleMarkWatched : undefined}
        onRate={isMember && ratingSettings.club_ratings_enabled ? handleRate : undefined}
        showGuessNominator={guessingEnabled}
        showRating={ratingSettings.club_ratings_enabled}
      />

      {/* Rating Modal */}
      <EndlessRatingModal
        open={ratingModalOpen}
        onOpenChange={setRatingModalOpen}
        movie={ratingMovie}
        ratingSettings={ratingSettings}
        onSubmit={handleSubmitRating}
        isSubmitting={isPending}
      />
    </div>
  );
}
