import { Skeleton } from "@/components/ui/skeleton";

export default function YearInReviewLoading() {
  return (
    <div className="" style={{ background: "var(--background)" }}>
      {/* Section: variant="default" (no fullWidth) -> py-8 md:py-12 mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 */}
      <section className="py-8 md:py-12 mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {/* Container: size="lg" (default) -> max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Header */}
          <div className="mb-8">
            {/* Back to Profile button */}
            <Skeleton className="h-9 w-36 rounded-md mb-4" />

            <div className="flex items-center gap-3 mb-2">
              <Skeleton className="h-8 w-8 rounded" />
              <Skeleton className="h-7 w-56" />
            </div>
            <Skeleton className="h-4 w-52" />
          </div>

          {/* Stats and highlights */}
          <div className="space-y-8">
            {/* Stats grid */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="p-4 rounded-lg bg-[var(--surface-1)] text-center">
                  <Skeleton className="h-8 w-12 mx-auto mb-2" />
                  <Skeleton className="h-3 w-20 mx-auto" />
                </div>
              ))}
            </div>

            {/* Top rated movies */}
            <div>
              <Skeleton className="h-5 w-36 mb-4" />
              <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-3">
                {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((i) => (
                  <Skeleton key={i} className="aspect-[2/3] w-full rounded-lg" />
                ))}
              </div>
            </div>

            {/* Top genres / directors */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {[1, 2].map((i) => (
                <div key={i} className="p-4 rounded-lg bg-[var(--surface-1)]">
                  <Skeleton className="h-5 w-28 mb-4" />
                  <div className="space-y-3">
                    {[1, 2, 3, 4, 5].map((j) => (
                      <div key={j} className="flex items-center justify-between">
                        <Skeleton className="h-4 w-28" />
                        <Skeleton className="h-4 w-8" />
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
