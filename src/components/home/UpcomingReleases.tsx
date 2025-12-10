"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { CaretRight, CalendarDots, FilmSlate } from "@phosphor-icons/react";
import { getTMDBBlurDataURL } from "@/lib/utils/blur-placeholder";

interface Movie {
  id: number;
  title: string;
  poster_path: string | null;
  release_date: string;
}

interface UpcomingReleasesProps {
  movies: Movie[];
  className?: string;
}

function formatReleaseDate(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffDays = Math.ceil((date.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

  if (diffDays <= 0) return "Out now";
  if (diffDays === 1) return "Tomorrow";
  if (diffDays <= 7) return `In ${diffDays} days`;

  return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

export function UpcomingReleases({ movies, className }: UpcomingReleasesProps) {
  const [formattedDates, setFormattedDates] = useState<Record<number, string>>({});

  useEffect(() => {
    // Calculate dates on the client only
    const dates: Record<number, string> = {};
    movies.forEach((movie) => {
      dates[movie.id] = formatReleaseDate(movie.release_date);
    });
    setFormattedDates(dates);
  }, [movies]);

  if (movies.length === 0) {
    return null;
  }

  return (
    <div className={cn("space-y-3", className)}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <CalendarDots className="h-4 w-4 text-teal-400" />
          <h3 className="text-sm font-semibold text-[var(--text-primary)]">Coming Soon</h3>
        </div>
        <Link
          href="/discover?tab=upcoming"
          className="flex items-center gap-0.5 text-xs text-[var(--text-muted)] hover:text-[var(--primary)] transition-colors"
        >
          All
          <CaretRight className="h-3 w-3" />
        </Link>
      </div>

      {/* List */}
      <div className="space-y-2">
        {movies.slice(0, 4).map((movie) => {
          // Use TMDB ID directly - movie page will cache and redirect to slug
          return (
            <Link
              key={movie.id}
              href={`/movies/${movie.id}`}
              className={cn(
                "flex items-center gap-3 p-2 -mx-2 rounded-lg",
                "hover:bg-[var(--surface-1)] transition-colors group"
              )}
            >
              {/* Poster */}
              <div className="relative w-10 h-14 rounded overflow-hidden flex-shrink-0 bg-[var(--surface-1)]">
                {movie.poster_path ? (
                  <Image
                    src={`https://image.tmdb.org/t/p/w92${movie.poster_path}`}
                    alt={movie.title}
                    fill
                    className="object-cover"
                    sizes="40px"
                    placeholder="blur"
                    blurDataURL={getTMDBBlurDataURL()}
                  />
                ) : (
                  <div className="absolute inset-0 flex items-center justify-center">
                    <FilmSlate className="h-4 w-4 text-[var(--text-muted)]" />
                  </div>
                )}
              </div>

              {/* Info */}
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium text-[var(--text-primary)] line-clamp-2 leading-tight group-hover:text-[var(--primary)] transition-colors">
                  {movie.title}
                </p>
                <p
                  className="text-[10px] text-teal-400 font-medium mt-0.5"
                  suppressHydrationWarning
                >
                  {formattedDates[movie.id] || "..."}
                </p>
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}

// Loading skeleton
export function UpcomingReleasesSkeleton() {
  return (
    <div className="space-y-3">
      <div className="h-4 w-28 bg-[var(--surface-1)] rounded animate-pulse" />
      <div className="space-y-2">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="flex items-center gap-3 p-2">
            <div className="w-10 h-14 rounded bg-[var(--surface-1)] animate-pulse" />
            <div className="flex-1 space-y-1">
              <div className="h-3 w-3/4 bg-[var(--surface-1)] rounded animate-pulse" />
              <div className="h-2 w-1/2 bg-[var(--surface-1)] rounded animate-pulse" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
