import { Skeleton } from "@/components/ui/skeleton";

export default function HomepageMoviesLoading() {
  return (
    <>
      {/* ClubNavigation placeholder */}
      <div className="h-10 bg-[var(--surface-1)]" />

      <div className="bg-[var(--background)]">
        <div className="max-w-3xl mx-auto px-4 lg:px-6 py-6">
          {/* Mobile Back Button */}
          <div className="lg:hidden mb-4">
            <Skeleton className="h-8 w-24 rounded-md" />
          </div>

          {/* Header - Hidden on mobile */}
          <div className="hidden lg:block mb-6">
            <Skeleton className="h-5 w-36 mb-1.5" />
            <Skeleton className="h-3 w-56" />
          </div>

          {/* Content */}
          <div className="space-y-6">
            {/* Featured Movies Section */}
            <div className="rounded-xl bg-[var(--surface-1)] p-4">
              <Skeleton className="h-5 w-32 mb-4" />
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {[1, 2, 3, 4, 5, 6].map((i) => (
                  <div key={i} className="space-y-2">
                    <Skeleton className="aspect-[2/3] w-full rounded-lg" />
                    <Skeleton className="h-3 w-3/4" />
                  </div>
                ))}
              </div>
            </div>

            {/* Throwback Movies Section */}
            <div className="rounded-xl bg-[var(--surface-1)] p-4">
              <Skeleton className="h-5 w-36 mb-4" />
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="space-y-2">
                    <Skeleton className="aspect-[2/3] w-full rounded-lg" />
                    <Skeleton className="h-3 w-3/4" />
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
