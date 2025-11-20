"use client";

import { useState, useEffect, useRef, useTransition } from "react";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import Image from "next/image";
import { User, MagnifyingGlass } from "@phosphor-icons/react";
import { getTMDBBlurDataURL } from "@/lib/utils/blur-placeholder";
import { useMovieSearch } from "@/hooks/useMovieSearch";
import { MovieSearchResultItem } from "@/components/movies/MovieSearchResultItem";
import type { TMDBMovieSearchResult } from "@/lib/tmdb/client";
import type { FavoriteItemType } from "@/types/favorites";

interface PersonSearchResult {
  id: number;
  name: string;
  profile_path: string | null;
  known_for_department: string;
  popularity?: number;
}

interface AddFavoriteDialogProps {
  open: boolean;
  onClose: () => void;
  onSelect: (
    tmdbId: number,
    itemType: FavoriteItemType,
    title: string,
    imagePath: string | null,
    subtitle: string | null
  ) => void;
  existingTmdbIds: Set<string>;
  defaultType?: FavoriteItemType;
}

export function AddFavoriteDialog({
  open,
  onClose,
  onSelect,
  existingTmdbIds,
  defaultType,
}: AddFavoriteDialogProps) {
  const [searchType, setSearchType] = useState<FavoriteItemType>(defaultType || "movie");
  const [isPending, startTransition] = useTransition();

  // Movie search via shared hook
  const movieSearch = useMovieSearch({
    maxResults: 8,
    enabled: searchType === "movie",
  });

  // People search (inline - different API)
  const [personQuery, setPersonQuery] = useState("");
  const [personResults, setPersonResults] = useState<PersonSearchResult[]>([]);
  const [isSearchingPeople, setIsSearchingPeople] = useState(false);
  const personTimer = useRef<NodeJS.Timeout | null>(null);

  // Reset on open/close
  useEffect(() => {
    if (open) {
      if (defaultType) setSearchType(defaultType);
    } else {
      movieSearch.clear();
      setPersonQuery("");
      setPersonResults([]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- movieSearch is a stable hook instance; including it would cause unnecessary re-runs
  }, [open, defaultType]);

  // People search effect
  useEffect(() => {
    if (personTimer.current) clearTimeout(personTimer.current);
    if (searchType !== "person" || personQuery.trim().length < 2) {
      setPersonResults([]);
      return;
    }

    personTimer.current = setTimeout(async () => {
      setIsSearchingPeople(true);
      try {
        const response = await fetch(
          `/api/tmdb/search-people?q=${encodeURIComponent(personQuery)}`
        );
        const data = await response.json();
        if (response.ok) {
          const results = (data.results || []) as PersonSearchResult[];
          results.sort((a, b) => (b.popularity || 0) - (a.popularity || 0));
          setPersonResults(results.slice(0, 12));
        }
      } catch (err) {
        console.error("Search error:", err);
      } finally {
        setIsSearchingPeople(false);
      }
    }, 400);

    return () => {
      if (personTimer.current) clearTimeout(personTimer.current);
    };
  }, [personQuery, searchType]);

  const handleMovieSelect = (movie: TMDBMovieSearchResult) => {
    const key = `movie:${movie.id}`;
    if (existingTmdbIds.has(key)) return;

    startTransition(() => {
      const imagePath = movie.poster_path
        ? `https://image.tmdb.org/t/p/w500${movie.poster_path}`
        : null;
      const year = movie.release_date
        ? new Date(movie.release_date).getFullYear().toString()
        : null;
      onSelect(movie.id, "movie", movie.title, imagePath, year);
    });
  };

  const handlePersonSelect = (person: PersonSearchResult) => {
    const key = `person:${person.id}`;
    if (existingTmdbIds.has(key)) return;

    startTransition(() => {
      const imagePath = person.profile_path
        ? `https://image.tmdb.org/t/p/w185${person.profile_path}`
        : null;
      onSelect(person.id, "person", person.name, imagePath, person.known_for_department || null);
    });
  };

  const currentQuery = searchType === "movie" ? movieSearch.query : personQuery;
  const isSearching = searchType === "movie" ? movieSearch.isSearching : isSearchingPeople;

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-[calc(100vw-2rem)] sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Add Favorite</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Type toggle */}
          <div className="flex gap-1 p-0.5 rounded-lg bg-[var(--surface-1)]">
            <button
              onClick={() => {
                setSearchType("movie");
                setPersonQuery("");
                setPersonResults([]);
              }}
              className={`flex-1 text-xs font-medium py-1.5 rounded-md transition-colors ${
                searchType === "movie"
                  ? "bg-[var(--surface-2)] text-[var(--text-primary)]"
                  : "text-[var(--text-muted)] hover:text-[var(--text-secondary)]"
              }`}
            >
              Movies
            </button>
            <button
              onClick={() => {
                setSearchType("person");
                movieSearch.clear();
              }}
              className={`flex-1 text-xs font-medium py-1.5 rounded-md transition-colors ${
                searchType === "person"
                  ? "bg-[var(--surface-2)] text-[var(--text-primary)]"
                  : "text-[var(--text-muted)] hover:text-[var(--text-secondary)]"
              }`}
            >
              People
            </button>
          </div>

          {/* Search input */}
          <div className="relative">
            <MagnifyingGlass className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[var(--text-muted)]" />
            <Input
              type="text"
              placeholder={searchType === "movie" ? "Search movies..." : "Search people..."}
              value={currentQuery}
              onChange={(e) => {
                if (searchType === "movie") {
                  movieSearch.setQuery(e.target.value);
                } else {
                  setPersonQuery(e.target.value);
                }
              }}
              className="pl-10 search-input-debossed"
              autoFocus
            />
          </div>

          {/* Results */}
          <div className="max-h-80 overflow-y-auto space-y-1">
            {isSearching && (
              <div className="py-8 text-center text-sm text-[var(--text-muted)]">Searching...</div>
            )}

            {!isSearching &&
              currentQuery.length >= 2 &&
              searchType === "movie" &&
              movieSearch.results.length === 0 && (
                <div className="py-8 text-center text-sm text-[var(--text-muted)]">
                  No results found
                </div>
              )}

            {!isSearching &&
              currentQuery.length >= 2 &&
              searchType === "person" &&
              personResults.length === 0 && (
                <div className="py-8 text-center text-sm text-[var(--text-muted)]">
                  No results found
                </div>
              )}

            {/* Movie results */}
            {!isSearching &&
              searchType === "movie" &&
              movieSearch.results.map((movie) => (
                <MovieSearchResultItem
                  key={movie.id}
                  movie={movie}
                  onSelect={handleMovieSelect}
                  alreadySelected={existingTmdbIds.has(`movie:${movie.id}`)}
                  disabled={isPending}
                />
              ))}

            {/* Person results */}
            {!isSearching &&
              searchType === "person" &&
              personResults.map((person) => {
                const alreadyAdded = existingTmdbIds.has(`person:${person.id}`);
                return (
                  <button
                    key={person.id}
                    onClick={() => handlePersonSelect(person)}
                    disabled={isPending || alreadyAdded}
                    className="w-full flex items-center gap-3 p-2 rounded-lg hover:bg-[var(--surface-1)] transition-colors text-left disabled:opacity-50"
                  >
                    <div className="relative w-10 h-10 flex-shrink-0 rounded-full overflow-hidden bg-[var(--surface-2)]">
                      {person.profile_path ? (
                        <Image
                          src={`https://image.tmdb.org/t/p/w92${person.profile_path}`}
                          alt={person.name}
                          fill
                          className="object-cover"
                          sizes="40px"
                          placeholder="blur"
                          blurDataURL={getTMDBBlurDataURL()}
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-[var(--text-muted)]">
                          <User className="h-4 w-4" />
                        </div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-[var(--text-primary)]">
                        {person.name}
                      </p>
                      <div className="flex items-center gap-2">
                        <p className="text-xs text-[var(--text-muted)]">
                          {person.known_for_department}
                        </p>
                        {alreadyAdded && (
                          <p className="text-xs text-[var(--text-muted)] italic">Already added</p>
                        )}
                      </div>
                    </div>
                  </button>
                );
              })}

            {!isSearching && currentQuery.length < 2 && (
              <div className="py-8 text-center text-sm text-[var(--text-muted)]">
                Type at least 2 characters to search
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
