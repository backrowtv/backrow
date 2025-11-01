import { Skeleton } from "@/components/ui/skeleton";

/**
 * Root loading state that shows during initial page load.
 * Matches the authenticated home page layout: hero + mobile/desktop views.
 * For unauthenticated users, the marketing page loads quickly anyway.
 */
export default function RootLoading() {
  return (
    <div className="relative">
      {/* Hero section - HomeThemedBackground placeholder */}
      <div className="relative h-[50vh] min-h-[400px] bg-[var(--surface-1)]">
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-[var(--background)]" />
        {/* HomeHero content placeholder */}
        <div className="absolute bottom-8 left-0 right-0 px-4 lg:px-6">
          <div className="max-w-7xl mx-auto">
            <Skeleton className="h-8 w-64 mb-3" />
            <Skeleton className="h-4 w-96 max-w-full" />
          </div>
        </div>
      </div>

      {/* Mobile View - shows below xl (1280px) */}
      <div className="xl:hidden px-4 py-6 space-y-6">
        {/* Featured section */}
        <div>
          <Skeleton className="h-5 w-32 mb-3" />
          <div className="p-4 rounded-xl bg-[var(--surface-1)]">
            <div className="flex gap-4">
              <Skeleton className="w-24 h-36 rounded-lg flex-shrink-0" />
              <div className="flex-1">
                <Skeleton className="h-5 w-40 mb-2" />
                <Skeleton className="h-3 w-full mb-2" />
                <Skeleton className="h-3 w-3/4" />
              </div>
            </div>
          </div>
        </div>

        {/* Activity section */}
        <div>
          <Skeleton className="h-5 w-28 mb-3" />
          <div className="space-y-2">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="flex items-start gap-3 p-3 rounded-lg bg-[var(--surface-1)]">
                <Skeleton className="w-8 h-8 rounded-full flex-shrink-0" />
                <div className="flex-1">
                  <Skeleton className="h-3 w-full mb-1" />
                  <Skeleton className="h-2.5 w-16" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Desktop View - shows at xl (1280px) and up */}
      <div className="hidden xl:block">
        {/* Section: variant="default" fullWidth className="!pt-4 !pb-8 bg-[var(--background)]" */}
        <section className="py-8 md:py-12 w-full !pt-4 !pb-8 bg-[var(--background)]">
          {/* Container: size="lg" className="!px-4 lg:!px-6" */}
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 !px-4 lg:!px-6">
            {/* Three Column Layout */}
            <div className="grid grid-cols-12 gap-6">
              {/* Left Column - Favorites + Blog (wider) */}
              <div className="col-span-3 space-y-4">
                <Skeleton className="h-5 w-24 mb-3" />
                <div className="space-y-2">
                  {[1, 2, 3, 4, 5].map((i) => (
                    <div key={i} className="flex items-center gap-3 p-2 rounded-lg">
                      <Skeleton className="w-10 h-10 rounded-full flex-shrink-0" />
                      <div className="flex-1">
                        <Skeleton className="h-4 w-24 mb-1" />
                        <Skeleton className="h-3 w-16" />
                      </div>
                    </div>
                  ))}
                </div>
                {/* Blog section */}
                <div className="pt-3">
                  <Skeleton className="h-5 w-20 mb-3" />
                  <div className="space-y-2">
                    {[1, 2].map((i) => (
                      <Skeleton key={i} className="h-16 w-full rounded-lg" />
                    ))}
                  </div>
                </div>
              </div>

              {/* Center Column - Featured Content (main content) */}
              <div className="col-span-6 space-y-4">
                {/* Featured Movies */}
                <div className="p-4 rounded-xl bg-[var(--surface-1)]">
                  <Skeleton className="h-5 w-36 mb-4" />
                  <div className="flex gap-4">
                    <Skeleton className="w-32 h-48 rounded-lg flex-shrink-0" />
                    <div className="flex-1">
                      <Skeleton className="h-6 w-48 mb-2" />
                      <Skeleton className="h-4 w-24 mb-3" />
                      <Skeleton className="h-3 w-full mb-2" />
                      <Skeleton className="h-3 w-full mb-2" />
                      <Skeleton className="h-3 w-3/4" />
                    </div>
                  </div>
                </div>

                {/* Featured Club */}
                <div className="p-4 rounded-xl bg-[var(--surface-1)]">
                  <Skeleton className="h-5 w-32 mb-4" />
                  <div className="flex items-center gap-4">
                    <Skeleton className="w-16 h-16 rounded-xl flex-shrink-0" />
                    <div className="flex-1">
                      <Skeleton className="h-5 w-40 mb-2" />
                      <Skeleton className="h-3 w-full" />
                    </div>
                  </div>
                </div>
              </div>

              {/* Right Column - Widgets */}
              <aside className="col-span-3">
                <div className="space-y-4">
                  {/* Widget 1 */}
                  <div className="p-4 rounded-xl bg-[var(--surface-1)]">
                    <Skeleton className="h-5 w-28 mb-3" />
                    <div className="space-y-2">
                      {[1, 2, 3].map((i) => (
                        <Skeleton key={i} className="h-10 w-full rounded-lg" />
                      ))}
                    </div>
                  </div>

                  {/* Widget 2 */}
                  <div className="p-4 rounded-xl bg-[var(--surface-1)]">
                    <Skeleton className="h-5 w-24 mb-3" />
                    <div className="space-y-2">
                      {[1, 2].map((i) => (
                        <Skeleton key={i} className="h-12 w-full rounded-lg" />
                      ))}
                    </div>
                  </div>
                </div>
              </aside>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
