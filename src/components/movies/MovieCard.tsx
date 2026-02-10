"use client";

import Image from "next/image";
import { Star } from "@phosphor-icons/react";
import { cn } from "@/lib/utils";
import { getTMDBBlurDataURL } from "@/lib/utils/blur-placeholder";
import { getGenreNames } from "@/lib/tmdb/genres";
import { MovieSearchResult } from "./MovieSearch";

interface MovieCardProps {
  movie: MovieSearchResult;
  isSelected?: boolean;
  onSelect: () => void;
  disabled?: boolean;
}

export function MovieCard({
  movie,
  isSelected = false,
  onSelect,
  disabled = false,
}: MovieCardProps) {
  const posterUrl = movie.poster_path
    ? `https://image.tmdb.org/t/p/w500${movie.poster_path}`
    : null;
  const year = movie.release_date ? new Date(movie.release_date).getFullYear() : null;
  const showRating = movie.vote_average > 0 && (movie.vote_count || 0) > 10;
  const genres = getGenreNames(movie.genre_ids || []).slice(0, 2);

  return (
    <button
      type="button"
      onClick={onSelect}
      disabled={disabled}
      className={cn(
        "group relative rounded-xl overflow-hidden",
        "border-2 transition-all",
        "duration-[var(--duration-normal)]",
        "ease-[var(--easing-default)]",
        "disabled:opacity-50 disabled:cursor-not-allowed",
        "hover:-translate-y-1",
        "hover:shadow-[var(--shadow-lg)]",
        isSelected
          ? "border-[var(--primary)] ring-2 ring-[var(--focus-ring)]"
          : "border-[var(--border)] hover:border-[var(--primary)]"
      )}
      style={{
        backgroundColor: "var(--card)",
      }}
    >
      {/* Selected indicator */}
      {isSelected && (
        <div className="absolute top-[var(--spacing-2)] right-[var(--spacing-2)] z-20 bg-[var(--primary)] rounded-full p-[var(--spacing-2)] shadow-[var(--shadow-md)] animate-scale-in">
          <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        </div>
      )}

      {/* Rating badge */}
      {showRating && (
        <div className="absolute top-[var(--spacing-2)] left-[var(--spacing-2)] z-20 flex items-center gap-0.5 bg-black/60 backdrop-blur-sm text-white text-[10px] font-medium px-1.5 py-0.5 rounded-md">
          <Star className="w-3 h-3" weight="fill" />
          {movie.vote_average.toFixed(1)}
        </div>
      )}

      {/* Poster - 2:3 aspect ratio (standard movie poster) */}
      <div className="aspect-[2/3] relative bg-[var(--surface-1)] overflow-hidden">
        {posterUrl ? (
          <Image
            src={posterUrl}
            alt={movie.title}
            fill
            className="object-cover transition-transform duration-[var(--duration-normal)] group-hover:scale-105"
            sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
            placeholder="blur"
            blurDataURL={getTMDBBlurDataURL()}
          />
        ) : (
          <div className="flex items-center justify-center h-full text-[var(--text-muted)] text-[var(--font-body-sm-size)]">
            No Poster
          </div>
        )}
      </div>

      {/* Content */}
      <div className="p-[var(--spacing-2)] bg-[var(--card)] border-t border-[var(--border)]">
        {/* Title */}
        <div className="font-[var(--font-h4-weight)] text-[var(--font-body-sm-size)] text-[var(--text-primary)] line-clamp-2 mb-[var(--spacing-1)]">
          {movie.title}
        </div>

        {/* Year */}
        {year && (
          <div className="text-[var(--font-caption-size)] text-[var(--text-secondary)] mb-[var(--spacing-1)]">
            {year}
          </div>
        )}

        {/* Genres */}
        {genres.length > 0 && (
          <div className="text-[var(--font-caption-size)] text-[var(--text-muted)] line-clamp-1">
            {genres.join(", ")}
          </div>
        )}
      </div>
    </button>
  );
}
