"use client";

import { useState, useTransition, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  FestivalHeroCard,
  FestivalAdminPanel,
  FestivalOverviewPanel,
  FestivalProgressChecklist,
  YourNominationSection,
  FestivalPrivateNotes,
  ForYourConsiderationCarousel,
  NominateMovieModal,
  MovieCarousel,
  type CarouselMovie,
} from "@/components/festivals";
import {
  MemberWatchProgress,
  type MemberWatchProgressEntry,
} from "@/components/festivals/display/MemberWatchProgress";
import { MoviePodium } from "@/components/results/MoviePodium";
import { RatingsTab } from "@/components/results/RatingsTab";
import { GuessesTab } from "@/components/results/GuessesTab";
import { ResultsListTab } from "@/components/results/ResultsListTab";
import { Card, CardContent } from "@/components/ui/card";
import { DebossedTabs } from "@/components/ui/debossed-tabs";
import { Clock, Star, CalendarBlank, ListNumbers, Target, Play } from "@phosphor-icons/react";
import { Button } from "@/components/ui/button";
import type {
  NominationWithRelations,
  RatingWithRelations,
  GuessWithRelations,
  MemberForResults,
} from "@/types/results";
import { markMovieWatched, unmarkMovieWatched } from "@/app/actions/endless-festival";
import { createRating } from "@/app/actions/ratings";
import { EndlessRatingModal } from "@/components/festivals/endless/EndlessRatingModal";
import type { ClubRatingSettings } from "@/components/festivals/endless/EndlessFestivalSection";
import toast from "react-hot-toast";

type FestivalPhase = "theme_selection" | "nomination" | "watch_rate" | "results";

interface FestivalData {
  id: string;
  slug: string | null;
  theme: string | null;
  phase: FestivalPhase;
  status: string;
  start_date: string;
  created_at?: string | null;
  nomination_deadline: string | null;
  watch_deadline: string | null;
  rating_deadline: string | null;
  results_date: string | null;
  member_count_at_creation: number;
  picture_url?: string | null;
  poster_url?: string | null;
  background_type?: string | null;
  background_value?: string | null;
  keywords?: string[] | null;
  theme_source?: "pool" | "custom" | "random" | null;
}

interface Member {
  id: string;
  user_id: string;
  role: string;
  display_name: string | null;
  username: string | null;
  avatar_url: string | null;
}

interface Nomination {
  id: string;
  tmdb_id: number;
  user_id: string;
  movie_title: string | null;
  poster_url: string | null;
  year: number | null;
  director: string | null;
  slug: string | null;
  runtime: number | null;
  nominator_name: string | null;
  nominator_avatar: string | null;
  pitch: string | null;
}

interface TopTheme {
  id: string;
  theme_name: string;
  votes: number;
}

interface UserNomination {
  id: string;
  tmdb_id: number;
  pitch: string | null;
  movie: {
    title: string;
    poster_url: string | null;
    year: number | null;
    director: string | null;
    slug: string | null;
  } | null;
}

interface PrivateNote {
  id: string;
  tmdb_id: number;
  note: string;
  created_at: string;
  updated_at: string | null;
}

interface FestivalNote {
  id: string;
  note: string;
  created_at: string;
  updated_at: string | null;
}

