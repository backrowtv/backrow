"use client";

import { useState, useEffect, useTransition } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Select } from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  FilmReel,
  MagnifyingGlass,
  CircleNotch,
  FilmSlate,
  Check,
  Star,
} from "@phosphor-icons/react";
import { createNominationDirect } from "@/app/actions/nominations-direct";
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

interface FutureNominationItem {
  id: string;
  tmdb_id: number;
  note: string | null;
  movie: {
    tmdb_id: number;
    title: string;
    poster_url: string | null;
    year: number | null;
  } | null;
}

interface NominateMovieModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  festivalId: string;
  clubId: string;
  clubSlug: string;
  festivalSlug: string;
  festivalTheme?: string | null;
  futureNominations?: FutureNominationItem[];
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

export function NominateMovieModal({
  open,
  onOpenChange,
  festivalId,
  clubId: _clubId,
  clubSlug,
  festivalSlug,
  festivalTheme,
  futureNominations = [],
  onSuccess,
}: NominateMovieModalProps) {
  const [activeTab, setActiveTab] = useState<"search" | "future">("search");
  const [selectedMovie, setSelectedMovie] = useState<SelectedMovie | null>(null);
  const [selectedFutureNomId, setSelectedFutureNomId] = useState<string>("");
  const [pitch, setPitch] = useState("");
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  const { query, setQuery, results, isSearching, clear } = useMovieSearch({
    maxResults: 10,
  });

  // Handle future nomination selection
  useEffect(() => {
    if (selectedFutureNomId && futureNominations.length > 0) {
      const selected = futureNominations.find((fn) => fn.id === selectedFutureNomId);
      if (selected?.movie) {
        setSelectedMovie({
          tmdb_id: selected.movie.tmdb_id,
          title: selected.movie.title,
          year: selected.movie.year,
          poster_url: selected.movie.poster_url,
        });
        if (selected.note) {
          setPitch(selected.note);
        }
      }
    }
  }, [selectedFutureNomId, futureNominations]);

  // Reset state when modal closes
  useEffect(() => {
    if (!open) {
      clear();
      setSelectedMovie(null);
      setSelectedFutureNomId("");
      setPitch("");
      setActiveTab("search");
    }
  }, [open, clear]);

  const handleSelect = (movie: TMDBMovieSearchResult) => {
    setSelectedMovie(toSelectedMovie(movie));
    setSelectedFutureNomId("");
  };

  const handleSubmit = () => {
    if (!selectedMovie) return;

    startTransition(async () => {
      const result = await createNominationDirect({
        festivalId,
        tmdbId: selectedMovie.tmdb_id,
        pitch: pitch.trim() || undefined,
      });

      if ("error" in result && result.error) {
        toast.error(result.error);
      } else {
        toast.success("Movie nominated successfully!");
        onOpenChange(false);
        if (onSuccess) {
          onSuccess();
        }
        router.push(`/club/${clubSlug}/festival/${festivalSlug}`);
        router.refresh();
      }
    });
  };

  const hasFutureNominations = futureNominations.length > 0;

  // Shared search UI
  const renderSearchContent = () => (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="movie-search">Search for a movie</Label>
        <MovieSearchInput
          id="movie-search"
          value={query}
          onChange={(value) => {
            setQuery(value);
            setSelectedMovie(null);
            setSelectedFutureNomId("");
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
  );

  return (
    <Modal
      open={open}
      onOpenChange={onOpenChange}
      title="Nominate a Movie"
      description={
        festivalTheme ? `Theme: ${festivalTheme}` : "Select a movie to nominate for this festival"
      }
      size="lg"
    >
      <div className="space-y-4">
        {/* Tab Selection - only show if user has future nominations */}
        {hasFutureNominations && (
          <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as "search" | "future")}>
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="search">
                <MagnifyingGlass className="w-4 h-4 mr-2" />
                Search TMDB
              </TabsTrigger>
              <TabsTrigger value="future">
                <Star className="w-4 h-4 mr-2" />
                Your List ({futureNominations.length})
              </TabsTrigger>
            </TabsList>

            <TabsContent value="search" className="mt-4">
              {renderSearchContent()}
            </TabsContent>

            <TabsContent value="future" className="mt-4">
              {/* Future Nominations Dropdown */}
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="future-nomination">Select from your list</Label>
                  <Select
                    id="future-nomination"
                    value={selectedFutureNomId}
                    onChange={(e) => {
                      setSelectedFutureNomId(e.target.value);
                      clear();
                    }}
                  >
                    <option value="">Choose a movie...</option>
                    {futureNominations.map((fn) => (
                      <option key={fn.id} value={fn.id}>
                        {fn.movie?.title || "Unknown"} {fn.movie?.year ? `(${fn.movie.year})` : ""}
                      </option>
                    ))}
                  </Select>
                </div>

                {/* Future Nominations Grid Preview */}
                {!selectedMovie && (
                  <div className="grid grid-cols-4 gap-2 max-h-48 overflow-y-auto">
                    {futureNominations.map((fn) => (
                      <button
                        key={fn.id}
                        type="button"
                        onClick={() => setSelectedFutureNomId(fn.id)}
                        className={`relative aspect-[2/3] rounded-lg overflow-hidden transition-all ${
                          selectedFutureNomId === fn.id ? "ring-2 ring-[var(--primary)]" : ""
                        }`}
                      >
                        {fn.movie?.poster_url ? (
                          <Image
                            src={
                              fn.movie.poster_url.startsWith("http")
                                ? fn.movie.poster_url
                                : `https://image.tmdb.org/t/p/w200${fn.movie.poster_url}`
                            }
                            alt={fn.movie?.title || "Movie"}
                            fill
                            className="object-cover"
                            sizes="80px"
                            placeholder="blur"
                            blurDataURL={getTMDBBlurDataURL()}
                          />
                        ) : (
                          <div
                            className="w-full h-full flex items-center justify-center"
                            style={{ backgroundColor: "var(--surface-2)" }}
                          >
                            <FilmReel className="w-6 h-6 text-[var(--text-muted)]" />
                          </div>
                        )}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </TabsContent>
          </Tabs>
        )}

        {/* If no future nominations, just show search */}
        {!hasFutureNominations && renderSearchContent()}

        {/* Selected Movie */}
        {selectedMovie && (
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
                      onClick={() => {
                        setSelectedMovie(null);
                        setSelectedFutureNomId("");
                      }}
                      className="text-xs px-2 py-1 h-auto"
                    >
                      Change
                    </Button>
                  </div>
                  <div className="flex items-center gap-1 mt-1" style={{ color: "var(--primary)" }}>
                    <Check className="w-3 h-3" />
                    <span className="text-xs font-medium">Selected</span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Pitch/Note */}
        {selectedMovie && (
          <div className="space-y-2">
            <Label htmlFor="pitch">Pitch (optional)</Label>
            <Textarea
              id="pitch"
              placeholder="Why should everyone watch this movie?"
              value={pitch}
              onChange={(e) => setPitch(e.target.value)}
              rows={2}
              className="text-sm"
              maxLength={500}
            />
            <p className="text-xs text-[var(--text-muted)]">{pitch.length}/500 characters</p>
          </div>
        )}

        {/* Actions */}
        <div className="flex justify-end gap-3 pt-2 border-t border-[var(--border)]">
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
                Nominating...
              </>
            ) : (
              <>
                <FilmSlate className="w-4 h-4 mr-2" />
                Nominate Movie
              </>
            )}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
