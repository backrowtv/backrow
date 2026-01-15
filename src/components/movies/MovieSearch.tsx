"use client";

import { useRef } from "react";
import { MovieCard } from "./MovieCard";
import { useMovieSearch } from "@/hooks/useMovieSearch";
import type { TMDBMovieSearchResult } from "@/lib/tmdb/client";

export type { TMDBMovieSearchResult as MovieSearchResult };

interface MovieSearchProps {
  onSelect: (movieId: number) => void;
  selectedMovieId?: number;
  disabled?: boolean;
}

export function MovieSearch({ onSelect, selectedMovieId, disabled = false }: MovieSearchProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const { query, setQuery, results, isSearching, error } = useMovieSearch({
    maxResults: 20,
  });

  return (
    <div className="space-y-4">
      <div>
        <label
          className="block text-sm font-medium mb-2"
          style={{ color: "var(--text-secondary)" }}
        >
          Search Movies
        </label>
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          disabled={disabled}
          placeholder="Search for a movie..."
          className="block w-full rounded-md border px-3 py-2 focus:outline-none disabled:opacity-50 search-input-debossed"
        />
        <p className="mt-1 text-xs" style={{ color: "var(--text-muted)" }}>
          Type at least 2 characters to search
        </p>
      </div>

      {error && (
        <div
          className="rounded-md p-3 text-sm border"
          style={{
            backgroundColor: "color-mix(in srgb, var(--error) 10%, transparent)",
            borderColor: "color-mix(in srgb, var(--error) 30%, transparent)",
          }}
        >
          <span style={{ color: "var(--error)", fontWeight: 500 }}>{error}</span>
        </div>
      )}

      {isSearching && (
        <div className="text-center py-4" style={{ color: "var(--text-secondary)" }}>
          Searching...
        </div>
      )}

      {!isSearching && results.length > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {results.map((movie) => (
            <MovieCard
              key={movie.id}
              movie={movie}
              isSelected={selectedMovieId === movie.id}
              onSelect={() => onSelect(movie.id)}
              disabled={disabled}
            />
          ))}
        </div>
      )}

      {!isSearching && query.length >= 2 && results.length === 0 && !error && (
        <div className="text-center py-4" style={{ color: "var(--text-secondary)" }}>
          No movies found
        </div>
      )}
    </div>
  );
}
