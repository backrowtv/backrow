"use client";

import { useState, useEffect, useTransition } from "react";
import Image from "next/image";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { FilmReel, CircleNotch, Plus, Ticket } from "@phosphor-icons/react";
import { addToFutureNominations, addFutureNominationLink } from "@/app/actions/profile";
import toast from "react-hot-toast";
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

interface AddMovieToThemeModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  themeName: string;
  clubId: string;
  onSuccess?: () => void;
}

function toSelectedMovie(movie: TMDBMovieSearchResult): SelectedMovie {
  return {
    tmdb_id: movie.id,
    title: movie.title,
    year: movie.release_date ? new Date(movie.release_date).getFullYear() : null,
    poster_url: movie.poster_path ? `https://image.tmdb.org/t/p/w200${movie.poster_path}` : null,
  };
}

export function AddMovieToThemeModal({
  open,
  onOpenChange,
  themeName,
  clubId,
  onSuccess,
}: AddMovieToThemeModalProps) {
  const [selectedMovie, setSelectedMovie] = useState<SelectedMovie | null>(null);
  const [note, setNote] = useState("");
  const [isPending, startTransition] = useTransition();
  const { query, setQuery, results, isSearching, clear } = useMovieSearch({
    maxResults: 10,
  });

  // Reset state when modal closes
  useEffect(() => {
    if (!open) {
      clear();
      setSelectedMovie(null);
      setNote("");
    }
  }, [open, clear]);

  const handleSelect = (movie: TMDBMovieSearchResult) => {
    setSelectedMovie(toSelectedMovie(movie));
  };

  const handleSubmit = () => {
    if (!selectedMovie) return;

    startTransition(async () => {
      const result = await addToFutureNominations(
        selectedMovie.tmdb_id,
        note || undefined,
        undefined
      );

      if ("error" in result) {
        toast.error(result.error || "An error occurred");
        return;
      }

      if (result.id) {
        const linkResult = await addFutureNominationLink(result.id, clubId);
        if (linkResult.error) {
          toast.success("Added to future nominations!");
          console.error("Link error:", linkResult.error);
        } else {
          toast.success(`Added to future nominations for "${themeName}"!`);
        }
      } else {
        toast.success("Added to future nominations!");
      }

      onOpenChange(false);
      onSuccess?.();
    });
  };

  return (
    <Modal
      open={open}
      onOpenChange={onOpenChange}
      title="Add Future Nomination"
      description={`Find a movie to nominate when "${themeName}" comes up`}
      size="lg"
    >
      <div className="space-y-6">
        {/* Theme Badge */}
        <div
          className="flex items-center gap-3 p-3 rounded-lg"
          style={{ backgroundColor: "var(--primary)/10", border: "1px solid var(--primary)/20" }}
        >
          <Ticket className="w-5 h-5 text-[var(--primary)]" />
          <div>
            <p className="text-xs text-[var(--text-muted)]">Linking to theme</p>
            <p className="font-medium text-[var(--text-primary)]">{themeName}</p>
          </div>
        </div>

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
          <div className="space-y-1 max-h-64 overflow-y-auto">
            <Label>Select a movie</Label>
            {results.map((movie) => (
              <MovieSearchResultItem key={movie.id} movie={movie} onSelect={handleSelect} />
            ))}
          </div>
        )}

        {/* Selected Movie */}
        {selectedMovie && (
          <Card variant="default">
            <CardContent className="p-4">
              <div className="flex items-start gap-4">
                <div className="relative w-16 h-24 rounded-lg overflow-hidden flex-shrink-0 bg-[var(--surface-2)]">
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
                    <div className="w-full h-full flex items-center justify-center">
                      <FilmReel className="w-6 h-6 text-[var(--text-muted)]" />
                    </div>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <h3 className="font-semibold text-[var(--text-primary)]">
                        {selectedMovie.title}
                      </h3>
                      {selectedMovie.year && (
                        <p className="text-sm text-[var(--text-muted)]">{selectedMovie.year}</p>
                      )}
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setSelectedMovie(null)}
                      className="text-[var(--text-muted)] hover:text-[var(--text-primary)]"
                    >
                      Change
                    </Button>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Note */}
        {selectedMovie && (
          <div className="space-y-2">
            <Label htmlFor="note">Additional note (optional)</Label>
            <Textarea
              id="note"
              placeholder="Why does this movie fit the theme?"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              rows={2}
            />
            <p className="text-xs text-[var(--text-muted)]">
              This will be saved with your future nomination
            </p>
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

        {/* Submit Button */}
        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isPending}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={!selectedMovie || isPending}>
            {isPending ? (
              <>
                <CircleNotch className="w-4 h-4 mr-2 animate-spin" />
                Adding...
              </>
            ) : (
              <>
                <Plus className="w-4 h-4 mr-2" />
                Add Future Nomination
              </>
            )}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