interface FestivalPageClientProps {
  festival: FestivalData;
  clubSlug: string;
  clubId: string;
  clubName: string;
  festivalSlug: string;
  festivalType: "standard" | "endless";
  themesEnabled: boolean;
  scoringEnabled: boolean;
  guessingEnabled: boolean;
  ratingSettings: ClubRatingSettings;
  isAdmin: boolean;
  isMember: boolean;
  isViewOnly: boolean;
  userId: string | null;
  userRole: "producer" | "director";
  members: Member[];
  nominations: Nomination[];
  topThemes: TopTheme[];
  movieCount: number;
  participantCount: number;
  userNomination: UserNomination | null;
  hasUserNominated: boolean;
  watchedCount: number;
  ratedCount: number;
  averageRating: number | null;
  watchedTmdbIds: number[];
  userRatings: { nomination_id: string; rating: number }[];
  themeSubmitter: { name: string; id: string } | null;
  themeSelector: { name: string; id: string } | null;
  seasonInfo: { name: string; number: number } | null;
  resultsData: {
    movieRankings: Array<{
      rank: number;
      nomination_id: string;
      movie_title: string;
      poster_url: string | null;
      average_rating: number;
      rating_count: number;
      nominator_name: string;
      nominator_id: string | null;
      nominator_avatar: string | null;
    }>;
    standings: Array<{
      user_id: string;
      user_name: string;
      points: number;
    }>;
  } | null;
  resultsRatings: Array<{
    id: string;
    nomination_id: string;
    user_id: string;
    rating: number;
    user: { id: string; display_name: string | null; email: string } | null;
  }>;
  resultsGuesses: Array<{
    id: string;
    user_id: string;
    guesses: Record<string, string>;
    user: { id: string; display_name: string | null; email: string } | null;
  }>;
  resultsNominations: Array<{
    id: string;
    tmdb_id: number;
    user_id: string;
    movie_title: string | null;
    poster_url: string | null;
    user_name: string | null;
  }>;
  resultsMembers: Array<{
    user_id: string;
    display_name: string;
    email: string;
  }>;
  privateNotes: PrivateNote[];
  festivalNotes: FestivalNote[];
  memberWatchProgress?: MemberWatchProgressEntry[];
  autoAdvance?: boolean;
  revealSettings?: {
    type: "automatic" | "manual";
    direction: "forward" | "backward";
    delaySeconds: number;
  };
}

