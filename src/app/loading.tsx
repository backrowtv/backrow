import { SkeletonRegion, Skeleton, SkeletonAvatar, SkeletonPoster } from "@/components/ui/skeleton";
import { FeaturedMovieSkeleton, FeaturedClubSkeleton } from "@/components/home/FeaturedSections";

/**
 * Root loading state. Matches the authenticated home layout (hero + either
 * mobile or desktop view). For unauthenticated users the marketing page loads
 * fast enough that this rarely shows.
 */
export default function RootLoading() {
  return (
    <SkeletonRegion label="Loading home">
      <div className="relative">
        {/* Hero band — HomeThemedBackground + HomeHero placeholder */}
        <div className="relative h-[50vh] min-h-[400px] bg-[var(--surface-1)]">
          <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-[var(--background)]" />
          <div className="absolute bottom-8 left-0 right-0 px-4 lg:px-6">
            <div className="max-w-7xl mx-auto">
              <Skeleton className="h-8 w-64 mb-3" />
              <Skeleton className="h-4 w-96 max-w-full" />
            </div>
          </div>
        </div>

        {/* Mobile layout (below xl) */}
        <div className="xl:hidden px-4 py-6 space-y-6">
          <section className="space-y-1.5">
            <Skeleton className="h-4 w-40 mx-auto" />
            <div className="flex gap-4">
              <div className="p-4 rounded-xl border border-[var(--border)] bg-[var(--card)] flex gap-4 flex-1">
                <SkeletonPoster size="sm" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-5 w-40" />
                  <Skeleton className="h-3 w-full" />
                  <Skeleton className="h-3 w-3/4" />
                </div>
              </div>
            </div>
          </section>

          {/* Activity list */}
          <section className="space-y-2">
            <Skeleton className="h-5 w-28" />
            {[0, 1, 2, 3].map((i) => (
              <div key={i} className="flex items-start gap-3 p-3 rounded-lg bg-[var(--surface-1)]">
                <SkeletonAvatar size="sm" />
                <div className="flex-1 space-y-1">
                  <Skeleton className="h-3 w-full" />
                  <Skeleton className="h-2.5 w-16" />
                </div>
              </div>
            ))}
          </section>
        </div>

        {/* Desktop layout (xl+) */}
        <div className="hidden xl:block">
          <section className="py-8 md:py-12 w-full !pt-4 !pb-8 bg-[var(--background)]">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 !px-4 lg:!px-6">
              <div className="grid grid-cols-12 gap-6">
                {/* Left column — favorites + blog */}
                <div className="col-span-3 space-y-4">
                  <Skeleton className="h-4 w-24" />
                  <div className="space-y-2">
                    {[0, 1, 2, 3, 4].map((i) => (
                      <div key={i} className="flex items-center gap-3 p-2 rounded-lg">
                        <SkeletonAvatar size="md" />
                        <div className="flex-1 space-y-1">
                          <Skeleton className="h-4 w-24" />
                          <Skeleton className="h-3 w-16" />
                        </div>
                      </div>
                    ))}
                  </div>
                  <div className="pt-3 space-y-2">
                    <Skeleton className="h-4 w-20" />
                    {[0, 1].map((i) => (
                      <Skeleton key={i} className="h-16 w-full rounded-lg" />
                    ))}
                  </div>
                </div>

                {/* Center column — featured movie(s) + featured club */}
                <div className="col-span-6 space-y-4">
                  <FeaturedMovieSkeleton />
                  <FeaturedClubSkeleton />
                </div>

                {/* Right column — widgets */}
                <aside className="col-span-3 space-y-4">
                  <div className="p-4 rounded-xl bg-[var(--surface-1)] space-y-3">
                    <Skeleton className="h-4 w-28" />
                    {[0, 1, 2].map((i) => (
                      <Skeleton key={i} className="h-10 w-full rounded-lg" />
                    ))}
                  </div>
                  <div className="p-4 rounded-xl bg-[var(--surface-1)] space-y-3">
                    <Skeleton className="h-4 w-24" />
                    {[0, 1].map((i) => (
                      <Skeleton key={i} className="h-12 w-full rounded-lg" />
                    ))}
                  </div>
                </aside>
              </div>
            </div>
          </section>
        </div>
      </div>
    </SkeletonRegion>
  );
}
