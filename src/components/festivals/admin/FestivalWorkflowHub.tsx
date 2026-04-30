"use client";

import { useState } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { DateDisplay } from "@/components/ui/date-display";
import { FestivalPhaseControls } from "./FestivalPhaseControls";
import { ThemeVoting } from "../themes/ThemeVoting";
import { ThemeSelectionResults } from "../display/ThemeSelectionResults";
import { WinnerReveal } from "@/components/results/WinnerReveal";
import { MovieCarousel, type CarouselMovie } from "../display/MovieCarousel";
import { MovieGridModal } from "../modals/MovieGridModal";
import { formatRatingDisplay } from "@/lib/ratings/normalize";
import type { FestivalPhase } from "@/types/festival";
import type { FestivalType } from "@/types/club-settings";
import { Database } from "@/types/database";
import {
  Sparkle,
  FilmReel,
  Star,
  Trophy,
  Clock,
  Users,
  ChatCircle,
  CaretRight,
  CheckCircle,
  Plus,
  ChartBar,
} from "@phosphor-icons/react";

// Types
type Theme = Database["public"]["Tables"]["theme_pool"]["Row"];

interface Nomination {
  id: string;
  tmdb_id: number;
  pitch: string | null;
  created_at: string;
  movie: {
    title: string;
    poster_url: string | null;
    year: number | null;
    slug: string | null;
    runtime?: string | null;
    director?: string | null;
    genres?: string[] | null;
  } | null;
  nominator: {
    display_name: string | null;
    avatar_url: string | null;
  } | null;
}

interface Rating {
  nomination_id: string;
  rating: number;
  user_id: string;
}

interface MovieResult {
  rank: number;
  nomination_id: string;
  movie_title: string;
  poster_url: string | null;
  average_rating: number;
  rating_count: number;
  nominator_name: string;
  nominator_avatar?: string | null;
}

interface StandingsEntry {
  user_id: string;
  user_name: string;
  avatar_url?: string | null;
  points: number;
  rank: number;
}

interface Festival {
  id: string;
  slug: string | null;
  theme: string | null;
  phase: string;
  status: string;
  start_date: string;
  nomination_deadline: string | null;
  watch_deadline: string | null;
  rating_deadline: string | null;
  results_date: string | null;
  member_count_at_creation: number;
}

interface FestivalWorkflowHubProps {
  festival: Festival;
  clubId: string;
  clubSlug: string;
  clubName: string;
  festivalType?: FestivalType;
  isAdmin: boolean;
  currentUserId: string;

  // Phase-specific data
  themes?: Theme[];
  nominations?: Nomination[];
  userNomination?: Nomination | null;
  userRatings?: Rating[];

  // Results data
  movieResults?: MovieResult[];
  standings?: StandingsEntry[];

  // Settings
  scoringEnabled?: boolean;
  revealType?: "automatic" | "manual";
  revealDirection?: "forward" | "backward";
  revealDelaySeconds?: number;
}

// Phase configurations
const PHASE_CONFIG: Record<
  FestivalPhase,
  {
    label: string;
    icon: typeof Sparkle;
    description: string;
    color: string;
  }
> = {
  theme_selection: {
    label: "Theme Selection",
    icon: Sparkle,
    description: "Vote on or select a theme for this festival",
    color: "text-[var(--text-muted)]",
  },
  nomination: {
    label: "Nominations",
    icon: FilmReel,
    description: "Nominate movies that fit the theme",
    color: "text-[var(--text-primary)]",
  },
  watch_rate: {
    label: "Watch & Rate",
    icon: Star,
    description: "Watch and rate the nominated movies",
    color: "text-[var(--text-primary)]",
  },
  results: {
    label: "Results",
    icon: Trophy,
    description: "See the final rankings and winners",
    color: "text-[var(--text-primary)]",
  },
};

// Theme Selection Phase UI
function ThemeSelectionPhase({
  festival,
  clubId,
  themes,
  isAdmin,
}: {
  festival: Festival;
  clubId: string;
  themes: Theme[];
  isAdmin: boolean;
}) {
  if (isAdmin) {
    return <ThemeSelectionResults festivalId={festival.id} themes={themes} clubId={clubId} />;
  }

  return <ThemeVoting festivalId={festival.id} themes={themes} clubId={clubId} />;
}