export function FestivalPageClient({
  festival,
  clubSlug,
  clubId,
  clubName,
  festivalSlug,
  festivalType,
  themesEnabled,
  scoringEnabled,
  guessingEnabled,
  ratingSettings,
  isAdmin,
  isMember: _isMember,
  isViewOnly,
  userId,
  userRole,
  members,
  nominations,
  topThemes,
  movieCount,
  participantCount,
  userNomination,
  hasUserNominated,
  watchedCount,
  ratedCount,
  averageRating,
  watchedTmdbIds,
  userRatings,
  themeSubmitter,
  themeSelector,
  seasonInfo,
  resultsData,
  resultsRatings,
  resultsGuesses,
  resultsNominations,
  resultsMembers,
  privateNotes,
  festivalNotes,
  memberWatchProgress = [],
  autoAdvance = false,
  revealSettings,
}: FestivalPageClientProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [isNominateModalOpen, setIsNominateModalOpen] = useState(false);
  const [ratingModalOpen, setRatingModalOpen] = useState(false);
  const [selectedMovieId, setSelectedMovieId] = useState<string | null>(null);
  const [resultsTab, setResultsTab] = useState<string>("rankings");

  // Reveal replay state
  const [isRevealing, setIsRevealing] = useState(false);
  const [revealedCount, setRevealedCount] = useState(0);
  const totalMovies = resultsData?.movieRankings?.length ?? 0;

  const startReveal = useCallback(() => {
    setRevealedCount(0);
    setIsRevealing(true);
    // Switch to Rankings tab so the podium reveal is visible
    setResultsTab("rankings");
  }, []);

  useEffect(() => {
    if (!isRevealing || revealedCount >= totalMovies) {
      if (revealedCount >= totalMovies && isRevealing) {
        setIsRevealing(false);
      }
      return;
    }

    const delay = revealSettings?.delaySeconds ?? 3;
    // First reveal starts after a short countdown, subsequent reveals use configured delay
    const ms = revealedCount === 0 ? 1000 : delay * 1000;

    const timer = setTimeout(() => {
      setRevealedCount((prev) => prev + 1);
    }, ms);

    return () => clearTimeout(timer);
  }, [isRevealing, revealedCount, totalMovies, revealSettings?.delaySeconds]);

  // Create efficient lookups for watched/rated status
  const watchedSet = new Set(watchedTmdbIds);
  const ratingsMap = new Map(userRatings.map((r) => [r.nomination_id, r.rating]));

  // Compute points map once for podium + rankings list
  const pointsMap =
    scoringEnabled && resultsData?.movieRankings
      ? Object.fromEntries(
          resultsData.movieRankings.map((m) => [
            m.nomination_id,
            resultsData.movieRankings.length - m.rank + 1,
          ])
        )
      : undefined;

  // Convert nominations to CarouselMovie format with watched/rated status
  const carouselMovies: CarouselMovie[] = nominations.map((nom) => ({
    id: nom.id,
    tmdb_id: nom.tmdb_id,
    slug: nom.slug,
    title: nom.movie_title || "Unknown",
    year: nom.year,
    poster_url: nom.poster_url,
    runtime: nom.runtime,
    director: nom.director,
    genres: null,
    curator_note: nom.pitch,
    isWatched: watchedSet.has(nom.tmdb_id),
    isRated: ratingsMap.has(nom.id),
    userRating: ratingsMap.get(nom.id),
    nominator: nom.nominator_name
      ? {
          id: nom.user_id,
          display_name: nom.nominator_name,
          avatar_url: nom.nominator_avatar,
        }
      : null,
  }));

  // Get the selected movie for rating modal
  const selectedMovie = selectedMovieId
    ? carouselMovies.find((m) => m.id === selectedMovieId)
    : null;

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

  // Handle rating submission
  const handleSubmitRating = async (rating: number) => {
    if (!selectedMovieId) return;

    startTransition(async () => {
      const formData = new FormData();
      formData.append("festivalId", festival.id);
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

  // Handle mark watched
  const handleMarkWatched = (movieId: string) => {
    const movie = carouselMovies.find((m) => m.id === movieId);
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
          festivalId: festival.id,
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

  // Hero card props
  const heroTopNominations = nominations.slice(0, 5).map((nom) => ({
    id: nom.id,
    tmdb_id: nom.tmdb_id,
    movie_title: nom.movie_title || "Unknown",
    poster_url: nom.poster_url,
    nominator_name: nom.nominator_name || "Member",
    nominator_avatar: nom.nominator_avatar,
  }));

  return (
    <div className="space-y-4">
      {/* Festival Hero Card */}
      <FestivalHeroCard
        festival={festival}
        clubSlug={clubSlug}
        clubName={clubName}
        clubId={clubId}
        festivalType={festivalType}
        themeGovernance="democracy"
        topThemes={topThemes}
        nominationCount={movieCount}
        participantCount={participantCount}
        userHasNominated={hasUserNominated}
        userHasRated={ratedCount > 0}
        isAdmin={isAdmin}
        topNominations={heroTopNominations}
        onPhaseChange={() => router.refresh()}
        themesEnabled={themesEnabled}
        scoringEnabled={scoringEnabled}
        guessingEnabled={guessingEnabled}
        isOnFestivalPage={true}
        autoAdvance={autoAdvance}
        onNominateClick={() => setIsNominateModalOpen(true)}
      />

      {/* Movie Carousel - Watch Phase Only (no card wrapper) */}
      {!isViewOnly && festival.phase === "watch_rate" && carouselMovies.length > 0 && (
        <MovieCarousel
          movies={carouselMovies}
          context="regular"
          clubSlug={clubSlug}
          showRating={scoringEnabled}
          showGuessNominator={guessingEnabled}
          showViewModeToggle={carouselMovies.length > 2}
          storageKey={`festival-view-${festival.id}`}
          festivalTheme={festival.theme}
          currentUserId={userId}
          onMarkWatched={handleMarkWatched}
          onRate={(movieId) => {
            setSelectedMovieId(movieId);
            setRatingModalOpen(true);
          }}
        />
      )}

      {/* 2-Column Layout — flat grid so paired cards share rows for exact height matching */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Phase-Specific Content */}
        {!isViewOnly && (
          <>
            {/* ===== NOMINATION PHASE ===== */}
            {festival.phase === "nomination" && (
              <>
                {/* Row 1: Your Nomination + Festival Overview */}
                {userNomination && (
                  <div className="lg:col-span-8 lg:self-start">
                    <YourNominationSection
                      nomination={userNomination}
                      festivalId={festival.id}
                      clubSlug={clubSlug}
                      festivalSlug={festivalSlug}
                      canEdit={festival.phase === "nomination"}
                    />
                  </div>
                )}
                <div className={`lg:col-span-4 ${!userNomination ? "lg:col-start-9" : ""}`}>
                  <FestivalOverviewPanel
                    festivalId={festival.id}
                    posterUrl={festival.poster_url || null}
                    theme={festival.theme}
                    themeSubmitter={themeSubmitter}
                    themeSelector={themeSelector}
                    themeSource={festival.theme_source || null}
                    createdAt={festival.created_at || festival.start_date}
                    startDate={festival.start_date}
                    participantCount={participantCount}
                    nominationCount={movieCount}
                    season={seasonInfo}
                    isAdmin={isAdmin}
                    nominationDeadline={festival.nomination_deadline}
                    ratingDeadline={festival.rating_deadline}
                    currentPhase={festival.phase}
                  />
                </div>

                {/* Row 2: Admin Controls + Private Notes */}
                {isAdmin && (
                  <div className="lg:col-span-8 self-start">
                    <FestivalAdminPanel
                      festivalId={festival.id}
                      clubId={clubId}
                      clubSlug={clubSlug}
                      festivalSlug={festivalSlug}
                      currentPhase={festival.phase}
                      theme={festival.theme}
                      status={festival.status}
                      members={members}
                      nominations={nominations.map((n) => ({
                        id: n.id,
                        tmdb_id: n.tmdb_id,
                        user_id: n.user_id,
                        movie_title: n.movie_title,
                        nominator_name: n.nominator_name,
                      }))}
                      hasTheme={!!festival.theme}
                      nominationCount={movieCount}
                      userRole={userRole}
                      guessingEnabled={guessingEnabled}
                    />
                  </div>
                )}
                <div className={`lg:col-span-4 self-start ${!isAdmin ? "lg:col-start-9" : ""}`}>
                  <FestivalPrivateNotes festivalId={festival.id} initialNotes={festivalNotes} />
                </div>

                {/* For Your Consideration - Full width below */}
                {userId && (
                  <div className="lg:col-span-12">
                    <ForYourConsiderationCarousel
                      userId={userId}
                      festivalId={festival.id}
                      clubId={clubId}
                      clubSlug={clubSlug}
                      festivalSlug={festivalSlug}
                      festivalTheme={festival.theme}
                      hasNominated={hasUserNominated}
                    />
                  </div>
                )}
              </>
            )}

            {/* ===== WATCH & RATE PHASE ===== */}
            {festival.phase === "watch_rate" && (
              <>
                {/* Progress Checklist - Full width */}
                {carouselMovies.length > 0 && (
                  <div className="lg:col-span-12">
                    <FestivalProgressChecklist
                      carouselMovies={carouselMovies}
                      totalMovies={movieCount}
                      watchedCount={watchedCount}
                      ratedCount={ratedCount}
                      averageRating={averageRating}
                      guessingEnabled={guessingEnabled}
                      privateNotes={privateNotes}
                      clubSlug={clubSlug}
                    />
                  </div>
                )}

                {memberWatchProgress.length > 0 && movieCount > 0 && (
                  <div className="lg:col-span-12">
                    <MemberWatchProgress
                      members={memberWatchProgress}
                      totalMovies={movieCount}
                      excludeUserId={userId}
                    />
                  </div>
                )}

                {/* Row 1: Your Nomination + Festival Overview */}
                {userNomination && (
                  <div className="lg:col-span-8 lg:self-start">
                    <YourNominationSection
                      nomination={userNomination}
                      festivalId={festival.id}
                      clubSlug={clubSlug}
                      festivalSlug={festivalSlug}
                      canEdit={false}
                    />
                  </div>
                )}
                <div className={`lg:col-span-4 ${!userNomination ? "lg:col-start-9" : ""}`}>
                  <FestivalOverviewPanel
                    festivalId={festival.id}
                    posterUrl={festival.poster_url || null}
                    theme={festival.theme}
                    themeSubmitter={themeSubmitter}
                    themeSelector={themeSelector}
                    themeSource={festival.theme_source || null}
                    createdAt={festival.created_at || festival.start_date}
                    startDate={festival.start_date}
                    participantCount={participantCount}
                    nominationCount={movieCount}
                    season={seasonInfo}
                    isAdmin={isAdmin}
                    nominationDeadline={festival.nomination_deadline}
                    ratingDeadline={festival.rating_deadline}
                    currentPhase={festival.phase}
                  />
                </div>

                {/* Row 2: Admin Controls + Private Notes */}
                {isAdmin && (
                  <div className="lg:col-span-8 self-start">
                    <FestivalAdminPanel
                      festivalId={festival.id}
                      clubId={clubId}
                      clubSlug={clubSlug}
                      festivalSlug={festivalSlug}
                      currentPhase={festival.phase}
                      theme={festival.theme}
                      status={festival.status}
                      members={members}
                      nominations={nominations.map((n) => ({
                        id: n.id,
                        tmdb_id: n.tmdb_id,
                        user_id: n.user_id,
                        movie_title: n.movie_title,
                        nominator_name: n.nominator_name,
                      }))}
                      hasTheme={!!festival.theme}
                      nominationCount={movieCount}
                      userRole={userRole}
                      guessingEnabled={guessingEnabled}
                    />
                  </div>
                )}
                <div className={`lg:col-span-4 self-start ${!isAdmin ? "lg:col-start-9" : ""}`}>
                  <FestivalPrivateNotes festivalId={festival.id} initialNotes={festivalNotes} />
                </div>
              </>
            )}

            {/* ===== RESULTS PHASE ===== */}
            {festival.phase === "results" && (
              <>
                {/* Results content — full width left column */}
                <div className="lg:col-span-8 space-y-6">
                  {/* Results summary + replay button */}
                  <div className="flex items-center justify-between">
                    <p className="text-sm text-[var(--text-muted)]">
                      {resultsData?.movieRankings.length
                        ? `${resultsData.movieRankings.length} movies ranked`
                        : "Results are being calculated..."}
                    </p>
                    {resultsData?.movieRankings && resultsData.movieRankings.length > 0 && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={startReveal}
                        disabled={isRevealing}
                      >
                        <Play className="w-3.5 h-3.5 mr-1.5" />
                        {isRevealing
                          ? `Revealing ${revealedCount}/${totalMovies}...`
                          : "Replay Reveal"}
                      </Button>
                    )}
                  </div>

                  {/* Movie Podium */}
                  {resultsData?.movieRankings && resultsData.movieRankings.length > 0 && (
                    <MoviePodium
                      movies={resultsData.movieRankings}
                      scoringEnabled={scoringEnabled}
                      pointsMap={pointsMap}
                      isRevealing={isRevealing}
                      revealedCount={revealedCount}
                      revealDirection={revealSettings?.direction ?? "forward"}
                    />
                  )}

                  {/* Results Tabs — hidden during reveal to avoid spoilers */}
                  {resultsData && !isRevealing && (
                    <Card variant="elevated">
                      <CardContent className="p-4 sm:p-6">
                        <DebossedTabs
                          fullWidth
                          options={[
                            { value: "rankings", label: "Rankings", icon: ListNumbers },
                            { value: "ratings", label: "Ratings", icon: Star },
                            ...(guessingEnabled
                              ? [{ value: "guesses", label: "Guesses", icon: Target }]
                              : []),
                          ]}
                          value={resultsTab}
                          onChange={setResultsTab}
                        />

                        <div className="mt-4 min-h-[500px]">
                          {resultsTab === "rankings" && (
                            <ResultsListTab
                              movies={resultsData.movieRankings}
                              scoringEnabled={scoringEnabled}
                              pointsMap={pointsMap}
                            />
                          )}

                          {resultsTab === "ratings" && (
                            <RatingsTab
                              nominations={
                                resultsNominations.map((n) => ({
                                  id: n.id,
                                  tmdb_id: n.tmdb_id,
                                  user_id: n.user_id,
                                  movies: {
                                    tmdb_id: n.tmdb_id,
                                    title: n.movie_title || "Unknown",
                                    poster_url: n.poster_url,
                                    year: null,
                                    cached_at: null,
                                    certification: null,
                                  },
                                  users: n.user_name
                                    ? { id: n.user_id, display_name: n.user_name, email: "" }
                                    : null,
                                })) as NominationWithRelations[]
                              }
                              ratings={
                                resultsRatings.map((r) => ({
                                  id: r.id,
                                  nomination_id: r.nomination_id,
                                  user_id: r.user_id,
                                  rating: r.rating,
                                  users: r.user,
                                })) as RatingWithRelations[]
                              }
                              members={
                                resultsMembers.map((m) => ({
                                  user_id: m.user_id,
                                  users: {
                                    id: m.user_id,
                                    display_name: m.display_name,
                                    email: m.email,
                                  },
                                })) as MemberForResults[]
                              }
                            />
                          )}

                          {resultsTab === "guesses" && guessingEnabled && (
                            <GuessesTab
                              nominations={
                                resultsNominations.map((n) => ({
                                  id: n.id,
                                  tmdb_id: n.tmdb_id,
                                  user_id: n.user_id,
                                  movies: {
                                    tmdb_id: n.tmdb_id,
                                    title: n.movie_title || "Unknown",
                                    poster_url: n.poster_url,
                                    year: null,
                                    cached_at: null,
                                    certification: null,
                                  },
                                  users: n.user_name
                                    ? { id: n.user_id, display_name: n.user_name, email: "" }
                                    : null,
                                })) as NominationWithRelations[]
                              }
                              guesses={
                                resultsGuesses.map((g) => ({
                                  id: g.id,
                                  user_id: g.user_id,
                                  guesses: g.guesses,
                                  users: g.user,
                                })) as GuessWithRelations[]
                              }
                              members={
                                resultsMembers.map((m) => ({
                                  user_id: m.user_id,
                                  users: {
                                    id: m.user_id,
                                    display_name: m.display_name,
                                    email: m.email,
                                  },
                                })) as MemberForResults[]
                              }
                            />
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  )}
                </div>
                {/* Sidebar for results */}
                <div className="lg:col-span-4 self-start space-y-4">
                  <FestivalOverviewPanel
                    festivalId={festival.id}
                    posterUrl={festival.poster_url || null}
                    theme={festival.theme}
                    themeSubmitter={themeSubmitter}
                    themeSelector={themeSelector}
                    themeSource={festival.theme_source || null}
                    createdAt={festival.created_at || festival.start_date}
                    startDate={festival.start_date}
                    participantCount={participantCount}
                    nominationCount={movieCount}
                    season={seasonInfo}
                    isAdmin={isAdmin}
                    nominationDeadline={festival.nomination_deadline}
                    ratingDeadline={festival.rating_deadline}
                    currentPhase={festival.phase}
                  />
                  <FestivalPrivateNotes festivalId={festival.id} initialNotes={festivalNotes} />
                </div>

                {/* Your Nomination - full width below results */}
                {userNomination && (
                  <div className="lg:col-span-8">
                    <YourNominationSection
                      nomination={userNomination}
                      festivalId={festival.id}
                      clubSlug={clubSlug}
                      festivalSlug={festivalSlug}
                      canEdit={false}
                    />
                  </div>
                )}

                {/* Admin Controls Panel */}
                {isAdmin && (
                  <div className="lg:col-span-8 self-start">
                    <FestivalAdminPanel
                      festivalId={festival.id}
                      clubId={clubId}
                      clubSlug={clubSlug}
                      festivalSlug={festivalSlug}
                      currentPhase={festival.phase}
                      theme={festival.theme}
                      status={festival.status}
                      members={members}
                      nominations={nominations.map((n) => ({
                        id: n.id,
                        tmdb_id: n.tmdb_id,
                        user_id: n.user_id,
                        movie_title: n.movie_title,
                        nominator_name: n.nominator_name,
                      }))}
                      hasTheme={!!festival.theme}
                      nominationCount={movieCount}
                      userRole={userRole}
                      guessingEnabled={guessingEnabled}
                    />
                  </div>
                )}
              </>
            )}

            {/* ===== THEME SELECTION PHASE ===== */}
            {festival.phase === "theme_selection" && (
              <>
                {/* Row 1: Theme status + Festival Overview */}
                <div className="lg:col-span-8">
                  <Card variant="default" className="h-full">
                    <CardContent className="p-6 text-center">
                      <Clock className="w-10 h-10 mx-auto mb-3 text-[var(--club-accent,var(--primary))]" />
                      <h3 className="font-semibold text-[var(--text-primary)] mb-2">
                        Theme Selection in Progress
                      </h3>
                      <p className="text-sm text-[var(--text-muted)]">
                        {isAdmin
                          ? "Use the producer controls below to select a theme and advance to nominations."
                          : "Waiting for the admin to select a theme for this festival."}
                      </p>
                    </CardContent>
                  </Card>
                </div>
                <div className="lg:col-span-4">
                  <FestivalOverviewPanel
                    festivalId={festival.id}
                    posterUrl={festival.poster_url || null}
                    theme={festival.theme}
                    themeSubmitter={themeSubmitter}
                    themeSelector={themeSelector}
                    themeSource={festival.theme_source || null}
                    createdAt={festival.created_at || festival.start_date}
                    startDate={festival.start_date}
                    participantCount={participantCount}
                    nominationCount={movieCount}
                    season={seasonInfo}
                    isAdmin={isAdmin}
                    nominationDeadline={festival.nomination_deadline}
                    ratingDeadline={festival.rating_deadline}
                    currentPhase={festival.phase}
                  />
                </div>

                {/* Row 2: Admin Controls + Private Notes */}
                {isAdmin && (
                  <div className="lg:col-span-8 self-start">
                    <FestivalAdminPanel
                      festivalId={festival.id}
                      clubId={clubId}
                      clubSlug={clubSlug}
                      festivalSlug={festivalSlug}
                      currentPhase={festival.phase}
                      theme={festival.theme}
                      status={festival.status}
                      members={members}
                      nominations={nominations.map((n) => ({
                        id: n.id,
                        tmdb_id: n.tmdb_id,
                        user_id: n.user_id,
                        movie_title: n.movie_title,
                        nominator_name: n.nominator_name,
                      }))}
                      hasTheme={!!festival.theme}
                      nominationCount={movieCount}
                      userRole={userRole}
                      guessingEnabled={guessingEnabled}
                    />
                  </div>
                )}
                <div className={`lg:col-span-4 self-start ${!isAdmin ? "lg:col-start-9" : ""}`}>
                  <FestivalPrivateNotes festivalId={festival.id} initialNotes={festivalNotes} />
                </div>
              </>
            )}
          </>
        )}

        {/* View Only Mode Content */}
        {isViewOnly && (
          <>
            <div className="lg:col-span-8">
              <Card variant="default" className="h-full">
                <CardContent className="p-6 text-center">
                  <CalendarBlank className="w-10 h-10 mx-auto mb-3 text-[var(--text-muted)]" />
                  <h3 className="font-semibold text-[var(--text-primary)] mb-2">View Only Mode</h3>
                  <p className="text-sm text-[var(--text-muted)]">
                    Join the club to participate in this festival.
                  </p>
                </CardContent>
              </Card>
            </div>
            <div className="lg:col-span-4">
              <FestivalOverviewPanel
                festivalId={festival.id}
                posterUrl={festival.poster_url || null}
                theme={festival.theme}
                themeSubmitter={themeSubmitter}
                themeSelector={themeSelector}
                themeSource={festival.theme_source || null}
                createdAt={festival.created_at || festival.start_date}
                startDate={festival.start_date}
                participantCount={participantCount}
                nominationCount={movieCount}
                season={seasonInfo}
                isAdmin={isAdmin}
                nominationDeadline={festival.nomination_deadline}
                ratingDeadline={festival.rating_deadline}
                currentPhase={festival.phase}
              />
            </div>
          </>
        )}
      </div>

      {/* Nominate Movie Modal */}
      <NominateMovieModal
        open={isNominateModalOpen}
        onOpenChange={setIsNominateModalOpen}
        festivalId={festival.id}
        clubId={clubId}
        clubSlug={clubSlug}
        festivalSlug={festivalSlug}
        festivalTheme={festival.theme}
        onSuccess={() => router.refresh()}
      />

      {/* Rating Modal */}
      {ratingSettings.club_ratings_enabled && (
        <EndlessRatingModal
          open={ratingModalOpen}
          onOpenChange={setRatingModalOpen}
          movie={ratingMovie}
          ratingSettings={ratingSettings}
          onSubmit={handleSubmitRating}
          isSubmitting={isPending}
        />
      )}
    </div>
  );
}
