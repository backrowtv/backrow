import { Skeleton } from "@/components/ui/skeleton";

export default function YearInReviewLoading() {
  return (
    <>
      {/* ClubNavigation placeholder */}
      <div className="h-10 bg-[var(--surface-1)]" />

      <div className="" style={{ background: "var(--background)" }}>
        <section className="py-8 md:py-12">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            {/* Header */}
            <div className="mb-8">
              <Skeleton className="h-9 w-32 mb-4 rounded-md" />
              <div className="flex items-center gap-3 mb-2">
                <Skeleton className="h-8 w-8 rounded" />
                <Skeleton className="h-7 w-72" />
              </div>
              <Skeleton className="h-3.5 w-52" />
            </div>

            <div className="space-y-8">
              {/* Stats row */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {[1, 2, 3, 4].map((i) => (
                  <div
                    key={i}
                    className="rounded-xl border border-[var(--border)] bg-[var(--surface-1)] p-4 text-center"
                  >
                    <Skeleton className="h-8 w-12 mx-auto mb-2" />
                    <Skeleton className="h-3 w-20 mx-auto" />
                  </div>
                ))}
              </div>

              {/* Top Genres */}
              <div className="rounded-xl border border-[var(--border)] bg-[var(--surface-1)] p-4">
                <Skeleton className="h-5 w-28 mb-4" />
                <div className="flex flex-wrap gap-2">
                  {[1, 2, 3, 4, 5].map((i) => (
                    <Skeleton key={i} className="h-7 w-20 rounded-full" />
                  ))}
                </div>
              </div>

              {/* Top Rated Movies */}
              <div className="rounded-xl border border-[var(--border)] bg-[var(--surface-1)] p-4">
                <Skeleton className="h-5 w-36 mb-4" />
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
                  {[1, 2, 3, 4, 5].map((i) => (
                    <div key={i} className="space-y-2">
                      <Skeleton className="aspect-[2/3] w-full rounded-lg" />
                      <Skeleton className="h-3 w-3/4" />
                      <Skeleton className="h-3 w-1/2" />
                    </div>
                  ))}
                </div>
              </div>

              {/* Most Active Members */}
              <div className="rounded-xl border border-[var(--border)] bg-[var(--surface-1)] p-4">
                <Skeleton className="h-5 w-40 mb-4" />
                <div className="space-y-3">
                  {[1, 2, 3, 4, 5].map((i) => (
                    <div key={i} className="flex items-center gap-3">
                      <Skeleton className="w-8 h-8 rounded-full flex-shrink-0" />
                      <div className="flex-1">
                        <Skeleton className="h-3.5 w-28" />
                      </div>
                      <Skeleton className="h-3 w-16" />
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </section>
      </div>
    </>
  );
}
