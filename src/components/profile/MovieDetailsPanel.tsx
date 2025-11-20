"use client";

import { CollapsibleText } from "@/components/ui/collapsible-text";
import { CastCarousel } from "@/components/movies/CastCarousel";
import { Skeleton } from "@/components/ui/skeleton";
import type { MovieDetailsForDisplay } from "@/app/actions/tmdb";
import type { MovieLinkType } from "@/lib/navigation-constants";

interface MovieDetailsPanelProps {
  movie: MovieDetailsForDisplay | null;
  visibleLinks: MovieLinkType[];
  loading: boolean;
}

export function MovieDetailsPanel({
  movie,
  visibleLinks: _visibleLinks,
  loading,
}: MovieDetailsPanelProps) {
  if (loading) {
    return <MovieDetailsSkeleton />;
  }

  if (!movie) {
    return null;
  }

  return (
    <div className="space-y-6 mt-6 pt-6 border-t border-[var(--border)]">
      {/* Overview */}
      {movie.overview && (
        <section>
          <h3 className="text-sm font-semibold text-[var(--text-primary)] uppercase tracking-wide mb-2">
            Overview
          </h3>
          <CollapsibleText text={movie.overview} />
        </section>
      )}

      {/* Cast & Crew */}
      {((movie.cast?.length ?? 0) > 0 ||
        (movie.directors?.length ?? 0) > 0 ||
        (movie.composers?.length ?? 0) > 0) && (
        <CastCarousel
          cast={movie.cast || []}
          directors={movie.directors?.map((d) => ({ ...d, job: "Director" })) || []}
          writers={movie.writers?.map((w) => ({ ...w, job: "Writer" })) || []}
          cinematographers={
            movie.cinematographers?.map((c) => ({ ...c, job: "Director of Photography" })) || []
          }
          composers={movie.composers?.map((c) => ({ ...c, job: "Composer" })) || []}
          editors={movie.editors?.map((e) => ({ ...e, job: "Editor" })) || []}
          productionDesigners={
            movie.productionDesigners?.map((p) => ({ ...p, job: "Production Design" })) || []
          }
          costumeDesigners={
            movie.costumeDesigners?.map((c) => ({ ...c, job: "Costume Design" })) || []
          }
          maxItems={8}
        />
      )}
    </div>
  );
}

function MovieDetailsSkeleton() {
  return (
    <div className="space-y-6 mt-6 pt-6 border-t border-[var(--border)]">
      {/* Overview skeleton */}
      <div>
        <Skeleton className="h-4 w-20 mb-2" />
        <Skeleton className="h-16 w-full" />
      </div>

      {/* Cast skeleton */}
      <div>
        <Skeleton className="h-4 w-16 mb-3" />
        <div className="flex gap-3">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="flex-shrink-0 w-[80px]">
              <Skeleton className="aspect-[2/3] w-full rounded-lg mb-1.5" />
              <Skeleton className="h-3 w-full mb-1" />
              <Skeleton className="h-2 w-2/3" />
            </div>
          ))}
        </div>
      </div>

      {/* Crew skeleton */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <Skeleton className="h-3 w-14 mb-2" />
          <div className="flex items-center gap-2">
            <Skeleton className="w-8 h-8 rounded-full" />
            <Skeleton className="h-4 w-24" />
          </div>
        </div>
        <div>
          <Skeleton className="h-3 w-16 mb-2" />
          <div className="flex items-center gap-2">
            <Skeleton className="w-8 h-8 rounded-full" />
            <Skeleton className="h-4 w-24" />
          </div>
        </div>
      </div>
    </div>
  );
}
