"use client";

import { createRating } from "@/app/actions/ratings";
import { saveGuesses } from "@/app/actions/guesses";
import type { FestivalRubricLock } from "@/app/actions/rubrics.types";
import { updateClubRubricPreference } from "@/app/actions/club-rubrics";
import { formatRatingDisplay } from "@/lib/ratings/normalize";
import { useEffect, startTransition, useMemo } from "react";
import { useRouter } from "next/navigation";
import { useRatingCarousel } from "./hooks/useRatingCarousel";
import { useRubricSetup } from "./hooks/useRubricSetup";
import { Database } from "@/types/database";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { EmptyState } from "@/components/shared/EmptyState";
import { Star as StarIcon } from "@phosphor-icons/react";
import { RubricRatingModal } from "./RubricRatingModal";
import { RubricSelectionModal } from "./RubricSelectionModal";
import { Text } from "@/components/ui/typography";
import Image from "next/image";
import { cn } from "@/lib/utils";
import toast from "react-hot-toast";
import type { RatingRubric, RubricEnforcement } from "@/types/club-settings";
import { Star, Popcorn, Ticket, FilmStrip } from "@phosphor-icons/react";

type Nomination = Database["public"]["Tables"]["nominations"]["Row"];
type Movie = Database["public"]["Tables"]["movies"]["Row"];
type ClubMember = Database["public"]["Tables"]["club_members"]["Row"];
type User = Database["public"]["Tables"]["users"]["Row"];

interface RateMoviesListProps {
  nominations: (Nomination & {
    movies: Movie | null;
  })[];
  festivalId: string;
  festivalName?: string;
  clubId: string;
  clubName?: string;
  currentUserId: string;
  ratedNominationIds: Set<string>;
  isRatingPhase: boolean;
  members: (ClubMember & { users: User | null })[];
  existingGuesses: Record<string, string> | null;
  canGuess: boolean;
  memberCount: number;
  clubAverages: Record<string, number>;
  clubSettings?: {
    club_ratings_enabled?: boolean;
    rating_min?: number;
    rating_max?: number;
    rating_increment?: number;
    rating_slider_icon?: "default" | "stars" | "popcorn" | "ticket" | "film";
    rating_rubrics?: RatingRubric[];
    rating_rubric_name?: string;
    rubric_enforcement?: RubricEnforcement;
  };
}

const _ratingLabels: Record<number, string> = {
  1: "Poor",
  2: "Fair",
  3: "Good",
  4: "Very Good",
  5: "Excellent",
};

