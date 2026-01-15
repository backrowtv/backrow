"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { FilmReel, CircleNotch, Plus, Check } from "@phosphor-icons/react";
import { getTMDBBlurDataURL } from "@/lib/utils/blur-placeholder";
import { useMovieSearch } from "@/hooks/useMovieSearch";
import { MovieSearchInput } from "@/components/movies/MovieSearchInput";
import { MovieSearchResultItem } from "@/components/movies/MovieSearchResultItem";
import type { TMDBMovieSearchResult } from "@/lib/tmdb/client";

interface SelectedMovie {
  tmdb_id: number;
  title: string;
  year: number | null;
  poster_url: string | null;
}

interface AddMovieModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onMovieSelected: (tmdbId: number, curatorNote?: string) => void;
  isPending: boolean;
  clubName: string;
}

function toSelectedMovie(movie: TMDBMovieSearchResult): SelectedMovie {
  return {
    tmdb_id: movie.id,
    title: movie.title,
    year: movie.release_date ? new Date(movie.release_date).getFullYear() : null,
    poster_url: movie.poster_path ? `https://image.tmdb.org/t/p/w200${movie.poster_path}` : null,
  };
}

export function AddMovieModal({
  open,
  onOpenChange,
  onMovieSelected,
  isPending,
  clubName,
}: AddMovieModalProps) {
  const [selectedMovie, setSelectedMovie] = useState<SelectedMovie | null>(null);
  const [curatorNote, setCuratorNote] = useState("");
  const { query, setQuery, results, isSearching, clear } = useMovieSearch({
    maxResults: 10,
  });

  // Reset state when modal closes
  useEffect(() => {
    if (!open) {
      clear();
      setSelectedMovie(null);
      setCuratorNote("");
    }
  }, [open, clear]);

  const handleSelect = (movie: TMDBMovieSearchResult) => {
    setSelectedMovie(toSelectedMovie(movie));
  };

  const handleSubmit = () => {
    if (selectedMovie) {
      onMovieSelected(selectedMovie.tmdb_id, curatorNote || undefined);
    }
  };

  return (
    <Modal
      open={open}
      onOpenChange={onOpenChange}
      title="Add Movie to Endless Festival"
      description={`Select a movie to start playing in ${clubName}`}
      size="lg"
    >
      <div className="flex flex-col min-h-0">
        {/* Scrollable content */}
        <div className="space-y-4 flex-1 min-h-0">
          {/* Movie Search */}
          <div className="space-y-2">
            <Label htmlFor="movie-search">Search for a movie</Label>
            <MovieSearchInput
              id="movie-search"
              value={query}
              onChange={(value) => {
                setQuery(value);
                setSelectedMovie(null);
              }}
              isSearching={isSearching}
              placeholder="Enter movie title..."
            />
          </div>

          {/* Search Results */}
          {results.length > 0 && !selectedMovie && (
            <div className="space-y-1 max-h-48 overflow-y-auto">
              {results.map((movie) => (
                <MovieSearchResultItem key={movie.id} movie={movie} onSelect={handleSelect} />
              ))}
            </div>
          )}

          {/* Selected Movie */}
          {selectedMovie && (
            <div className="space-y-4">
              <Card
                style={{ backgroundColor: "var(--surface-2)", borderColor: "var(--primary)" }}
                className="border-2"
              >
                <CardContent className="p-3">
                  <div className="flex gap-3">
                    <div className="relative w-16 aspect-[2/3] rounded overflow-hidden flex-shrink-0">
                      {selectedMovie.poster_url ? (
                        <Image
                          src={selectedMovie.poster_url}
                          alt={selectedMovie.title}
                          fill
                          className="object-cover"
                          sizes="64px"
                          placeholder="blur"
                          blurDataURL={getTMDBBlurDataURL()}
                        />
                      ) : (
                        <div
                          className="w-full h-full flex items-center justify-center"
                          style={{ backgroundColor: "var(--surface-1)" }}
                        >
                          <FilmReel className="w-6 h-6 text-[var(--text-muted)]" />
                        </div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <h3
                            className="font-semibold text-sm"
                            style={{ color: "var(--text-primary)" }}
                          >
                            {selectedMovie.title}
                          </h3>
                          {selectedMovie.year && (
                            <p className="text-xs" style={{ color: "var(--text-muted)" }}>
                              {selectedMovie.year}
                            </p>
                          )}
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setSelectedMovie(null)}
                          className="text-xs px-2 py-1 h-auto"
                        >
                          Change
                        </Button>
                      </div>
                      <div
                        className="flex items-center gap-1 mt-1"
                        style={{ color: "var(--primary)" }}
                      >
                        <Check className="w-3 h-3" />
                        <span className="text-xs font-medium">Selected</span>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Curator Note */}
              <div className="space-y-2">
                <Label htmlFor="curator-note" className="text-sm">
                  Curator&apos;s Note (optional)
                </Label>
                <Textarea
                  id="curator-note"
                  placeholder="Add a note about why you're recommending this film..."
                  value={curatorNote}
                  onChange={(e) => setCuratorNote(e.target.value)}
                  rows={2}
                  className="text-sm"
                />
              </div>
            </div>
          )}

          {/* Empty State */}
          {!isSearching && query.length >= 2 && results.length === 0 && !selectedMovie && (
            <div className="text-center py-6">
              <FilmReel className="w-10 h-10 mx-auto mb-2 text-[var(--text-muted)] opacity-50" />
              <p className="text-sm" style={{ color: "var(--text-muted)" }}>
                No movies found for &quot;{query}&quot;
              </p>
            </div>
          )}
        </div>

        {/* Actions - Fixed at bottom */}
        <div className="flex justify-end gap-3 pt-4 mt-4 border-t border-[var(--border)] flex-shrink-0">
          <Button variant="ghost" onClick={() => onOpenChange(false)} disabled={isPending}>
            Cancel
          </Button>
          <Button
            variant="club-accent"
            onClick={handleSubmit}
            disabled={!selectedMovie || isPending}
          >
            {isPending ? (
              <>
                <CircleNotch className="w-4 h-4 mr-2 animate-spin" />
                Adding...
              </>
            ) : (
              <>
                <Plus className="w-4 h-4 mr-2" />
                Add Movie
              </>
            )}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
