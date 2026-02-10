"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import Image from "next/image";
import { motion, AnimatePresence } from "framer-motion";
import confetti from "canvas-confetti";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { formatRatingDisplay } from "@/lib/ratings/normalize";
import {
  Trophy,
  Star,
  Crown,
  CaretRight,
  Play,
  Pause,
  SkipForward,
  ArrowCounterClockwise,
} from "@phosphor-icons/react";

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

interface WinnerRevealProps {
  movies: MovieResult[];
  standings?: StandingsEntry[];
  revealType?: "automatic" | "manual";
  revealDirection?: "forward" | "backward"; // forward = last to first, backward = first to last
  revealDelaySeconds?: number;
  festivalTheme?: string;
  festivalType?: "standard" | "endless";
  onComplete?: () => void;
  scoringEnabled?: boolean;
}

// Confetti burst function
function fireConfetti() {
  const count = 200;
  const defaults = {
    origin: { y: 0.7 },
    zIndex: 9999,
  };

  function fire(particleRatio: number, opts: confetti.Options) {
    confetti({
      ...defaults,
      ...opts,
      particleCount: Math.floor(count * particleRatio),
    });
  }

  fire(0.25, {
    spread: 26,
    startVelocity: 55,
  });
  fire(0.2, {
    spread: 60,
  });
  fire(0.35, {
    spread: 100,
    decay: 0.91,
    scalar: 0.8,
  });
  fire(0.1, {
    spread: 120,
    startVelocity: 25,
    decay: 0.92,
    scalar: 1.2,
  });
  fire(0.1, {
    spread: 120,
    startVelocity: 45,
  });
}

