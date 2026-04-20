import { SkeletonRegion, Skeleton, SkeletonText } from "@/components/ui/skeleton";
import { MovieHeroSkeleton } from "@/components/movies/MovieHero";
import { CastCarouselSkeleton } from "@/components/movies/CastCarousel";
import { WatchProvidersSkeleton } from "@/components/movies/WatchProviders";

export default function MovieDetailLoading() {
  return (
    <SkeletonRegion label="Loading movie">
      <div className="bg-[var(--background)]">
        <MovieHeroSkeleton />

        <div className="max-w-3xl mx-auto px-4 lg:px-6 py-6">
          <div className="space-y-6">
            {/* Private Notes */}
            <section>
              <Skeleton className="h-4 w-28 mb-2" />
              <Skeleton className="h-20 w-full rounded-lg" />
            </section>

            {/* Club Discussions — empty by default (most movies have 0 discussions) */}

            {/* Overview */}
            <section>
              <Skeleton className="h-4 w-24 mb-3" />
              <div className="flex gap-1.5 mb-3">
                <Skeleton className="h-5 w-16 rounded-full" />
                <Skeleton className="h-5 w-20 rounded-full" />
                <Skeleton className="h-5 w-14 rounded-full" />
              </div>
              <SkeletonText lines={3} lineHeight="h-4" />
            </section>

            {/* Cast + Crew */}
            <CastCarouselSkeleton count={6} />
            <CastCarouselSkeleton count={4} />

            {/* Details — most movies show 3 rows */}
            <section className="space-y-3">
              <Skeleton className="h-4 w-20" />
              {[0, 1, 2].map((i) => (
                <div key={i}>
                  <div className="flex justify-between">
                    <Skeleton className="h-3 w-16" />
                    <Skeleton className="h-3 w-24" />
                  </div>
                  {i < 2 && <div className="h-px bg-[var(--border)] mt-3" />}
                </div>
              ))}
            </section>

            {/* Watch Providers — render nothing by default */}
            <WatchProvidersSkeleton />
          </div>
        </div>
      </div>
    </SkeletonRegion>
  );
}
