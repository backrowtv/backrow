import { SkeletonRegion, Skeleton } from "@/components/ui/skeleton";
import { UnifiedClubCardSkeleton } from "@/components/clubs/UnifiedClubCard";

export default function DiscoverLoading() {
  return (
    <SkeletonRegion label="Loading discover">
      <div className="bg-[var(--background)]">
        <div className="max-w-6xl mx-auto px-4 lg:px-6 py-6">
          {/* Toolbar */}
          <div className="flex items-center gap-3 mb-4">
            <Skeleton className="h-9 flex-1 rounded-lg" />
            <Skeleton className="h-8 w-20 rounded-md" />
            <Skeleton className="h-8 w-16 rounded-md" />
            <Skeleton className="h-8 w-20 rounded-md" />
          </div>

          {/* Keyword pills */}
          <div className="flex gap-1.5 mb-4">
            {[0, 1, 2, 3, 4].map((i) => (
              <Skeleton key={i} className="h-6 w-16 rounded-full" />
            ))}
          </div>

          {/* Result count */}
          <Skeleton className="h-3 w-16 mb-3" />

          {/* Club cards grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {[0, 1, 2, 3, 4, 5].map((i) => (
              <UnifiedClubCardSkeleton key={i} />
            ))}
          </div>
        </div>
      </div>
    </SkeletonRegion>
  );
}
