"use client";

import { useState, useEffect, useRef, useTransition } from "react";
import Image from "next/image";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { FilmReel, MagnifyingGlass, CircleNotch, Plus } from "@phosphor-icons/react";
import { addToFutureNominations } from "@/app/actions/profile";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import { getTMDBBlurDataURL } from "@/lib/utils/blur-placeholder";

interface Movie {
  tmdb_id: number;
  title: string;
  year: number | null;
  poster_url: string | null;
}

interface TMDBMagnifyingGlassResult {
  id: number;
  title: string;
  release_date: string;
  poster_path: string | null;
}

interface AddFutureNominationModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Called after successful addition - use to refetch data without page refresh */
  onSuccess?: () => void;
  /** Pre-fill the note field (e.g., with theme name) */
  initialNote?: string;
  /** Pre-fill the tags field (e.g., with theme tag) */
  initialTags?: string[];
}

export function AddFutureNominationModal({
  open,
  onOpenChange,
  onSuccess,
  initialNote,
  initialTags,
}: AddFutureNominationModalProps) {
  const [searchQuery, setMagnifyingGlassQuery] = useState("");
  const [searchResults, setMagnifyingGlassResults] = useState<Movie[]>([]);
  const [selectedMovie, setSelectedMovie] = useState<Movie | null>(null);
  const [note, setNote] = useState(initialNote || "");
  const [tags, setTags] = useState(initialTags?.join(", ") || "");
  const [isMagnifyingGlassing, setIsMagnifyingGlassing] = useState(false);
  const [isPending, startTransition] = useTransition();
  const debounceTimer = useRef<NodeJS.Timeout | null>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();

  // Reset to initial values when initialNote/initialTags change
  useEffect(() => {
    if (open) {
      setNote(initialNote || "");
      setTags(initialTags?.join(", ") || "");
    }
  }, [open, initialNote, initialTags]);

  // MagnifyingGlass for movies when query changes (debounced)
  useEffect(() => {
    // Clear previous timer
    if (debounceTimer.current) {
      clearTimeout(debounceTimer.current);
    }

    // Don't search if query is too short
    if (searchQuery.trim().length < 2) {
      setMagnifyingGlassResults([]);
      return;
    }

    // Debounce search
    debounceTimer.current = setTimeout(async () => {
      setIsMagnifyingGlassing(true);
      try {
        const response = await fetch(`/api/tmdb/search?q=${encodeURIComponent(searchQuery)}`);
        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.error || "MagnifyingGlass failed");
        }

        // Transform TMDB results to our format
        const movies: Movie[] = (data.results || [])
          .slice(0, 10)
          .map((result: TMDBMagnifyingGlassResult) => ({
            tmdb_id: result.id,
            title: result.title,
            year: result.release_date ? new Date(result.release_date).getFullYear() : null,
            poster_url: result.poster_path
              ? `https://image.tmdb.org/t/p/w200${result.poster_path}`
              : null,
          }));
        setMagnifyingGlassResults(movies);
      } catch (error) {
        console.error("MagnifyingGlass error:", error);
        setMagnifyingGlassResults([]);
      } finally {
        setIsMagnifyingGlassing(false);
      }
    }, 400);

    return () => {
      if (debounceTimer.current) {
        clearTimeout(debounceTimer.current);
      }
    };
  }, [searchQuery]);

  // Reset state when modal closes
  useEffect(() => {
    if (!open) {
      setMagnifyingGlassQuery("");
      setMagnifyingGlassResults([]);
      setSelectedMovie(null);
      setNote(initialNote || "");
      setTags(initialTags?.join(", ") || "");
    }
  }, [open, initialNote, initialTags]);

  const handleSubmit = () => {
    if (!selectedMovie) return;

    startTransition(async () => {
      const tagArray = tags
        .split(",")
        .map((t) => t.trim())
        .filter((t) => t.length > 0);

      const result = await addToFutureNominations(
        selectedMovie.tmdb_id,
        note || undefined,
        tagArray.length > 0 ? tagArray : undefined
      );

      if ("error" in result) {
        toast.error(result.error || "An error occurred");
      } else {
        toast.success("Added to future nominations!");
        onOpenChange(false);
        // Call onSuccess callback to refetch data, or fall back to router.refresh()
        if (onSuccess) {
          onSuccess();
        } else {
          router.refresh();
        }
      }
    });
  };

  return (
    <Modal
      open={open}
      onOpenChange={onOpenChange}
      title="Add to Future Nominations"
      description="Save a movie to nominate in upcoming festivals"
      size="lg"
    >
      <div className="space-y-6">
        {/* Movie Search */}
        <div className="space-y-2">
          <Label htmlFor="movie-search">Search for a movie</Label>
          <div className="relative">
            <MagnifyingGlass className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[var(--text-muted)]" />
            <Input
              ref={searchInputRef}
              id="movie-search"
              placeholder="Enter movie title..."
              value={searchQuery}
              onChange={(e) => {
                setMagnifyingGlassQuery(e.target.value);
                setSelectedMovie(null);
              }}
              className="pl-10"
            />
            {isMagnifyingGlassing && (
              <CircleNotch className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-[var(--text-muted)]" />
            )}
          </div>
        </div>

        {/* MagnifyingGlass Results */}
        {searchResults.length > 0 && !selectedMovie && (
          <div className="space-y-2 max-h-64 overflow-y-auto">
            <Label>Select a movie</Label>
            {searchResults.map((movie) => (
              <button
                key={movie.tmdb_id}
                type="button"
                onClick={() => setSelectedMovie(movie)}
                className="w-full flex items-center gap-3 p-2 rounded-lg hover:bg-[var(--surface-1)] transition-colors text-left"
              >
                <div className="relative w-10 h-14 rounded overflow-hidden flex-shrink-0 bg-[var(--surface-2)]">
                  {movie.poster_url ? (
                    <Image
                      src={movie.poster_url}
                      alt={movie.title}
                      fill
                      className="object-cover"
                      sizes="40px"
                      placeholder="blur"
                      blurDataURL={getTMDBBlurDataURL()}
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <FilmReel className="w-4 h-4 text-[var(--text-muted)]" />
                    </div>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm text-[var(--text-primary)] truncate">
                    {movie.title}
                  </p>
                  {movie.year && <p className="text-xs text-[var(--text-muted)]">{movie.year}</p>}
                </div>
              </button>
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
            <Label htmlFor="note">Note (optional)</Label>
            <Textarea
              id="note"
              placeholder="Why do you want to nominate this movie?"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              rows={2}
            />
          </div>
        )}

        {/* Tags */}
        {selectedMovie && (
          <div className="space-y-2">
            <Label htmlFor="tags">Tags (optional)</Label>
            <Input
              id="tags"
              placeholder="horror, 80s, slasher (comma separated)"
              value={tags}
              onChange={(e) => setTags(e.target.value)}
            />
            <p className="text-xs text-[var(--text-muted)]">
              Add tags to help you find this movie later when a matching theme comes up
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
                <span className="hidden sm:inline">Add to Future Nominations</span>
                <span className="sm:hidden">Add</span>
              </>
            )}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