// Nomination Phase UI - uses carousel for consistent experience
function NominationPhase({
  festival,
  clubSlug,
  nominations,
  userNomination,
  currentUserId: _currentUserId,
}: {
  festival: Festival;
  clubSlug: string;
  nominations: Nomination[];
  userNomination: Nomination | null;
  currentUserId: string;
}) {
  const festivalUrl = `/club/${clubSlug}/festival/${festival.slug || festival.id}`;
  const [gridModalOpen, setGridModalOpen] = useState(false);

  // Convert nominations to carousel movies (no ratings in nomination phase)
  const carouselMovies = nominations.map((nom) => nominationToCarouselMovie(nom, []));

  return (
    <div className="space-y-6">
      {/* User's nomination status */}
      <Card
        className="border-2"
        style={{
          borderColor: "var(--border)",
          backgroundColor: userNomination ? "var(--surface-2)" : "var(--surface-1)",
        }}
      >
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              {userNomination ? (
                <>
                  <div className="p-3 rounded-full" style={{ backgroundColor: "var(--surface-1)" }}>
                    <CheckCircle className="w-6 h-6" style={{ color: "var(--text-primary)" }} />
                  </div>
                  <div>
                    <h3 className="font-semibold" style={{ color: "var(--text-primary)" }}>
                      You've nominated!
                    </h3>
                    <p className="text-sm" style={{ color: "var(--text-secondary)" }}>
                      {userNomination.movie?.title || "Your movie"}
                    </p>
                  </div>
                </>
              ) : (
                <>
                  <div className="p-3 rounded-full" style={{ backgroundColor: "var(--surface-1)" }}>
                    <FilmReel className="w-6 h-6" style={{ color: "var(--text-primary)" }} />
                  </div>
                  <div>
                    <h3 className="font-semibold" style={{ color: "var(--text-primary)" }}>
                      Make your nomination
                    </h3>
                    <p className="text-sm" style={{ color: "var(--text-secondary)" }}>
                      Pick a movie that fits the theme: {festival.theme}
                    </p>
                  </div>
                </>
              )}
            </div>
            <Button asChild variant={userNomination ? "outline" : "club-accent"}>
              <Link href={festivalUrl}>
                {userNomination ? "Edit Nomination" : "Nominate Now"}
                <CaretRight className="w-4 h-4 ml-2" />
              </Link>
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Nominations carousel */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold" style={{ color: "var(--text-primary)" }}>
            Nominations ({nominations.length})
          </h3>
        </div>

        {nominations.length > 0 ? (
          <MovieCarousel
            movies={carouselMovies}
            context="regular"
            clubSlug={clubSlug}
            showRating={false}
            showGuessNominator={false}
          />
        ) : (
          <Card
            className="border-dashed"
            style={{ backgroundColor: "var(--surface-1)", borderColor: "var(--border)" }}
          >
            <CardContent className="p-8 text-center">
              <FilmReel className="w-12 h-12 mx-auto mb-4" style={{ color: "var(--text-muted)" }} />
              <p style={{ color: "var(--text-secondary)" }}>No nominations yet. Be the first!</p>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Grid modal for viewing all nominations */}
      <MovieGridModal
        open={gridModalOpen}
        onOpenChange={setGridModalOpen}
        movies={carouselMovies}
        context="regular"
      />
    </div>
  );
}

// Helper: Convert Nomination to CarouselMovie
function nominationToCarouselMovie(nom: Nomination, userRatings: Rating[]): CarouselMovie {
  const userRating = userRatings.find((r) => r.nomination_id === nom.id);
  return {
    id: nom.id,
    tmdb_id: nom.tmdb_id,
    slug: nom.movie?.slug || null,
    title: nom.movie?.title || "Unknown",
    year: nom.movie?.year || null,
    poster_url: nom.movie?.poster_url || null,
    curator_note: nom.pitch || null, // Use nomination pitch as curator_note
    runtime: nom.movie?.runtime ? parseInt(nom.movie.runtime) : null,
    director: nom.movie?.director || null,
    genres: nom.movie?.genres || null,
    nominator: nom.nominator
      ? {
          id: nom.id, // using nomination id as we don't have user id here
          display_name: nom.nominator.display_name || "Unknown",
          avatar_url: nom.nominator.avatar_url,
        }
      : null,
    isWatched: !!userRating, // If rated, assume watched
    isRated: !!userRating,
    userRating: userRating?.rating,
  };
}

// Watch & Rate Phase UI
function WatchRatePhase({
  festival,
  clubSlug,
  nominations,
  userRatings,
  currentUserId,
  onPrevPhase,
  onNextPhase,
  canGoPrev,
  canGoNext,
  showGuessNominator,
}: {
  festival: Festival;
  clubSlug: string;
  nominations: Nomination[];
  userRatings: Rating[];
  currentUserId: string;
  onPrevPhase?: () => void;
  onNextPhase?: () => void;
  canGoPrev?: boolean;
  canGoNext?: boolean;
  showGuessNominator?: boolean;
}) {
  const [gridModalOpen, setGridModalOpen] = useState(false);
  const festivalUrl = `/club/${clubSlug}/festival/${festival.slug || festival.id}`;
  const ratedNominationIds = new Set(userRatings.map((r) => r.nomination_id));
  const ratedCount = ratedNominationIds.size;
  const totalCount = nominations.length;
  const progress = totalCount > 0 ? (ratedCount / totalCount) * 100 : 0;

  // Convert nominations to carousel movies
  const carouselMovies = nominations.map((nom) => nominationToCarouselMovie(nom, userRatings));

  // Handle actions - redirect to festival page
  const handleRate = (_movieId: string) => {
    window.location.href = festivalUrl;
  };

  const handleMarkWatched = (_movieId: string) => {
    // For now, marking watched also opens the rate flow
    handleRate(_movieId);
  };

  const handleGuessNominator = (_movieId: string) => {
    // Navigate to festival page
    window.location.href = festivalUrl;
  };

  return (
    <div className="space-y-6">
      {/* Rating progress */}
      <Card style={{ backgroundColor: "var(--surface-2)", borderColor: "var(--border)" }}>
        <CardContent className="p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-full" style={{ backgroundColor: "var(--surface-1)" }}>
                <Star className="w-6 h-6" style={{ color: "var(--text-primary)" }} />
              </div>
              <div>
                <h3 className="font-semibold" style={{ color: "var(--text-primary)" }}>
                  Your Rating Progress
                </h3>
                <p className="text-sm" style={{ color: "var(--text-secondary)" }}>
                  {ratedCount} of {totalCount} movies rated
                </p>
              </div>
            </div>
            <Button asChild variant="club-accent">
              <Link href={festivalUrl}>
                {ratedCount === totalCount ? "Review Ratings" : "Rate Movies"}
                <CaretRight className="w-4 h-4 ml-2" />
              </Link>
            </Button>
          </div>
          <Progress value={progress} className="h-2" />
          {ratedCount === totalCount && (
            <p
              className="text-sm mt-3 flex items-center gap-2"
              style={{ color: "var(--text-primary)" }}
            >
              <CheckCircle className="w-4 h-4" />
              You've rated all movies! Great job!
            </p>
          )}
        </CardContent>
      </Card>

      {/* Movies Carousel */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold" style={{ color: "var(--text-primary)" }}>
            Movies to Watch ({nominations.length})
          </h3>
        </div>

        <MovieCarousel
          movies={carouselMovies}
          context="regular"
          clubSlug={clubSlug}
          currentUserId={currentUserId}
          onPrevPhase={onPrevPhase}
          onNextPhase={onNextPhase}
          canGoPrev={canGoPrev}
          canGoNext={canGoNext}
          onMarkWatched={handleMarkWatched}
          onRate={handleRate}
          onGuessNominator={handleGuessNominator}
          showGuessNominator={showGuessNominator}
          showRating={true}
          isAdmin={false}
        />
      </div>

      {/* Grid Modal */}
      <MovieGridModal
        open={gridModalOpen}
        onOpenChange={setGridModalOpen}
        movies={carouselMovies}
        context="regular"
        onMarkWatched={handleMarkWatched}
        onRate={handleRate}
        onGuessNominator={handleGuessNominator}
        showGuessNominator={showGuessNominator}
        showRating={true}
      />
    </div>
  );
}

// Results Phase UI
function ResultsPhase({
  festival,
  movieResults,
  standings,
  festivalType,
  scoringEnabled,
  revealType,
  revealDirection,
  revealDelaySeconds,
}: {
  festival: Festival;
  movieResults: MovieResult[];
  standings: StandingsEntry[];
  festivalType: string;
  scoringEnabled: boolean;
  revealType: "automatic" | "manual";
  revealDirection: "forward" | "backward";
  revealDelaySeconds: number;
}) {
  const [showReveal, setShowReveal] = useState(true);

  if (movieResults.length === 0) {
    return (
      <Card style={{ backgroundColor: "var(--surface-1)", borderColor: "var(--border)" }}>
        <CardContent className="p-8 text-center">
          <Trophy className="w-12 h-12 mx-auto mb-4" style={{ color: "var(--text-muted)" }} />
          <p style={{ color: "var(--text-secondary)" }}>Results are being calculated...</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {showReveal ? (
        <WinnerReveal
          movies={movieResults}
          standings={standings}
          revealType={revealType}
          revealDirection={revealDirection}
          revealDelaySeconds={revealDelaySeconds}
          festivalTheme={festival.theme || undefined}
          festivalType={festivalType as "standard" | "endless"}
          scoringEnabled={scoringEnabled}
          onComplete={() => {
            // Optionally hide reveal and show static results
          }}
        />
      ) : (
        <Card style={{ backgroundColor: "var(--surface-1)", borderColor: "var(--border)" }}>
          <CardHeader>
            <CardTitle className="flex items-center gap-2" style={{ color: "var(--text-primary)" }}>
              <Trophy className="w-5 h-5" style={{ color: "var(--text-primary)" }} />
              Final Rankings
            </CardTitle>
          </CardHeader>
          <CardContent>
            {/* Static results display */}
            <div className="space-y-3">
              {movieResults.map((movie) => (
                <div
                  key={movie.nomination_id}
                  className="flex items-center gap-4 p-4 rounded-lg border"
                  style={{
                    backgroundColor: movie.rank === 1 ? "var(--surface-2)" : "var(--surface-1)",
                    borderColor: "var(--border)",
                  }}
                >
                  <div
                    className="w-8 h-8 rounded-full flex items-center justify-center font-bold"
                    style={{
                      backgroundColor: movie.rank === 1 ? "var(--primary)" : "var(--surface-2)",
                      color: movie.rank === 1 ? "var(--text-primary)" : "var(--text-primary)",
                    }}
                  >
                    {movie.rank}
                  </div>
                  <div className="flex-1">
                    <h4 className="font-semibold" style={{ color: "var(--text-primary)" }}>
                      {movie.movie_title}
                    </h4>
                    <p className="text-sm" style={{ color: "var(--text-secondary)" }}>
                      by {movie.nominator_name}
                    </p>
                  </div>
                  <div className="flex items-center gap-1" style={{ color: "var(--text-primary)" }}>
                    <Star className="w-4 h-4 fill-current" />
                    <span className="font-bold">{formatRatingDisplay(movie.average_rating)}</span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Toggle button */}
      <div className="flex justify-center">
        <Button
          variant="outline"
          onClick={() => setShowReveal(!showReveal)}
          style={{ borderColor: "var(--border)" }}
        >
          {showReveal ? "Show Static Results" : "Watch Reveal Again"}
        </Button>
      </div>
    </div>
  );
}

// Main component
export function FestivalWorkflowHub({
  festival,
  clubId,
  clubSlug,
  clubName: _clubName,
  festivalType = "standard",
  isAdmin,
  currentUserId,
  themes = [],
  nominations = [],
  userNomination = null,
  userRatings = [],
  movieResults = [],
  standings = [],
  scoringEnabled = true,
  revealType = "manual",
  revealDirection = "forward",
  revealDelaySeconds = 5,
}: FestivalWorkflowHubProps) {
  const phase = festival.phase as FestivalPhase;
  const phaseConfig = PHASE_CONFIG[phase];
  const Icon = phaseConfig.icon;
  const festivalUrl = `/club/${clubSlug}/festival/${festival.slug || festival.id}`;

  return (
    <div className="space-y-8">
      {/* Phase header */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center"
      >
        <div
          className="inline-flex items-center gap-2 px-4 py-2 rounded-full mb-4"
          style={{ backgroundColor: "var(--surface-2)" }}
        >
          <Icon className="w-5 h-5" style={{ color: "var(--text-primary)" }} />
          <span className={`font-semibold ${phaseConfig.color}`}>{phaseConfig.label}</span>
        </div>
        <h2 className="text-xl sm:text-3xl font-bold mb-2" style={{ color: "var(--text-primary)" }}>
          {festival.theme || "Theme Selection"}
        </h2>
        <p className="max-w-lg mx-auto" style={{ color: "var(--text-muted)" }}>
          {phaseConfig.description}
        </p>
      </motion.div>

      {/* Main content grid */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
        {/* Main phase content */}
        <div className="lg:col-span-3">
          <AnimatePresence mode="wait">
            <motion.div
              key={phase}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.3 }}
            >
              {phase === "theme_selection" && (
                <ThemeSelectionPhase
                  festival={festival}
                  clubId={clubId}
                  themes={themes}
                  isAdmin={isAdmin}
                />
              )}

              {phase === "nomination" && (
                <NominationPhase
                  festival={festival}
                  clubSlug={clubSlug}
                  nominations={nominations}
                  userNomination={userNomination}
                  currentUserId={currentUserId}
                />
              )}

              {phase === "watch_rate" && (
                <WatchRatePhase
                  festival={festival}
                  clubSlug={clubSlug}
                  nominations={nominations}
                  userRatings={userRatings}
                  currentUserId={currentUserId}
                  canGoPrev={true}
                  canGoNext={true}
                  showGuessNominator={festivalType !== "endless"}
                />
              )}

              {phase === "results" && (
                <ResultsPhase
                  festival={festival}
                  movieResults={movieResults}
                  standings={standings}
                  festivalType={festivalType}
                  scoringEnabled={scoringEnabled}
                  revealType={revealType}
                  revealDirection={revealDirection}
                  revealDelaySeconds={revealDelaySeconds}
                />
              )}
            </motion.div>
          </AnimatePresence>
        </div>

        {/* Sidebar */}
        <div className="lg:col-span-1 space-y-6">
          {/* Admin controls */}
          {isAdmin && (
            <FestivalPhaseControls
              festivalId={festival.id}
              currentPhase={phase}
              hasTheme={!!festival.theme}
              nominationCount={nominations.length}
              isEndless={festivalType === "endless"}
            />
          )}

          {/* Quick stats */}
          <Card style={{ backgroundColor: "var(--surface-1)", borderColor: "var(--border)" }}>
            <CardHeader>
              <CardTitle className="text-sm" style={{ color: "var(--text-muted)" }}>
                Festival Stats
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-2" style={{ color: "var(--text-muted)" }}>
                  <FilmReel className="w-4 h-4" />
                  Nominations
                </span>
                <span className="font-bold" style={{ color: "var(--text-primary)" }}>
                  {nominations.length}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-2" style={{ color: "var(--text-muted)" }}>
                  <Star className="w-4 h-4" />
                  Your Ratings
                </span>
                <span className="font-bold" style={{ color: "var(--text-primary)" }}>
                  {userRatings.length}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-2" style={{ color: "var(--text-muted)" }}>
                  <Users className="w-4 h-4" />
                  Participants
                </span>
                <span className="font-bold" style={{ color: "var(--text-primary)" }}>
                  {festival.member_count_at_creation}
                </span>
              </div>
            </CardContent>
          </Card>

          {/* Deadlines */}
          {phase !== "results" && (
            <Card style={{ backgroundColor: "var(--surface-1)", borderColor: "var(--border)" }}>
              <CardHeader>
                <CardTitle
                  className="text-sm flex items-center gap-2"
                  style={{ color: "var(--text-muted)" }}
                >
                  <Clock className="w-4 h-4" />
                  Deadlines
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-sm">
                {festival.nomination_deadline && (
                  <div className="flex justify-between">
                    <span style={{ color: "var(--text-muted)" }}>Nominations</span>
                    <DateDisplay date={festival.nomination_deadline} format="datetime" />
                  </div>
                )}
                {festival.rating_deadline && (
                  <div className="flex justify-between">
                    <span style={{ color: "var(--text-muted)" }}>Ratings</span>
                    <DateDisplay date={festival.rating_deadline} format="datetime" />
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Quick actions */}
          <Card style={{ backgroundColor: "var(--surface-1)", borderColor: "var(--border)" }}>
            <CardHeader>
              <CardTitle className="text-sm" style={{ color: "var(--text-muted)" }}>
                Quick Actions
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {phase === "nomination" && (
                <Button className="w-full justify-start" variant="ghost" asChild>
                  <Link href={festivalUrl}>
                    <Plus className="w-4 h-4 mr-2" />
                    Nominate Movie
                  </Link>
                </Button>
              )}
              {phase === "watch_rate" && (
                <Button className="w-full justify-start" variant="ghost" asChild>
                  <Link href={festivalUrl}>
                    <Star className="w-4 h-4 mr-2" />
                    Rate Movies
                  </Link>
                </Button>
              )}
              <Button className="w-full justify-start" variant="ghost" asChild>
                <Link href={`/club/${clubSlug}/discuss`}>
                  <ChatCircle className="w-4 h-4 mr-2" />
                  Discussion
                </Link>
              </Button>
              <Button className="w-full justify-start" variant="ghost" asChild>
                <Link href={`/club/${clubSlug}/stats`}>
                  <ChartBar className="w-4 h-4 mr-2" />
                  Statistics
                </Link>
              </Button>
            </CardContent>
          </Card>

          {/* Endless festival indicator */}
          {festivalType === "endless" && (
            <Card style={{ backgroundColor: "var(--surface-2)", borderColor: "var(--border)" }}>
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="text-2xl" style={{ color: "var(--text-primary)" }}>
                    ∞
                  </div>
                  <div>
                    <h4 className="font-semibold text-sm" style={{ color: "var(--text-primary)" }}>
                      Endless Festival
                    </h4>
                    <p className="text-xs" style={{ color: "var(--text-muted)" }}>
                      Continuous nominations and ratings
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
