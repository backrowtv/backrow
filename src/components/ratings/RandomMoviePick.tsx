"use client";

import { useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";
import { Database } from "@/types/database";

type Nomination = Database["public"]["Tables"]["nominations"]["Row"];
type Movie = Database["public"]["Tables"]["movies"]["Row"];

interface RandomMoviePickProps {
  nominations: (Nomination & {
    movies: Movie | null;
  })[];
  currentUserId: string;
  ratedNominationIds: Set<string>;
  isRatingPhase: boolean;
}

export function RandomMoviePick({
  nominations,
  currentUserId,
  ratedNominationIds,
  isRatingPhase,
}: RandomMoviePickProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedMovie, setSelectedMovie] = useState<{
    nomination: Nomination & { movies: Movie | null | Movie[] };
  } | null>(null);

  // Get unrated nominations (excluding own nominations)
  const unratedNominations = useMemo(() => {
    return nominations.filter((nomination) => {
      const isOwnNomination = nomination.user_id === currentUserId;
      const isRated = ratedNominationIds.has(nomination.id);
      const hasMovie = nomination.movies !== null;
      return !isOwnNomination && !isRated && hasMovie;
    });
  }, [nominations, currentUserId, ratedNominationIds]);

  const hasUnratedMovies = unratedNominations.length > 0;

  const handleRandomPick = () => {
    if (unratedNominations.length === 0) {
      return;
    }

    // Randomly select one unrated nomination
    const randomIndex = Math.floor(Math.random() * unratedNominations.length);
    const randomNomination = unratedNominations[randomIndex];

    setSelectedMovie({ nomination: randomNomination });
    setIsOpen(true);
  };

  const handleClose = () => {
    setIsOpen(false);
    // Clear selection after a short delay to allow animation
    setTimeout(() => setSelectedMovie(null), 300);
  };

  // Only show button if in rating phase and has unrated movies
  if (!isRatingPhase || !hasUnratedMovies) {
    return null;
  }

  return (
    <>
      <Button onClick={handleRandomPick} variant="secondary" size="md" className="mb-6">
        <FilmReelIcon className="mr-2 h-5 w-5" />
        Random Movie Pick
      </Button>

      <Modal
        open={isOpen}
        onOpenChange={setIsOpen}
        title={(() => {
          // Handle movies relation - can be array or object
          const moviesRelation = selectedMovie?.nomination.movies;
          const movie = Array.isArray(moviesRelation) ? moviesRelation[0] : moviesRelation;
          return movie ? `Random movie pick: '${movie.title}'` : "Random Movie Pick";
        })()}
        size="md"
      >
        <div className="space-y-6">
          {(() => {
            // Handle movies relation - can be array or object
            const moviesRelation = selectedMovie?.nomination.movies;
            const movie = Array.isArray(moviesRelation) ? moviesRelation[0] : moviesRelation;
            return (
              movie && (
                <div className="text-center">
                  <p className="text-lg text-zinc-300 mb-4">Time to watch and rate this one!</p>

                  {movie.poster_url && (
                    <div className="flex justify-center mb-4">
                      <div className="aspect-[2/3] w-32 relative rounded-lg overflow-hidden bg-zinc-800">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={movie.poster_url}
                          alt={movie.title}
                          className="w-full h-full object-cover"
                        />
                      </div>
                    </div>
                  )}

                  <div className="text-sm text-[var(--text-muted)] space-y-1">
                    {movie.year && <p>Year: {movie.year}</p>}
                    {movie.director && <p>Director: {movie.director}</p>}
                    {selectedMovie?.nomination.pitch && (
                      <div className="mt-4 pt-4 border-t border-[var(--border)]">
                        <p className="text-zinc-300 italic">
                          &quot;{selectedMovie.nomination.pitch}&quot;
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              )
            );
          })()}

          <div className="flex justify-end gap-3 pt-4 border-t border-[var(--border)]">
            <Button onClick={handleClose} variant="primary" size="md">
              OK
            </Button>
          </div>
        </div>
      </Modal>
    </>
  );
}

// Film Reel Icon Component - Movie-themed random pick icon
function FilmReelIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
      xmlns="http://www.w3.org/2000/svg"
    >
      {/* Film reel with sprocket holes */}
      <circle cx="12" cy="12" r="8" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
      {/* Sprocket holes */}
      <circle cx="12" cy="6" r="1" fill="currentColor" />
      <circle cx="12" cy="18" r="1" fill="currentColor" />
      <circle cx="6" cy="12" r="1" fill="currentColor" />
      <circle cx="18" cy="12" r="1" fill="currentColor" />
      {/* Center circle */}
      <circle cx="12" cy="12" r="2" fill="currentColor" />
      {/* Film strip lines */}
      <path strokeWidth={1.5} d="M4 8h16M4 16h16" strokeLinecap="round" />
    </svg>
  );
}