// Spotlight animation component
function SpotlightCurtain({ isOpen }: { isOpen: boolean }) {
  return (
    <AnimatePresence>
      {!isOpen && (
        <>
          {/* Left curtain */}
          <motion.div
            className="absolute inset-y-0 left-0 w-1/2 z-40"
            style={{ backgroundColor: "var(--surface-0)" }}
            initial={{ x: 0 }}
            exit={{ x: "-100%" }}
            transition={{ duration: 1.5, ease: [0.22, 1, 0.36, 1] }}
          >
            <div className="absolute inset-0 bg-[url('/patterns/velvet.png')] opacity-30" />
            <div
              className="absolute right-0 top-0 bottom-0 w-8"
              style={{ background: "linear-gradient(to left, rgba(0, 0, 0, 0.4), transparent)" }}
            />
            <div
              className="absolute inset-0"
              style={{
                background:
                  "linear-gradient(to bottom, rgba(0, 0, 0, 0.3), transparent, rgba(0, 0, 0, 0.3))",
              }}
            />
          </motion.div>

          {/* Right curtain */}
          <motion.div
            className="absolute inset-y-0 right-0 w-1/2 z-40"
            style={{ backgroundColor: "var(--surface-0)" }}
            initial={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ duration: 1.5, ease: [0.22, 1, 0.36, 1] }}
          >
            <div className="absolute inset-0 bg-[url('/patterns/velvet.png')] opacity-30" />
            <div
              className="absolute left-0 top-0 bottom-0 w-8"
              style={{ background: "linear-gradient(to right, rgba(0, 0, 0, 0.4), transparent)" }}
            />
            <div
              className="absolute inset-0"
              style={{
                background:
                  "linear-gradient(to bottom, rgba(0, 0, 0, 0.3), transparent, rgba(0, 0, 0, 0.3))",
              }}
            />
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

// Spotlight beam effect
function SpotlightBeam({
  active,
  position,
}: {
  active: boolean;
  position: "center" | "left" | "right";
}) {
  const positions = {
    center: "left-1/2 -translate-x-1/2",
    left: "left-1/4 -translate-x-1/2",
    right: "left-3/4 -translate-x-1/2",
  };

  return (
    <AnimatePresence>
      {active && (
        <motion.div
          className={`absolute top-0 ${positions[position]} w-96 h-full pointer-events-none z-30`}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.5 }}
        >
          <div
            className="absolute inset-0"
            style={{
              background:
                "conic-gradient(from 180deg at 50% -10%, transparent 45%, rgba(255,255,200,0.15) 50%, transparent 55%)",
            }}
          />
        </motion.div>
      )}
    </AnimatePresence>
  );
}

// Movie card for reveal
function RevealedMovieCard({
  movie,
  isWinner,
  delay = 0,
}: {
  movie: MovieResult;
  isWinner: boolean;
  delay?: number;
}) {
  const getRankColor = (rank: number) => {
    if (rank === 1) return "var(--primary)";
    if (rank === 2) return "var(--surface-3)";
    if (rank === 3) return "var(--surface-2)";
    return "var(--surface-1)";
  };

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.8, y: 20 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      transition={{
        duration: 0.6,
        delay,
        ease: [0.22, 1, 0.36, 1],
      }}
      className={`relative ${isWinner ? "scale-110" : ""}`}
    >
      {/* Winner glow effect */}
      {isWinner && (
        <motion.div
          className="absolute -inset-4 rounded-2xl blur-xl"
          style={{ backgroundColor: "var(--primary)", opacity: 0.3 }}
          animate={{
            opacity: [0.3, 0.5, 0.3],
          }}
          transition={{
            duration: 2,
            repeat: Infinity,
          }}
        />
      )}

      <Card
        className="relative overflow-hidden border-2"
        style={{
          backgroundColor: "var(--surface-1)",
          borderColor: isWinner ? "var(--primary)" : "var(--border)",
        }}
      >
        {/* Rank badge */}
        <div
          className="absolute top-3 left-3 z-20 w-10 h-10 rounded-full flex items-center justify-center font-bold shadow-lg"
          style={{ backgroundColor: getRankColor(movie.rank), color: "var(--text-primary)" }}
        >
          {movie.rank === 1 ? <Crown className="w-5 h-5" /> : <span>{movie.rank}</span>}
        </div>

        {/* Winner badge */}
        {isWinner && (
          <motion.div
            className="absolute top-3 right-3 z-20"
            initial={{ rotate: -15, scale: 0 }}
            animate={{ rotate: 0, scale: 1 }}
            transition={{ delay: delay + 0.3, type: "spring" }}
          >
            <div className="px-3 py-1 rounded-full" style={{ backgroundColor: "var(--primary)" }}>
              <span
                className="text-xs font-bold flex items-center gap-1"
                style={{ color: "var(--text-primary)" }}
              >
                <Trophy className="w-3 h-3" /> WINNER
              </span>
            </div>
          </motion.div>
        )}

        {/* Poster */}
        <div className="relative aspect-[2/3] overflow-hidden">
          {movie.poster_url ? (
            <Image
              src={movie.poster_url}
              alt={movie.movie_title}
              fill
              className="object-cover"
              sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
            />
          ) : (
            <div
              className="w-full h-full flex items-center justify-center"
              style={{ backgroundColor: "var(--surface-2)" }}
            >
              <Star className="w-12 h-12" style={{ color: "var(--text-muted)" }} />
            </div>
          )}
        </div>

        {/* Info */}
        <div className="p-4">
          <h3
            className="font-bold text-lg mb-1 line-clamp-2"
            style={{ color: "var(--text-primary)" }}
          >
            {movie.movie_title}
          </h3>

          {/* Rating */}
          <div className="flex items-center gap-2 mb-2">
            <div className="flex items-center gap-1">
              <Star className="w-4 h-4 fill-current" style={{ color: "var(--text-primary)" }} />
              <span className="font-bold" style={{ color: "var(--text-primary)" }}>
                {formatRatingDisplay(movie.average_rating)}
              </span>
            </div>
            <span className="text-[var(--text-muted)] text-sm">
              ({movie.rating_count} {movie.rating_count === 1 ? "rating" : "ratings"})
            </span>
          </div>

          {/* Nominator */}
          <p className="text-[var(--text-muted)] text-sm">
            Nominated by{" "}
            <span className="text-[var(--text-primary)] font-medium">{movie.nominator_name}</span>
          </p>
        </div>
      </Card>
    </motion.div>
  );
}

