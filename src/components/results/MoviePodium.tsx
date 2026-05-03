"use client";

import { useState, useRef, useEffect } from "react";
import Image from "next/image";
import { motion, AnimatePresence } from "framer-motion";
import { ClickableUserAvatar } from "@/components/ui/clickable-user-avatar";
import { userToAvatarData } from "@/lib/avatar-helpers";
import { CaretLeft, CaretRight, Crown, Star, Trophy, Medal } from "@phosphor-icons/react";
import NumberFlow, { timingPresets } from "@/components/ui/number-flow";

interface PodiumMovie {
  rank: number;
  nomination_id: string;
  movie_title: string;
  poster_url: string | null;
  average_rating: number;
  rating_count: number;
  nominator_name: string;
  nominator_avatar?: string | null;
  nominator_id?: string | null;
  nominator_email?: string | null;
  nominator_avatar_icon?: string | null;
  nominator_avatar_color_index?: number | null;
  nominator_avatar_border_color_index?: number | null;
  nominator_social_links?: {
    avatar_icon?: string;
    avatar_color_index?: number;
    avatar_border_color_index?: number;
    [key: string]: unknown;
  } | null;
}

interface MoviePodiumProps {
  movies: PodiumMovie[];
  scoringEnabled?: boolean;
  /** Points awarded per movie (keyed by nomination_id). */
  pointsMap?: Record<string, number>;
  /** When true, movies are hidden and revealed one by one. */
  isRevealing?: boolean;
  /** Number of movies currently revealed (controlled externally). */
  revealedCount?: number;
  /** Direction of reveal: forward = last→first, backward = first→last. */
  revealDirection?: "forward" | "backward";
}

