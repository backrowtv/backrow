"use client";

import Image from "next/image";
import { FilmReel, Plus, Check } from "@phosphor-icons/react";
import { getTMDBBlurDataURL } from "@/lib/utils/blur-placeholder";
import { getGenreNames } from "@/lib/tmdb/genres";
import type { TMDBMovieSearchResult } from "@/lib/tmdb/client";

interface MovieSearchResultItemProps {
  movie: TMDBMovieSearchResult;
  onSelect: (movie: TMDBMovieSearchResult) => void;
  disabled?: boolean;
  alreadySelected?: boolean;
  /** Compact mode: only shows poster, title, year */
  compact?: boolean;
}

export function MovieSearchResultItem({
  movie,
  onSelect,
  disabled = false,
  alreadySelected = false,
  compact = false,
}: MovieSearchResultItemProps) {
  const year = movie.release_date ? new Date(movie.release_date).getFullYear() : null;
  const posterUrl = movie.poster_path
    ? `https://image.tmdb.org/t/p/w200${movie.poster_path}`
    : null;
  const genres = getGenreNames(movie.genre_ids || []).slice(0, 2);
  const topCast = movie.cast?.slice(0, 3) || [];
  const director = movie.director || null;

  return (
    <button
      type="button"
      onClick={() => onSelect(movie)}
      disabled={disabled || alreadySelected}
      className="w-full flex items-start gap-3 p-2.5 rounded-lg transition-colors text-left hover:bg-[var(--surface-1)] disabled:opacity-50 disabled:cursor-not-allowed"
    >
      {/* Poster */}
      <div className="relative w-10 aspect-[2/3] rounded overflow-hidden flex-shrink-0 bg-[var(--surface-2)]">
        {posterUrl ? (
          <Image
            src={posterUrl}
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

      {/* Info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <p className="font-medium text-sm text-[var(--text-primary)] line-clamp-1">
              {movie.title}
              {year && <span className="text-[var(--text-muted)] font-normal"> ({year})</span>}
            </p>
            {!compact && (director || genres.length > 0) && (
              <p className="text-xs text-[var(--text-muted)] mt-0.5 line-clamp-1">
                {director && <span>Dir. {director}</span>}
                {director && genres.length > 0 && <span> · </span>}
                {genres.length > 0 && <span>{genres.join(", ")}</span>}
              </p>
            )}
            {!compact && topCast.length > 0 && (
              <p className="text-xs text-[var(--text-muted)] mt-0.5 line-clamp-1">
                {topCast.join(", ")}
              </p>
            )}
            {!compact && !director && !topCast.length && movie.overview && (
              <p className="text-xs text-[var(--text-muted)] mt-0.5 line-clamp-1">
                {movie.overview}
              </p>
            )}
          </div>

          <div className="flex items-center gap-2 flex-shrink-0">
            {alreadySelected ? (
              <Check className="w-4 h-4 text-[var(--primary)]" />
            ) : (
              <Plus className="w-4 h-4 text-[var(--text-muted)]" />
            )}
          </div>
        </div>
      </div>
    </button>
  );
}
