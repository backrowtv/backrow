import { Skeleton } from "@/components/ui/skeleton";
import { MovieActionsSkeleton } from "./MovieActions";

// The real movie-detail hero lives inline in `src/app/(dashboard)/movies/[id]/page.tsx`.
// When that JSX is extracted into a shared component, move it here next to the skeleton.

/**
 * Placeholder for the movie-detail hero: backdrop background, poster on the left,
 * info column on the right (title, meta row, external links + favorite, MovieActions).
 * Matches the real layout's dimensions so loaded content does not shift.
 */
export function MovieHeroSkeleton({
  externalLinkCount = 2,
  className,
}: {
  /** Number of external-link icons to reserve space for (default 2: IMDb + TMDB). */
  externalLinkCount?: number;
  className?: string;
}) {
  return (
    <div
      className={`relative w-full h-[250px] lg:h-[350px] overflow-hidden ${className ?? ""}`}
      aria-hidden="true"
    >
      {/* Background wash */}
      <div className="absolute inset-0 bg-[var(--surface-1)]" />
      <div className="absolute inset-0 bg-gradient-to-t from-[var(--background)] via-[var(--background)]/30 to-transparent z-10" />
      <div className="absolute inset-0 bg-gradient-to-b from-[var(--background)] to-transparent z-10" />
      {/* Bottom-aligned content */}
      <div className="absolute inset-0 flex items-end z-20 pb-6">
        <div className="max-w-3xl mx-auto w-full px-4 lg:px-6">
          <div className="flex gap-4 lg:gap-6 items-end">
            {/* Poster */}
            <Skeleton className="w-[120px] lg:w-[160px] aspect-[2/3] rounded-lg flex-shrink-0" />
            {/* Info column */}
            <div className="flex-1 min-w-0 flex flex-col justify-between gap-1">
              {/* Title — two-line placeholder */}
              <div className="space-y-1">
                <Skeleton className="h-5 lg:h-6 w-3/4" />
                <Skeleton className="h-5 lg:h-6 w-1/2" />
              </div>
              {/* Meta row: year + cert badge + runtime */}
              <div className="flex flex-wrap items-center gap-2">
                <Skeleton className="h-4 w-10" />
                <Skeleton className="h-4 w-10 rounded-full" />
                <Skeleton className="h-4 w-14" />
              </div>
              {/* External links + favorite */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 flex-wrap">
                  {Array.from({ length: externalLinkCount }).map((_, i) => (
                    <Skeleton key={i} className="h-5 w-5 rounded" />
                  ))}
                </div>
                <Skeleton className="h-7 w-7 rounded-lg ml-auto" />
              </div>
              {/* MovieActions grid */}
              <MovieActionsSkeleton />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