// Podium position component
function PodiumPosition({
  movie,
  position,
  delay = 0,
  points,
}: {
  movie: PodiumMovie;
  position: 1 | 2 | 3;
  delay?: number;
  points?: number;
}) {
  const positionConfig = {
    1: {
      height: "h-32",
      posterSize: "w-24 h-36",
      avatarSize: "lg" as const,
      bgColor: "var(--primary)",
      Icon: Crown,
      label: "1st",
      order: "order-2",
      zIndex: "z-20",
      labelSize: "text-lg sm:text-2xl",
      ratingSize: "text-sm",
      starSize: "w-3.5 h-3.5",
      ptsSize: "text-[10px]",
    },
    2: {
      height: "h-24",
      posterSize: "w-20 h-30",
      avatarSize: "md" as const,
      bgColor: "var(--surface-3)",
      Icon: Medal,
      label: "2nd",
      order: "order-1",
      zIndex: "z-10",
      labelSize: "text-base sm:text-xl",
      ratingSize: "text-xs",
      starSize: "w-3 h-3",
      ptsSize: "text-[9px]",
    },
    3: {
      height: "h-20",
      posterSize: "w-18 h-27",
      avatarSize: "md" as const,
      bgColor: "var(--surface-2)",
      Icon: Medal,
      label: "3rd",
      order: "order-3",
      zIndex: "z-10",
      labelSize: "text-sm sm:text-lg",
      ratingSize: "text-[11px]",
      starSize: "w-2.5 h-2.5",
      ptsSize: "text-[9px]",
    },
  };

  const config = positionConfig[position];
  const _Icon = config.Icon;

  return (
    <motion.div
      initial={{ opacity: 0, y: 50, scale: 0.8 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{
        duration: 0.6,
        delay,
        ease: [0.22, 1, 0.36, 1],
      }}
      className={`flex flex-col items-center ${config.order} ${config.zIndex}`}
    >
      {/* User avatar */}
      <motion.div
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ delay: delay + 0.2, type: "spring", stiffness: 200 }}
        className="relative mb-2"
      >
        <ClickableUserAvatar
          entity={userToAvatarData({
            avatar_url: movie.nominator_avatar || null,
            display_name: movie.nominator_name,
            email: movie.nominator_email || null,
            avatar_icon:
              movie.nominator_avatar_icon ?? movie.nominator_social_links?.avatar_icon ?? null,
            avatar_color_index:
              movie.nominator_avatar_color_index ??
              movie.nominator_social_links?.avatar_color_index ??
              null,
            avatar_border_color_index:
              movie.nominator_avatar_border_color_index ??
              movie.nominator_social_links?.avatar_border_color_index ??
              null,
          })}
          userId={movie.nominator_id}
          size={config.avatarSize}
        />
        {position === 1 && (
          <motion.div
            initial={{ scale: 0, rotate: -45 }}
            animate={{ scale: 1, rotate: 0 }}
            transition={{ delay: delay + 0.4, type: "spring" }}
            className="absolute -top-2 -right-2 w-6 h-6 rounded-full flex items-center justify-center"
            style={{ backgroundColor: config.bgColor }}
          >
            <Crown className="w-3.5 h-3.5" style={{ color: "var(--text-primary)" }} />
          </motion.div>
        )}
      </motion.div>

      {/* Nominator name */}
      <p
        className="text-xs font-medium mb-3 text-center truncate max-w-[80px] sm:max-w-[100px]"
        style={{ color: "var(--text-secondary)" }}
      >
        {movie.nominator_name}
      </p>

      {/* Movie poster */}
      <motion.div
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: delay + 0.3, duration: 0.4 }}
        className={`relative ${position === 1 ? "w-20 h-[120px] sm:w-28 sm:h-[168px]" : position === 2 ? "w-16 h-24 sm:w-24 sm:h-36" : "w-14 h-[84px] sm:w-20 sm:h-[120px]"} rounded-lg overflow-hidden shadow-xl`}
        style={{
          boxShadow:
            position === 1
              ? "0 0 30px rgba(var(--primary-rgb), 0.4)"
              : "0 10px 30px rgba(0, 0, 0, 0.3)",
        }}
      >
        {movie.poster_url ? (
          <Image
            src={movie.poster_url}
            alt={movie.movie_title}
            fill
            className="object-cover"
            sizes={position === 1 ? "112px" : position === 2 ? "96px" : "80px"}
          />
        ) : (
          <div
            className="w-full h-full flex items-center justify-center"
            style={{ backgroundColor: "var(--surface-2)" }}
          >
            <Star className="w-8 h-8" style={{ color: "var(--text-muted)" }} />
          </div>
        )}

        {/* Rank badge overlay */}
        <div
          className="absolute top-2 left-2 w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold shadow-lg"
          style={{ backgroundColor: config.bgColor, color: "var(--text-primary)" }}
        >
          {position}
        </div>
      </motion.div>

      {/* Podium stand */}
      <motion.div
        initial={{ scaleY: 0 }}
        animate={{ scaleY: 1 }}
        transition={{ delay: delay + 0.1, duration: 0.4, ease: "easeOut" }}
        className={`${config.height} ${position === 1 ? "w-24 sm:w-32" : position === 2 ? "w-20 sm:w-28" : "w-[72px] sm:w-24"} mt-3 rounded-t-lg flex flex-col items-center justify-start pt-3 origin-bottom`}
        style={{
          backgroundColor: config.bgColor,
          boxShadow: "inset 0 2px 4px rgba(255, 255, 255, 0.1)",
        }}
      >
        <span className={`${config.labelSize} font-bold`} style={{ color: "var(--text-primary)" }}>
          {config.label}
        </span>
        <div className="flex items-center gap-0.5 mt-0.5">
          <Star
            className={`${config.starSize} fill-current`}
            style={{ color: "var(--text-primary)" }}
          />
          <span
            className={`${config.ratingSize} font-semibold`}
            style={{ color: "var(--text-primary)" }}
          >
            <NumberFlow
              value={movie.average_rating}
              format={{ minimumFractionDigits: 1, maximumFractionDigits: 1 }}
              transformTiming={timingPresets.dramatic}
            />
          </span>
        </div>
        {points !== undefined && (
          <span
            className={`${config.ptsSize} mt-0.5 opacity-60`}
            style={{ color: "var(--text-primary)" }}
          >
            +{points.toFixed(1)} {points === 1 ? "pt" : "pts"}
          </span>
        )}
      </motion.div>

      {/* Movie title below podium */}
      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: delay + 0.5 }}
        className={`mt-3 text-center font-medium leading-tight line-clamp-2 ${position === 1 ? "text-sm w-[100px] sm:w-[140px]" : "text-xs w-[90px] sm:w-[120px]"}`}
        style={{ color: "var(--text-primary)" }}
      >
        {movie.movie_title}
      </motion.p>
    </motion.div>
  );
}

