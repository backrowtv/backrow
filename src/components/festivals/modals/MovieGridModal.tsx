"use client";

import { useState } from "react";
import Image from "next/image";
import { motion, AnimatePresence } from "framer-motion";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import type { CarouselMovie, CarouselContext } from "../display/MovieCarousel";
import { FilmReel, Check, Plus, Star, Users } from "@phosphor-icons/react";
import { RatingDisplay } from "@/components/ratings/RatingDisplay";
import { getTMDBBlurDataURL } from "@/lib/utils/blur-placeholder";

// ============================================
// TYPES
// ============================================

interface MovieGridModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  movies: CarouselMovie[];
  context: CarouselContext;

  // Action handlers
  onMarkWatched?: (movieId: string) => void;
  onRate?: (movieId: string) => void;
  onGuessNominator?: (movieId: string) => void;

  // Feature flags
  showGuessNominator?: boolean;
  showRating?: boolean;
}

// ============================================
// GRID MOVIE CARD
// ============================================

interface GridMovieCardProps {
  movie: CarouselMovie;
  context: CarouselContext;
  onMarkWatched?: (movieId: string) => void;
  onRate?: (movieId: string) => void;
  onGuessNominator?: (movieId: string) => void;
  showGuessNominator: boolean;
  showRating: boolean;
  index: number;
}

function GridMovieCard({
  movie,
  context,
  onMarkWatched,
  onRate,
  onGuessNominator,
  showGuessNominator,
  showRating,
  index,
}: GridMovieCardProps) {
  const [isHovered, setIsHovered] = useState(false);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05, duration: 0.3 }}
      className="relative group"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Card */}
      <div
        className="relative rounded-lg overflow-hidden shadow-md transition-all duration-200 group-hover:shadow-xl group-hover:scale-[1.02]"
        style={{ backgroundColor: "var(--surface-2)" }}
      >
        {/* Poster */}
        <div className="relative aspect-[2/3]">
          {movie.poster_url ? (
            <Image
              src={movie.poster_url}
              alt={movie.title}
              fill
              className="object-cover"
              sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 20vw"
              placeholder="blur"
              blurDataURL={getTMDBBlurDataURL()}
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <FilmReel className="w-10 h-10" style={{ color: "var(--text-muted)" }} />
            </div>
          )}

          {/* Status badges - top right corner */}
          <div className="absolute top-2 right-2 flex flex-col gap-1">
            {movie.isRated && movie.userRating && (
              <Badge variant="primary" size="sm" className="shadow-lg text-[10px]">
                <Star className="w-2.5 h-2.5 mr-0.5 fill-current" />
                <RatingDisplay rating={movie.userRating} showMax />
              </Badge>
            )}
            {movie.isWatched && !movie.isRated && (
              <Badge variant="secondary" size="sm" className="shadow-lg">
                <Check className="w-3 h-3" />
              </Badge>
            )}
          </div>

          {/* Hover overlay with actions */}
          <AnimatePresence>
            {isHovered && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.15 }}
                className="absolute inset-0 bg-black/80 flex flex-col items-center justify-center gap-2 p-3"
              >
                {/* Quick action buttons - high contrast for visibility */}
                {onMarkWatched && (
                  <Button
                    variant={movie.isWatched ? "primary" : "outline"}
                    size="sm"
                    onClick={() => onMarkWatched(movie.id)}
                    className={`w-full text-xs ${movie.isWatched ? "" : "bg-white text-black hover:bg-gray-200"}`}
                  >
                    {movie.isWatched ? (
                      <Check className="w-3 h-3 mr-1" />
                    ) : (
                      <Plus className="w-3 h-3 mr-1" />
                    )}
                    {movie.isWatched ? "Watched" : "Mark Watched"}
                  </Button>
                )}

                {showRating && onRate && (
                  <Button
                    variant={movie.isRated ? "primary" : "outline"}
                    size="sm"
                    onClick={() => onRate(movie.id)}
                    className={`w-full text-xs ${movie.isRated ? "" : "bg-white text-black hover:bg-gray-200"}`}
                  >
                    <Star className={`w-3 h-3 mr-1 ${movie.isRated ? "fill-current" : ""}`} />
                    {movie.isRated ? (
                      <>
                        Rated <RatingDisplay rating={movie.userRating!} showMax />
                      </>
                    ) : (
                      "Rate"
                    )}
                  </Button>
                )}

                {context === "regular" && showGuessNominator && onGuessNominator && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => onGuessNominator(movie.id)}
                    className="w-full text-xs bg-white text-black hover:bg-gray-200"
                  >
                    <Users className="w-3 h-3 mr-1" />
                    Guess
                  </Button>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Title bar */}
        <div className="p-2">
          <h4 className="text-sm font-medium truncate" style={{ color: "var(--text-primary)" }}>
            {movie.title}
          </h4>
          <p className="text-xs truncate" style={{ color: "var(--text-muted)" }}>
            {movie.year}
            {movie.director && ` • ${movie.director}`}
          </p>
        </div>
      </div>
    </motion.div>
  );
}

// ============================================
// MAIN MODAL COMPONENT
// ============================================

export function MovieGridModal({
  open,
  onOpenChange,
  movies,
  context,
  onMarkWatched,
  onRate,
  onGuessNominator,
  showGuessNominator = false,
  showRating = true,
}: MovieGridModalProps) {
  // Stats
  const watchedCount = movies.filter((m) => m.isWatched).length;
  const ratedCount = movies.filter((m) => m.isRated).length;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="max-w-[calc(100vw-2rem)] sm:max-w-4xl max-h-[90dvh] p-0 overflow-hidden"
        style={{ backgroundColor: "var(--surface-1)" }}
      >
        <DialogHeader className="p-4 pb-2 pr-12 border-b" style={{ borderColor: "var(--border)" }}>
          <div className="flex items-center justify-between">
            <DialogTitle className="text-lg font-semibold" style={{ color: "var(--text-primary)" }}>
              {context === "endless" ? "Now Showing" : "Festival Movies"}
              <span className="ml-2 text-sm font-normal" style={{ color: "var(--text-muted)" }}>
                ({movies.length} {movies.length === 1 ? "movie" : "movies"})
              </span>
            </DialogTitle>

            {/* Stats - with space for close button */}
            <div className="flex items-center gap-3 text-xs" style={{ color: "var(--text-muted)" }}>
              <span className="flex items-center gap-1">
                <Check className="w-3 h-3" />
                {watchedCount}/{movies.length} watched
              </span>
              {showRating && (
                <span className="flex items-center gap-1">
                  <Star className="w-3 h-3" />
                  {ratedCount}/{movies.length} rated
                </span>
              )}
            </div>
          </div>
        </DialogHeader>

        <ScrollArea className="h-[calc(90dvh-80px)]">
          <div className="p-4">
            {movies.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12">
                <FilmReel className="w-12 h-12 mb-3" style={{ color: "var(--text-muted)" }} />
                <p style={{ color: "var(--text-secondary)" }}>No movies yet</p>
              </div>
            ) : (
              <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-2 sm:gap-3">
                {movies.map((movie, index) => (
                  <GridMovieCard
                    key={movie.id}
                    movie={movie}
                    context={context}
                    onMarkWatched={onMarkWatched}
                    onRate={onRate}
                    onGuessNominator={onGuessNominator}
                    showGuessNominator={showGuessNominator}
                    showRating={showRating}
                    index={index}
                  />
                ))}
              </div>
            )}
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