// User standings card
function StandingsReveal({
  standings,
  revealedCount,
  revealDirection = "forward",
}: {
  standings: StandingsEntry[];
  revealedCount: number;
  revealDirection: "forward" | "backward";
}) {
  const getRevealedStandings = () => {
    if (revealDirection === "forward") {
      // Last to first (build suspense)
      return standings.slice(-revealedCount).reverse();
    } else {
      // First to last
      return standings.slice(0, revealedCount);
    }
  };

  const revealed = getRevealedStandings();
  const winner = standings[0];
  const _isWinnerRevealed = revealed.some((s) => s.user_id === winner?.user_id);

  return (
    <div className="space-y-3">
      <AnimatePresence mode="popLayout">
        {revealed.map((entry, _i) => {
          const isWinner = entry.user_id === winner?.user_id;

          return (
            <motion.div
              key={entry.user_id}
              initial={{ opacity: 0, x: -50, scale: 0.9 }}
              animate={{ opacity: 1, x: 0, scale: 1 }}
              exit={{ opacity: 0, x: 50, scale: 0.9 }}
              transition={{
                duration: 0.5,
                type: "spring",
                stiffness: 200,
              }}
              className="flex items-center justify-between p-4 rounded-xl border"
              style={{
                backgroundColor: isWinner ? "var(--surface-2)" : "var(--surface-1)",
                borderColor: isWinner ? "var(--primary)" : "var(--border)",
              }}
            >
              <div className="flex items-center gap-4">
                {/* Rank */}
                <div
                  className="w-8 h-8 rounded-full flex items-center justify-center font-bold"
                  style={{
                    backgroundColor: isWinner ? "var(--primary)" : "var(--surface-2)",
                    color: "var(--text-primary)",
                  }}
                >
                  {isWinner ? <Crown className="w-4 h-4" /> : entry.rank}
                </div>

                {/* Avatar & Name */}
                <div className="flex items-center gap-3">
                  {entry.avatar_url ? (
                    <Image
                      src={entry.avatar_url}
                      alt={entry.user_name}
                      width={40}
                      height={40}
                      className="rounded-full"
                    />
                  ) : (
                    <div
                      className="w-10 h-10 rounded-full flex items-center justify-center"
                      style={{ backgroundColor: "var(--surface-2)" }}
                    >
                      <span className="text-sm font-bold" style={{ color: "var(--text-muted)" }}>
                        {entry.user_name[0]?.toUpperCase()}
                      </span>
                    </div>
                  )}
                  <span className="font-semibold" style={{ color: "var(--text-primary)" }}>
                    {entry.user_name}
                  </span>
                </div>
              </div>

              {/* Points */}
              <div className="text-lg font-bold" style={{ color: "var(--text-primary)" }}>
                {entry.points > 0 ? "+" : ""}
                {entry.points.toFixed(1)} pts
              </div>
            </motion.div>
          );
        })}
      </AnimatePresence>
    </div>
  );
}