export function MoviePodium({
  movies,
  scoringEnabled: _scoringEnabled = true,
  pointsMap,
  isRevealing = false,
  revealedCount = 0,
  revealDirection = "forward",
}: MoviePodiumProps) {
  const [currentPage, setCurrentPage] = useState(0);

  // Sort movies by rank
  const sortedMovies = [...movies].sort((a, b) => a.rank - b.rank);

  // During reveal, determine if a movie at a given rank is visible
  const isMovieRevealed = (rank: number): boolean => {
    if (!isRevealing) return true; // Not revealing — show all
    const totalMovies = sortedMovies.length;
    if (revealDirection === "forward") {
      // Forward: reveal from last place to first (rank N, N-1, ..., 1)
      // revealedCount=1 shows rank N, revealedCount=2 shows N and N-1, etc.
      return rank > totalMovies - revealedCount;
    } else {
      // Backward: reveal from first place to last (rank 1, 2, ..., N)
      return rank <= revealedCount;
    }
  };

  // Auto-navigate pages during reveal
  useEffect(() => {
    if (!isRevealing) return;
    const totalMovies = sortedMovies.length;
    const moviesOutsideTop3 = totalMovies - 3;

    if (revealDirection === "forward") {
      // Forward: reveals last→first. Start on page 1 (ranks 4+), switch to podium when those are done
      if (revealedCount <= moviesOutsideTop3) {
        // Still revealing ranks 4+, show page 1
        if (moviesOutsideTop3 > 0) setCurrentPage(1);
      } else {
        // Now revealing top 3, show podium
        setCurrentPage(0);
      }
    } else {
      // Backward: reveals first→last. Start on podium (ranks 1-3), switch to page 1 when those are done
      if (revealedCount <= 3) {
        setCurrentPage(0);
      } else {
        setCurrentPage(1);
      }
    }
  }, [isRevealing, revealedCount, revealDirection, sortedMovies.length]);

  // Reset to page 0 when reveal starts
  useEffect(() => {
    if (isRevealing && revealedCount === 0) {
      setCurrentPage(revealDirection === "forward" && sortedMovies.length > 3 ? 1 : 0);
    }
  }, [isRevealing, revealedCount, revealDirection, sortedMovies.length]);

  // Swipe support for mobile
  const touchStartX = useRef<number | null>(null);

  // Get top 3 for podium
  const top3 = sortedMovies.slice(0, 3);

  // Page 0 = top 3 podium, subsequent pages = 9 movies each
  const hasMoreMovies = sortedMovies.length > 3;
  const moviesPerPage = 9;
  const totalPages = hasMoreMovies ? Math.ceil((sortedMovies.length - 3) / moviesPerPage) + 1 : 1;

  // Get movies for current non-podium page
  const currentMovies =
    currentPage === 0
      ? top3
      : sortedMovies.slice(3 + (currentPage - 1) * moviesPerPage, 3 + currentPage * moviesPerPage);

  if (movies.length === 0) {
    return (
      <div className="text-center py-8">
        <Trophy className="w-12 h-12 mx-auto mb-4" style={{ color: "var(--text-muted)" }} />
        <p style={{ color: "var(--text-secondary)" }}>No results available</p>
      </div>
    );
  }

  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (touchStartX.current === null) return;
    const diff = touchStartX.current - e.changedTouches[0].clientX;
    const threshold = 50;
    if (diff > threshold && currentPage < totalPages - 1) {
      setCurrentPage((prev) => prev + 1);
    } else if (diff < -threshold && currentPage > 0) {
      setCurrentPage((prev) => prev - 1);
    }
    touchStartX.current = null;
  };

  return (
    <div
      className="relative"
      onTouchStart={hasMoreMovies ? handleTouchStart : undefined}
      onTouchEnd={hasMoreMovies ? handleTouchEnd : undefined}
    >
      {/* Navigation arrows — hidden on mobile, visible on sm+ */}
      {hasMoreMovies && (
        <>
          <button
            className="absolute left-0 top-1/2 -translate-y-1/2 z-30 hidden sm:flex w-10 h-10 items-center justify-center rounded-full bg-[var(--surface-2)] border border-[var(--border)] text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors disabled:opacity-30"
            onClick={() => setCurrentPage((prev) => Math.max(0, prev - 1))}
            disabled={currentPage === 0}
            aria-label="Previous movies"
          >
            <CaretLeft className="w-5 h-5" />
          </button>
          <button
            className="absolute right-0 top-1/2 -translate-y-1/2 z-30 hidden sm:flex w-10 h-10 items-center justify-center rounded-full bg-[var(--surface-2)] border border-[var(--border)] text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors disabled:opacity-30"
            onClick={() => setCurrentPage((prev) => Math.min(totalPages - 1, prev + 1))}
            disabled={currentPage === totalPages - 1}
            aria-label="Next movies"
          >
            <CaretRight className="w-5 h-5" />
          </button>
        </>
      )}

      {/* Fixed-height podium container — prevents layout shift between pages */}
      <div className="px-2 sm:px-12 h-[520px] flex flex-col justify-end overflow-visible">
        <AnimatePresence mode="wait">
          {currentPage === 0 ? (
            // Top 3 Podium view
            <motion.div
              key="podium"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex items-end justify-center gap-2 sm:gap-4 pb-4"
            >
              {/* 2nd place */}
              {top3[1] && (
                <div
                  className={`transition-all duration-500 ${isMovieRevealed(2) ? "opacity-100 scale-100" : "opacity-0 scale-95 pointer-events-none"}`}
                >
                  <PodiumPosition
                    movie={top3[1]}
                    position={2}
                    delay={isRevealing ? 0 : 0.2}
                    points={pointsMap?.[top3[1].nomination_id]}
                  />
                </div>
              )}

              {/* 1st place */}
              {top3[0] && (
                <div
                  className={`transition-all duration-500 ${isMovieRevealed(1) ? "opacity-100 scale-100" : "opacity-0 scale-95 pointer-events-none"}`}
                >
                  <PodiumPosition
                    movie={top3[0]}
                    position={1}
                    delay={isRevealing ? 0 : 0}
                    points={pointsMap?.[top3[0].nomination_id]}
                  />
                </div>
              )}

              {/* 3rd place */}
              {top3[2] && (
                <div
                  className={`transition-all duration-500 ${isMovieRevealed(3) ? "opacity-100 scale-100" : "opacity-0 scale-95 pointer-events-none"}`}
                >
                  <PodiumPosition
                    movie={top3[2]}
                    position={3}
                    delay={isRevealing ? 0 : 0.4}
                    points={pointsMap?.[top3[2].nomination_id]}
                  />
                </div>
              )}
            </motion.div>
          ) : (
            // Additional movies grid — up to 9 per page (3x3)
            <motion.div
              key={`page-${currentPage}`}
              initial={{ opacity: 0, x: 50 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -50 }}
              className="grid grid-cols-3 gap-x-4 gap-y-5 py-4 place-items-center"
            >
              {currentMovies.map((movie, index) => (
                <motion.div
                  key={movie.nomination_id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={
                    isMovieRevealed(movie.rank) ? { opacity: 1, y: 0 } : { opacity: 0, y: 20 }
                  }
                  transition={{ delay: index * 0.05, duration: 0.4 }}
                  className={`flex flex-col items-center ${!isMovieRevealed(movie.rank) ? "pointer-events-none" : ""}`}
                >
                  <div className="relative w-[72px] h-[108px] rounded-lg overflow-hidden shadow-lg mb-1.5">
                    {movie.poster_url ? (
                      <Image
                        src={movie.poster_url}
                        alt={movie.movie_title}
                        fill
                        className="object-cover"
                        sizes="72px"
                      />
                    ) : (
                      <div
                        className="w-full h-full flex items-center justify-center"
                        style={{ backgroundColor: "var(--surface-2)" }}
                      >
                        <Star className="w-5 h-5" style={{ color: "var(--text-muted)" }} />
                      </div>
                    )}
                    <div
                      className="absolute top-1 left-1 w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold"
                      style={{ backgroundColor: "var(--surface-2)", color: "var(--text-primary)" }}
                    >
                      {movie.rank}
                    </div>
                  </div>
                  <p
                    className="text-[11px] font-medium text-center line-clamp-1 max-w-[90px]"
                    style={{ color: "var(--text-primary)" }}
                  >
                    {movie.movie_title}
                  </p>
                  <div className="flex items-center gap-0.5 mt-0.5">
                    <Star
                      className="w-2.5 h-2.5 fill-current"
                      style={{ color: "var(--text-muted)" }}
                    />
                    <span className="text-[10px]" style={{ color: "var(--text-secondary)" }}>
                      <NumberFlow
                        value={movie.average_rating}
                        format={{ minimumFractionDigits: 1, maximumFractionDigits: 1 }}
                      />
                    </span>
                  </div>
                </motion.div>
              ))}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Page indicators */}
        {hasMoreMovies && (
          <div className="flex justify-center gap-2 mt-4">
            {Array.from({ length: totalPages }).map((_, i) => (
              <button
                key={i}
                onClick={() => setCurrentPage(i)}
                className={`w-2 h-2 rounded-full transition-all ${currentPage === i ? "w-6" : ""}`}
                style={{
                  backgroundColor: currentPage === i ? "var(--primary)" : "var(--surface-3)",
                }}
                aria-label={`Go to page ${i + 1}`}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
