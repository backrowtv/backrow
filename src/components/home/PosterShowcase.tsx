"use client";

import Image from "next/image";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { FilmReel, CaretRight } from "@phosphor-icons/react";
import { getTMDBBlurDataURL } from "@/lib/utils/blur-placeholder";

interface Movie {
  id: number;
  title: string;
  poster_path: string | null;
  vote_average: number;
  release_date: string;
}

interface PosterShowcaseProps {
  movies: Movie[];
  title?: string;
  viewAllLink?: string;
  className?: string;
}

export function PosterShowcase({
  movies,
  title = "Now Showing",
  viewAllLink = "/discover",
  className,
}: PosterShowcaseProps) {
  if (movies.length === 0) {
    return null;
  }

  return (
    <div className={cn("space-y-3", className)}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <FilmReel className="h-4 w-4 text-[var(--primary)]" />
          <h3 className="text-sm font-semibold text-[var(--text-primary)]">{title}</h3>
        </div>
        {viewAllLink && (
          <Link
            href={viewAllLink}
            className="flex items-center gap-0.5 text-xs text-[var(--text-muted)] hover:text-[var(--primary)] transition-colors"
          >
            More
            <CaretRight className="h-3 w-3" />
          </Link>
        )}
      </div>

      {/* Poster Grid - 5 posters */}
      <div className="grid grid-cols-5 gap-2">
        {movies.slice(0, 5).map((movie) => {
          // Use TMDB ID directly - movie page will cache and redirect to slug
          return (
            <Link
              key={movie.id}
              href={`/movies/${movie.id}`}
              className="group relative aspect-[2/3] rounded-md overflow-hidden bg-[var(--surface-1)]"
            >
              {movie.poster_path ? (
                <Image
                  src={`https://image.tmdb.org/t/p/w185${movie.poster_path}`}
                  alt={movie.title}
                  fill
                  className="object-cover transition-transform duration-300 group-hover:scale-105"
                  sizes="(max-width: 768px) 20vw, 80px"
                  placeholder="blur"
                  blurDataURL={getTMDBBlurDataURL()}
                />
              ) : (
                <div className="absolute inset-0 flex items-center justify-center">
                  <FilmReel className="h-6 w-6 text-[var(--text-muted)]" />
                </div>
              )}

              {/* Hover overlay */}
              <div
                className={cn(
                  "absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent",
                  "opacity-0 group-hover:opacity-100 transition-opacity duration-200"
                )}
              >
                <div className="absolute bottom-0 left-0 right-0 p-1.5">
                  <p className="text-[9px] font-medium text-white leading-tight line-clamp-2">
                    {movie.title}
                  </p>
                </div>
              </div>

              {/* Rating badge */}
              {movie.vote_average > 0 && (
                <div
                  className={cn(
                    "absolute top-1 right-1 px-1 py-0.5 rounded text-[8px] font-bold flex items-center gap-0.5",
                    movie.vote_average >= 7
                      ? "bg-green-500/90 text-white"
                      : movie.vote_average >= 5
                        ? "bg-yellow-500/90 text-black"
                        : "bg-red-500/90 text-white"
                  )}
                  aria-label={`Rating: ${movie.vote_average.toFixed(1)} out of 10`}
                >
                  <span aria-hidden="true">
                    {movie.vote_average >= 7 ? "▲" : movie.vote_average >= 5 ? "●" : "▼"}
                  </span>
                  {movie.vote_average.toFixed(1)}
                </div>
              )}
            </Link>
          );
        })}
      </div>
    </div>
  );
}

// Loading skeleton
export function PosterShowcaseSkeleton() {
  return (
    <div className="space-y-3">
      <div className="h-4 w-24 bg-[var(--surface-1)] rounded animate-pulse" />
      <div className="grid grid-cols-5 gap-2">
        {[1, 2, 3, 4, 5].map((i) => (
          <div key={i} className="aspect-[2/3] rounded-md bg-[var(--surface-1)] animate-pulse" />
        ))}
      </div>
    </div>
  );
}