export function RateMoviesList({
  nominations,
  festivalId,
  festivalName,
  clubId,
  clubName,
  currentUserId,
  ratedNominationIds,
  isRatingPhase,
  members,
  existingGuesses,
  canGuess,
  memberCount: _memberCount,
  clubAverages,
  clubSettings,
}: RateMoviesListProps) {
  const router = useRouter();

  // Filter out own nominations and movies without data
  const rateableNominations = nominations.filter(
    (nom) => nom.user_id !== currentUserId && nom.movies
  );

  // Use custom hook for grouped state management (reduces 15+ useState hooks)
  const {
    // UI State
    currentIndex,
    setCurrentIndex,
    filterTab,
    setFilterTab,
    rubricModalOpen,
    setRubricModalOpen,
    showRubricSelectionModal,
    setShowRubricSelectionModal,
    // Rating State
    rating,
    setRating,
    rubricRatings,
    setRubricRatings,
    selectedRubricId,
    setSelectedRubricId,
    resetRating,
    // Submission State
    submittingId,
    setSubmittingId,
    errors,
    setError,
    clearError,
    // Guess State
    guesses,
    setGuesses,
    updateGuess,
    savingGuess,
    setSavingGuess,
    guessErrors,
    setGuessError,
    revertGuess,
    // Rubric State
    personalRubrics,
    setPersonalRubrics,
    rubricLock,
    setRubricLock,
    activeRubric,
    setActiveRubric,
    // Refs
    saveTimeoutRefs,
  } = useRatingCarousel({ existingGuesses });

  // Get rating settings from club settings
  const ratingMin = clubSettings?.rating_min ?? 0;
  const ratingMax = clubSettings?.rating_max ?? 10;
  const ratingIncrement = clubSettings?.rating_increment ?? 0.1;
  const ratingSliderIcon = clubSettings?.rating_slider_icon ?? "default";
  const clubRubricCategories = clubSettings?.rating_rubrics ?? [];
  const clubRubricName = clubSettings?.rating_rubric_name;
  const rubricEnforcement = clubSettings?.rubric_enforcement ?? "off";

  // Determine if we should use rubrics for this rating
  const useRubrics = activeRubric !== null && activeRubric.categories.length > 0;
  const ratingRubrics = activeRubric?.categories ?? [];

  // Rubric initialization: check locks, show selection modal, fetch personal rubrics
  const ratedSoFar = rateableNominations.filter((nom) => ratedNominationIds.has(nom.id)).length;
  useRubricSetup({
    festivalId,
    rubricEnforcement,
    isRatingPhase,
    rateableNominationCount: rateableNominations.length,
    ratedCount: ratedSoFar,
    useRubrics,
    setRubricLock,
    setActiveRubric,
    setShowRubricSelectionModal,
    setPersonalRubrics,
    rubricLock,
  });

  // Filter nominations based on tab (memoized for performance)
  const filteredNominations = useMemo(
    () =>
      rateableNominations.filter((nom) => {
        const isRated = ratedNominationIds.has(nom.id);
        if (filterTab === "rated") return isRated;
        if (filterTab === "unrated") return !isRated;
        return true; // 'all'
      }),
    [rateableNominations, ratedNominationIds, filterTab]
  );

  // Handle rubric selection completion
  const handleRubricSelectionComplete = (selection: {
    rubricId?: string;
    rubricSnapshot?: { name: string; categories: RatingRubric[] };
    useClubRubric: boolean;
    optedOut: boolean;
  }) => {
    if (selection.optedOut) {
      setActiveRubric(null);
    } else if (selection.rubricSnapshot) {
      setActiveRubric({
        name: selection.rubricSnapshot.name,
        categories: selection.rubricSnapshot.categories,
      });
    }
    // The lock has been created by the modal, update our state
    setRubricLock({} as FestivalRubricLock); // Just mark as locked
  };

  // Update current index when filter changes
  useEffect(() => {
    if (currentIndex >= filteredNominations.length) {
      startTransition(() => {
        setCurrentIndex(Math.max(0, filteredNominations.length - 1));
      });
    }
  }, [filterTab, filteredNominations.length, currentIndex, setCurrentIndex]);

  const currentNomination = filteredNominations[currentIndex];
  const currentMovie = currentNomination?.movies;
  const isRated = currentNomination ? ratedNominationIds.has(currentNomination.id) : false;
  const clubAverage = currentNomination ? clubAverages[currentNomination.id] : undefined;

  // Reset rating state when nomination changes
  useEffect(() => {
    if (currentNomination) {
      resetRating();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- Only reset when nomination ID changes, not the entire object
  }, [currentNomination?.id, resetRating]);

  // Calculate counts (memoized for performance)
  const { totalMovies, ratedCount, unratedCount } = useMemo(() => {
    const total = rateableNominations.length;
    const rated = rateableNominations.filter((nom) => ratedNominationIds.has(nom.id)).length;
    return { totalMovies: total, ratedCount: rated, unratedCount: total - rated };
  }, [rateableNominations, ratedNominationIds]);

  // Filter out current user from members list (memoized)
  const otherMembers = useMemo(
    () => members.filter((member) => member.user_id !== currentUserId),
    [members, currentUserId]
  );

  // Update guesses when existingGuesses changes
  useEffect(() => {
    if (existingGuesses) {
      startTransition(() => {
        setGuesses(existingGuesses);
      });
    }
  }, [existingGuesses, setGuesses]);

  // Cleanup timeouts on unmount
  useEffect(() => {
    const currentRefs = saveTimeoutRefs.current;
    return () => {
      Object.values(currentRefs).forEach((timeout) => {
        if (timeout) clearTimeout(timeout);
      });
    };
  }, [saveTimeoutRefs]);

  async function handleSubmit() {
    if (!currentNomination || !rating || submittingId) return;

    // Validate rating is within bounds
    if (rating < ratingMin || rating > ratingMax) {
      setError(currentNomination.id, `Rating must be between ${ratingMin} and ${ratingMax}`);
      return;
    }

    setSubmittingId(currentNomination.id);
    clearError(currentNomination.id);

    const formData = new FormData();
    formData.append("festivalId", festivalId);
    formData.append("nominationId", currentNomination.id);
    formData.append("rating", rating.toString());

    const result = await createRating(null, formData);

    if (result && "error" in result && result.error) {
      setError(currentNomination.id, result.error || "");
      toast.error(result.error);
    } else {
      toast.success("Rating submitted!");
      // Move to next unrated movie
      const nextIndex = filteredNominations.findIndex(
        (nom, idx) => idx > currentIndex && !ratedNominationIds.has(nom.id)
      );
      if (nextIndex !== -1) {
        setCurrentIndex(nextIndex);
      } else if (currentIndex < filteredNominations.length - 1) {
        setCurrentIndex(currentIndex + 1);
      }
      // Refresh server data to show updated ratings
      setTimeout(() => {
        router.refresh();
      }, 500);
    }

    setSubmittingId(null);
  }

  function skipMovie() {
    if (currentIndex > 0) {
      setCurrentIndex(currentIndex - 1);
    }
  }

  function jumpToMovie(index: number) {
    setCurrentIndex(index);
  }

  async function handleGuessChange(nominationId: string, guessedUserId: string) {
    const newGuesses = {
      ...guesses,
      [nominationId]: guessedUserId,
    };
    updateGuess(nominationId, guessedUserId);

    // Clear existing timeout for this nomination
    if (saveTimeoutRefs.current[nominationId]) {
      clearTimeout(saveTimeoutRefs.current[nominationId]);
    }

    // Auto-save after a short delay
    setSavingGuess(nominationId);
    saveTimeoutRefs.current[nominationId] = setTimeout(async () => {
      const result = await saveGuesses(festivalId, newGuesses);
      setSavingGuess(null);

      if (result && "error" in result && result.error) {
        setGuessError(nominationId, result.error);
        toast.error(result.error);
        // Revert to previous guess
        revertGuess(nominationId, existingGuesses?.[nominationId]);
      } else {
        toast.success("Guess saved!");
      }
      delete saveTimeoutRefs.current[nominationId];
    }, 500);
  }

  if (!isRatingPhase) {
    return null;
  }

  if (rateableNominations.length === 0) {
    return (
      <EmptyState
        icon={StarIcon}
        title="No ratings yet"
        message="Start rating movies to see how they stack up!"
        variant="inline"
      />
    );
  }

  const guessedUserId = currentNomination ? guesses[currentNomination.id] || "" : "";
  const hasGuess = !!guessedUserId;
  const isSavingGuess = currentNomination ? savingGuess === currentNomination.id : false;
  const guessError = currentNomination ? guessErrors[currentNomination.id] : "";

  return (
    <>
      {/* Rubric Selection Modal - shown on first rating in festival */}
      <RubricSelectionModal
        open={showRubricSelectionModal}
        onOpenChange={setShowRubricSelectionModal}
        festivalId={festivalId}
        festivalName={festivalName}
        clubName={clubName}
        clubRubricEnforcement={rubricEnforcement}
        clubRubricCategories={clubRubricCategories}
        clubRubricName={clubRubricName}
        onSelectionComplete={handleRubricSelectionComplete}
      />

      {/* Progress Header */}
      <Card className="mb-6">
        <CardContent className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h1 className="text-2xl font-bold" style={{ color: "var(--text-primary)" }}>
              Rate Movies
            </h1>
            <Badge variant="secondary">
              {ratedCount}/{totalMovies} Rated
            </Badge>
          </div>
          <Progress value={(ratedCount / totalMovies) * 100} className="mb-2" />
          <p className="text-sm" style={{ color: "var(--text-muted)" }}>
            Rate all movies to qualify for festival rewards
          </p>
        </CardContent>
      </Card>

      {/* Filter Tabs */}
      <Tabs
        value={filterTab}
        onValueChange={(v) => setFilterTab(v as typeof filterTab)}
        className="mb-6"
      >
        <TabsList>
          <TabsTrigger value="all">All ({totalMovies})</TabsTrigger>
          <TabsTrigger value="unrated">Not Rated ({unratedCount})</TabsTrigger>
          <TabsTrigger value="rated">Rated ({ratedCount})</TabsTrigger>
        </TabsList>
      </Tabs>

      {filteredNominations.length === 0 ? (
        <Card>
          <CardContent className="p-6 text-center">
            <p className="text-sm" style={{ color: "var(--text-secondary)" }}>
              No movies match this filter.
            </p>
          </CardContent>
        </Card>
      ) : currentNomination && currentMovie ? (
        <>
          {/* Rating Interface - One by One */}
          <Card className="overflow-hidden">
            <CardContent className="p-0">
              <div className="aspect-[2/3] relative max-h-[500px] bg-black">
                <Image
                  src={currentMovie.poster_url || "/placeholder-poster.png"}
                  alt={currentMovie.title || "Movie poster"}
                  fill
                  className="object-contain"
                />
              </div>

              <div className="p-6 space-y-4">
                <div className="text-center">
                  <h2 className="text-2xl font-bold" style={{ color: "var(--text-primary)" }}>
                    {currentMovie.title}
                  </h2>
                  <p className="text-sm" style={{ color: "var(--text-muted)" }}>
                    {currentMovie.year} • {currentMovie.runtime} •{" "}
                    {currentMovie.genres?.[0] || "Unknown"}
                  </p>
                </div>

                {currentNomination.pitch && (
                  <div
                    className="text-center pt-4 border-t"
                    style={{ borderColor: "var(--border)" }}
                  >
                    <p className="text-sm" style={{ color: "var(--text-secondary)" }}>
                      {currentNomination.pitch}
                    </p>
                  </div>
                )}

                {/* Guessing Interface - Only show during watch_rate phase, when canGuess is true */}
                {canGuess && otherMembers.length > 0 && (
                  <div className="pt-4 border-t" style={{ borderColor: "var(--border)" }}>
                    <div className="space-y-2">
                      <Label>Who nominated this movie?</Label>
                      <div className="flex items-start gap-3">
                        <div className="flex-1">
                          <Select
                            value={guessedUserId}
                            onChange={(e) =>
                              handleGuessChange(currentNomination.id, e.target.value)
                            }
                            disabled={isSavingGuess}
                            className="w-full"
                          >
                            <option value="">Select a member...</option>
                            {otherMembers.map((member) => {
                              const displayName =
                                member.club_display_name ||
                                member.users?.display_name ||
                                member.users?.email ||
                                "Unknown User";
                              return (
                                <option key={member.user_id} value={member.user_id}>
                                  {displayName}
                                </option>
                              );
                            })}
                          </Select>
                          {guessError && (
                            <p className="mt-1 text-xs" style={{ color: "var(--error)" }}>
                              {guessError}
                            </p>
                          )}
                        </div>
                        {hasGuess && (
                          <div className="flex-shrink-0 pt-2">
                            <div
                              className="flex items-center gap-2 text-sm"
                              style={{ color: "var(--success)" }}
                            >
                              {isSavingGuess ? (
                                <>
                                  <svg
                                    className="animate-spin h-4 w-4"
                                    xmlns="http://www.w3.org/2000/svg"
                                    fill="none"
                                    viewBox="0 0 24 24"
                                  >
                                    <circle
                                      className="opacity-25"
                                      cx="12"
                                      cy="12"
                                      r="10"
                                      stroke="currentColor"
                                      strokeWidth="4"
                                    ></circle>
                                    <path
                                      className="opacity-75"
                                      fill="currentColor"
                                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                                    ></path>
                                  </svg>
                                  <span>Saving...</span>
                                </>
                              ) : (
                                <>
                                  <svg
                                    className="w-4 h-4"
                                    fill="none"
                                    stroke="currentColor"
                                    viewBox="0 0 24 24"
                                  >
                                    <path
                                      strokeLinecap="round"
                                      strokeLinejoin="round"
                                      strokeWidth={2}
                                      d="M5 13l4 4L19 7"
                                    />
                                  </svg>
                                  <span>Guessed</span>
                                </>
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )}

                {isRated ? (
                  <div
                    className="text-center pt-4 border-t"
                    style={{ borderColor: "var(--border)" }}
                  >
                    <p className="text-sm" style={{ color: "var(--success)" }}>
                      You have already rated this movie.
                    </p>
                  </div>
                ) : (
                  <>
                    {useRubrics ? (
                      <div className="pt-4 border-t" style={{ borderColor: "var(--border)" }}>
                        <div className="flex items-center justify-between">
                          <div>
                            <Text size="sm" className="font-medium">
                              Rating: {rating > 0 ? formatRatingDisplay(rating) : "Not rated"}
                            </Text>
                            <Text size="tiny" muted>
                              {ratingRubrics.length} categories
                            </Text>
                          </div>
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => setRubricModalOpen(true)}
                            disabled={submittingId === currentNomination.id}
                          >
                            {rating > 0 ? "Edit Rating" : "Rate Movie"}
                          </Button>
                        </div>
                        <RubricRatingModal
                          rubrics={ratingRubrics}
                          onRatingChange={(newRating, newRubricRatings) => {
                            setRating(newRating);
                            setRubricRatings(newRubricRatings);
                          }}
                          initialRatings={rubricRatings}
                          disabled={submittingId === currentNomination.id}
                          open={rubricModalOpen}
                          onOpenChange={setRubricModalOpen}
                          movieTitle={currentMovie?.title}
                          personalRubrics={personalRubrics}
                          selectedRubricId={selectedRubricId}
                          onRubricSelect={(rubricId) => {
                            setSelectedRubricId(rubricId);
                            // Save rubric preference to club_members.preferences.default_rubric_id
                            startTransition(async () => {
                              await updateClubRubricPreference(clubId, rubricId);
                            });
                          }}
                        />
                      </div>
                    ) : (
                      <div className="text-center space-y-2">
                        <Label>Your Rating</Label>
                        {/* Numeric Rating with Slider */}
                        <div className="space-y-3">
                          <div className="text-center">
                            <span
                              className="text-3xl font-bold tabular-nums"
                              style={{
                                color: rating > 0 ? "var(--primary)" : "var(--text-muted)",
                              }}
                            >
                              {rating > 0 ? formatRatingDisplay(rating) : "—"}
                            </span>
                            <span className="text-sm ml-1" style={{ color: "var(--text-muted)" }}>
                              / {ratingMax}
                            </span>
                          </div>
                          <div className="px-2 touch-none">
                            <div className="relative">
                              <input
                                type="range"
                                min={ratingMin}
                                max={ratingMax}
                                step={ratingIncrement}
                                value={rating || ratingMin}
                                onChange={(e) => {
                                  const value = parseFloat(e.target.value);
                                  const snapped =
                                    Math.round(value / ratingIncrement) * ratingIncrement;
                                  setRating(Math.max(ratingMin, Math.min(ratingMax, snapped)));
                                }}
                                disabled={submittingId === currentNomination.id}
                                className={cn(
                                  "w-full h-2 rounded-full appearance-none cursor-pointer relative z-10 touch-action-none",
                                  ratingSliderIcon === "default"
                                    ? "[&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:h-5 [&::-webkit-slider-thumb]:w-5 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-[var(--primary)] [&::-webkit-slider-thumb]:border-2 [&::-webkit-slider-thumb]:border-[var(--background)] [&::-webkit-slider-thumb]:shadow-md [&::-webkit-slider-thumb]:cursor-pointer [&::-webkit-slider-thumb]:transition-transform [&::-webkit-slider-thumb]:hover:scale-110"
                                    : "[&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:h-5 [&::-webkit-slider-thumb]:w-5 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-transparent [&::-webkit-slider-thumb]:border-0 [&::-webkit-slider-thumb]:shadow-none [&::-webkit-slider-thumb]:cursor-pointer",
                                  ratingSliderIcon === "default"
                                    ? "[&::-moz-range-thumb]:h-5 [&::-moz-range-thumb]:w-5 [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:bg-[var(--primary)] [&::-moz-range-thumb]:border-2 [&::-moz-range-thumb]:border-[var(--background)] [&::-moz-range-thumb]:cursor-pointer"
                                    : "[&::-moz-range-thumb]:h-5 [&::-moz-range-thumb]:w-5 [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:bg-transparent [&::-moz-range-thumb]:border-0 [&::-moz-range-thumb]:shadow-none [&::-moz-range-thumb]:cursor-pointer",
                                  "disabled:cursor-not-allowed disabled:opacity-50"
                                )}
                                style={{
                                  background:
                                    rating > 0
                                      ? `linear-gradient(to right, var(--primary) 0%, var(--primary) ${((rating - ratingMin) / (ratingMax - ratingMin)) * 100}%, var(--surface-2) ${((rating - ratingMin) / (ratingMax - ratingMin)) * 100}%, var(--surface-2) 100%)`
                                      : "var(--surface-2)",
                                }}
                              />
                              {/* Custom icon thumb overlay */}
                              {ratingSliderIcon !== "default" &&
                                (() => {
                                  const percent =
                                    ((rating || ratingMin) - ratingMin) / (ratingMax - ratingMin);
                                  const thumbRadius = 12;
                                  return (
                                    <div
                                      className="absolute top-1/2 -translate-y-1/2 pointer-events-none flex items-center justify-center w-6 h-6 rounded-full bg-[var(--primary)] shadow-md z-20"
                                      style={{
                                        left: `calc(${percent * 100}% + ${thumbRadius - percent * thumbRadius * 2}px - ${thumbRadius}px)`,
                                        color: "white",
                                      }}
                                    >
                                      {ratingSliderIcon === "stars" && (
                                        <Star weight="fill" className="w-3.5 h-3.5" />
                                      )}
                                      {ratingSliderIcon === "popcorn" && (
                                        <Popcorn weight="fill" className="w-3.5 h-3.5" />
                                      )}
                                      {ratingSliderIcon === "ticket" && (
                                        <Ticket weight="fill" className="w-3.5 h-3.5" />
                                      )}
                                      {ratingSliderIcon === "film" && (
                                        <FilmStrip weight="fill" className="w-3.5 h-3.5" />
                                      )}
                                    </div>
                                  );
                                })()}
                            </div>
                            <div className="flex justify-between mt-1">
                              <span className="text-xs" style={{ color: "var(--text-muted)" }}>
                                {ratingMin}
                              </span>
                              <span className="text-xs" style={{ color: "var(--text-muted)" }}>
                                {ratingMax}
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>
                    )}

                    {clubAverage && (
                      <div
                        className="text-center pt-4 border-t"
                        style={{ borderColor: "var(--border)" }}
                      >
                        <p className="text-sm" style={{ color: "var(--text-muted)" }}>
                          Club Average:{" "}
                          <span className="font-semibold">
                            {formatRatingDisplay(clubAverage)} ★
                          </span>
                        </p>
                      </div>
                    )}

                    {errors[currentNomination.id] && (
                      <div
                        className="rounded-md p-3 text-sm"
                        style={{
                          backgroundColor: "var(--error)",
                          color: "var(--text-primary)",
                          opacity: 0.1,
                        }}
                      >
                        <span style={{ color: "var(--error)" }}>
                          {errors[currentNomination.id]}
                        </span>
                      </div>
                    )}

                    <div className="flex gap-3">
                      <Button
                        variant="outline"
                        className="flex-1"
                        onClick={skipMovie}
                        disabled={currentIndex === 0}
                      >
                        ← Skip
                      </Button>
                      <Button
                        className="flex-1"
                        onClick={handleSubmit}
                        disabled={!rating || submittingId === currentNomination.id}
                        isLoading={submittingId === currentNomination.id}
                      >
                        {currentIndex === filteredNominations.length - 1
                          ? "Finish"
                          : "Rate & Next →"}
                      </Button>
                    </div>

                    <div className="text-center text-sm" style={{ color: "var(--text-muted)" }}>
                      Movie {currentIndex + 1} of {filteredNominations.length}
                    </div>
                  </>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Quick Jump */}
          <Card className="mt-6">
            <CardHeader>
              <CardTitle className="text-base">Quick Jump</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex gap-2 flex-wrap">
                {filteredNominations.map((nomination, index) => {
                  const isRated = ratedNominationIds.has(nomination.id);
                  return (
                    <Button
                      key={nomination.id}
                      variant={currentIndex === index ? "primary" : "outline"}
                      size="sm"
                      className={cn("w-10 h-10 p-0", isRated && "bg-primary/10")}
                      onClick={() => jumpToMovie(index)}
                    >
                      {index + 1}
                    </Button>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </>
      ) : null}
    </>
  );
}