export function WinnerReveal({
  movies,
  standings = [],
  revealType = "manual",
  revealDirection = "forward",
  revealDelaySeconds = 5,
  festivalTheme,
  festivalType: _festivalType = "standard",
  onComplete,
  scoringEnabled = true,
}: WinnerRevealProps) {
  const [showCurtain, setShowCurtain] = useState(true);
  const [revealedMovieCount, setRevealedMovieCount] = useState(0);
  const [revealedStandingsCount, setRevealedStandingsCount] = useState(0);
  const [showSpotlight, setShowSpotlight] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [isStarted, setIsStarted] = useState(false);
  const [phase, setPhase] = useState<"intro" | "movies" | "standings" | "complete">("intro");

  // Track all timers for cleanup
  const timersRef = useRef<Set<NodeJS.Timeout>>(new Set());

  // Helper to create tracked timeouts that auto-cleanup
  const safeTimeout = useCallback((callback: () => void, delay: number) => {
    const timer = setTimeout(() => {
      timersRef.current.delete(timer);
      callback();
    }, delay);
    timersRef.current.add(timer);
    return timer;
  }, []);

  // Cleanup all timers on unmount
  useEffect(() => {
    const currentTimers = timersRef.current;
    return () => {
      currentTimers.forEach((timer) => clearTimeout(timer));
      currentTimers.clear();
    };
  }, []);

  // Sort movies by rank
  const sortedMovies = [...movies].sort((a, b) => a.rank - b.rank);
  const winner = sortedMovies[0];

  // Order for reveal based on direction
  const revealOrder =
    revealDirection === "forward"
      ? [...sortedMovies].reverse() // Last to first
      : sortedMovies; // First to last

  const triggerWinnerConfetti = useCallback(() => {
    fireConfetti();
    // Secondary burst
    safeTimeout(() => fireConfetti(), 500);
  }, [safeTimeout]);

  // Auto reveal logic
  useEffect(() => {
    if (!isStarted || isPaused || revealType !== "automatic") return;

    // Capture ref at start of effect for use in cleanup
    const currentTimers = timersRef.current;

    if (phase === "intro") {
      // Open curtain after 2 seconds
      const timer = safeTimeout(() => {
        setShowCurtain(false);
        setShowSpotlight(true);
        safeTimeout(() => setPhase("movies"), 1500);
      }, 2000);
      return () => {
        clearTimeout(timer);
        currentTimers.delete(timer);
      };
    }

    if (phase === "movies" && revealedMovieCount < movies.length) {
      const timer = safeTimeout(() => {
        setRevealedMovieCount((prev) => {
          const next = prev + 1;
          // Check if we just revealed the winner
          const justRevealed = revealOrder[prev];
          if (justRevealed?.rank === 1) {
            triggerWinnerConfetti();
          }
          return next;
        });
      }, revealDelaySeconds * 1000);
      return () => {
        clearTimeout(timer);
        currentTimers.delete(timer);
      };
    }

    if (phase === "movies" && revealedMovieCount >= movies.length) {
      // Move to standings
      const timer = safeTimeout(() => {
        if (scoringEnabled && standings.length > 0) {
          setPhase("standings");
        } else {
          setPhase("complete");
          onComplete?.();
        }
      }, 2000);
      return () => {
        clearTimeout(timer);
        currentTimers.delete(timer);
      };
    }

    if (phase === "standings" && revealedStandingsCount < standings.length) {
      const timer = safeTimeout(() => {
        setRevealedStandingsCount((prev) => {
          const next = prev + 1;
          // Check if we just revealed the winner
          if (next === standings.length) {
            triggerWinnerConfetti();
          }
          return next;
        });
      }, revealDelaySeconds * 1000);
      return () => {
        clearTimeout(timer);
        currentTimers.delete(timer);
      };
    }

    if (phase === "standings" && revealedStandingsCount >= standings.length) {
      const timer = safeTimeout(() => {
        setPhase("complete");
        onComplete?.();
      }, 2000);
      return () => {
        clearTimeout(timer);
        currentTimers.delete(timer);
      };
    }
  }, [
    isStarted,
    isPaused,
    phase,
    revealedMovieCount,
    revealedStandingsCount,
    movies.length,
    standings.length,
    revealType,
    revealDelaySeconds,
    scoringEnabled,
    onComplete,
    revealOrder,
    triggerWinnerConfetti,
    safeTimeout,
  ]);

  // Manual reveal handlers
  const handleStart = () => {
    setIsStarted(true);
    safeTimeout(() => {
      setShowCurtain(false);
      setShowSpotlight(true);
      safeTimeout(() => setPhase("movies"), 1500);
    }, 1000);
  };

  const handleRevealNext = () => {
    if (phase === "movies" && revealedMovieCount < movies.length) {
      const newCount = revealedMovieCount + 1;
      const justRevealed = revealOrder[revealedMovieCount];
      if (justRevealed?.rank === 1) {
        triggerWinnerConfetti();
      }
      setRevealedMovieCount(newCount);
      if (newCount >= movies.length) {
        safeTimeout(() => {
          if (scoringEnabled && standings.length > 0) {
            setPhase("standings");
          } else {
            setPhase("complete");
            onComplete?.();
          }
        }, 1500);
      }
    } else if (phase === "standings" && revealedStandingsCount < standings.length) {
      const newCount = revealedStandingsCount + 1;
      if (newCount === standings.length) {
        triggerWinnerConfetti();
      }
      setRevealedStandingsCount(newCount);
      if (newCount >= standings.length) {
        safeTimeout(() => {
          setPhase("complete");
          onComplete?.();
        }, 1500);
      }
    }
  };

  const handleRevealAll = () => {
    if (phase === "movies") {
      setRevealedMovieCount(movies.length);
      triggerWinnerConfetti();
      safeTimeout(() => {
        if (scoringEnabled && standings.length > 0) {
          setPhase("standings");
          setRevealedStandingsCount(standings.length);
          safeTimeout(() => {
            setPhase("complete");
            onComplete?.();
          }, 1000);
        } else {
          setPhase("complete");
          onComplete?.();
        }
      }, 1500);
    } else if (phase === "standings") {
      setRevealedStandingsCount(standings.length);
      triggerWinnerConfetti();
      safeTimeout(() => {
        setPhase("complete");
        onComplete?.();
      }, 1500);
    }
  };

  const handleReset = () => {
    // Clear all pending timers on reset
    timersRef.current.forEach((timer) => clearTimeout(timer));
    timersRef.current.clear();
    setShowCurtain(true);
    setShowSpotlight(false);
    setRevealedMovieCount(0);
    setRevealedStandingsCount(0);
    setIsStarted(false);
    setPhase("intro");
  };

  // Get revealed movies based on direction
  const getRevealedMovies = () => {
    return revealOrder.slice(0, revealedMovieCount);
  };

  return (
    <div
      className="relative min-h-[600px] rounded-2xl overflow-hidden"
      style={{ backgroundColor: "var(--surface-0)" }}
    >
      {/* Curtain */}
      <SpotlightCurtain isOpen={!showCurtain} />

      {/* Spotlight */}
      <SpotlightBeam active={showSpotlight} position="center" />

      {/* Content */}
      <div className="relative z-20 p-8">
        {/* Header */}
        <div className="text-center mb-8">
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
          >
            {festivalTheme && (
              <p
                className="text-sm uppercase tracking-widest mb-2"
                style={{ color: "var(--text-secondary)" }}
              >
                {festivalTheme}
              </p>
            )}
            <h2
              className="text-4xl md:text-5xl font-bold mb-2"
              style={{ color: "var(--text-primary)" }}
            >
              {phase === "intro" && "The Results Are In"}
              {phase === "movies" && "Movie Rankings"}
              {phase === "standings" && "Season Standings"}
              {phase === "complete" && "Festival Complete!"}
            </h2>
            <p style={{ color: "var(--text-secondary)" }}>
              {phase === "intro" && "Click to reveal the results"}
              {phase === "movies" && `${revealedMovieCount} of ${movies.length} revealed`}
              {phase === "standings" && `${revealedStandingsCount} of ${standings.length} revealed`}
              {phase === "complete" && winner && `${winner.movie_title} wins!`}
            </p>
          </motion.div>
        </div>

        {/* Intro state */}
        {phase === "intro" && !isStarted && (
          <motion.div
            className="flex justify-center"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 1 }}
          >
            <Button size="lg" onClick={handleStart} variant="primary" className="px-8 py-6 text-lg">
              <Play className="w-5 h-5 mr-2" />
              Reveal Results
            </Button>
          </motion.div>
        )}

        {/* Movies grid */}
        {phase === "movies" && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 mb-8">
            {getRevealedMovies().map((movie, i) => (
              <RevealedMovieCard
                key={movie.nomination_id}
                movie={movie}
                isWinner={movie.rank === 1}
                delay={i * 0.1}
              />
            ))}
          </div>
        )}

        {/* Standings */}
        {phase === "standings" && (
          <div className="max-w-2xl mx-auto">
            <StandingsReveal
              standings={standings}
              revealedCount={revealedStandingsCount}
              revealDirection={revealDirection}
            />
          </div>
        )}

        {/* Complete state */}
        {phase === "complete" && winner && (
          <motion.div
            className="text-center"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
          >
            <div
              className="inline-block p-8 rounded-2xl border"
              style={{ backgroundColor: "var(--surface-2)", borderColor: "var(--border)" }}
            >
              <Trophy className="w-16 h-16 mx-auto mb-4" style={{ color: "var(--text-primary)" }} />
              <h3
                className="text-lg sm:text-2xl font-bold mb-2"
                style={{ color: "var(--text-primary)" }}
              >
                {winner.movie_title}
              </h3>
              <p style={{ color: "var(--text-secondary)" }}>
                Rating: {formatRatingDisplay(winner.average_rating)} ⭐
              </p>
              <p className="text-[var(--text-muted)] text-sm mt-1">
                Nominated by {winner.nominator_name}
              </p>
            </div>
          </motion.div>
        )}

        {/* Controls */}
        {(phase === "movies" || phase === "standings") && revealType === "manual" && (
          <motion.div
            className="flex justify-center gap-3 mt-8"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5 }}
          >
            <Button variant="outline" onClick={handleRevealAll}>
              <SkipForward className="w-4 h-4 mr-2" />
              Reveal All
            </Button>
            <Button onClick={handleRevealNext} variant="secondary">
              <CaretRight className="w-4 h-4 mr-2" />
              Reveal Next
            </Button>
          </motion.div>
        )}

        {/* Auto reveal controls */}
        {(phase === "movies" || phase === "standings") && revealType === "automatic" && (
          <motion.div
            className="flex justify-center gap-3 mt-8"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5 }}
          >
            <Button variant="outline" onClick={() => setIsPaused(!isPaused)}>
              {isPaused ? (
                <>
                  <Play className="w-4 h-4 mr-2" />
                  Resume
                </>
              ) : (
                <>
                  <Pause className="w-4 h-4 mr-2" />
                  Pause
                </>
              )}
            </Button>
            <Button variant="outline" onClick={handleRevealAll}>
              <SkipForward className="w-4 h-4 mr-2" />
              Skip to End
            </Button>
          </motion.div>
        )}

        {/* Reset button */}
        {phase === "complete" && (
          <motion.div
            className="flex justify-center mt-8"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5 }}
          >
            <Button variant="outline" onClick={handleReset} className="border-white/20">
              <ArrowCounterClockwise className="w-4 h-4 mr-2" />
              Watch Again
            </Button>
          </motion.div>
        )}
      </div>
    </div>
  );
}
