import { Skeleton } from "@/components/ui/skeleton";

export default function SeasonDetailLoading() {
  return (
    <>
      {/* ClubNavigation placeholder */}
      <div className="h-10 bg-[var(--surface-1)]" />

      <section className="py-8 md:py-12 w-full">
        <div className="mx-auto px-4 sm:px-6 lg:px-8 max-w-7xl p-6 md:p-8">
          {/* Season header */}
          <div className="mb-6">
            <div className="flex items-center gap-2 mb-4">
              <Skeleton className="w-1 h-8 rounded-full" />
              <div className="flex-1">
                <Skeleton className="h-7 w-40" />
                <Skeleton className="h-3.5 w-28 mt-1" />
              </div>
              <Skeleton className="h-5 w-16 rounded-full" />
            </div>
            <Skeleton className="h-3.5 w-24 ml-3" />
          </div>

          {/* Season Information Card */}
          <div className="mb-6">
            <div className="rounded-xl bg-[var(--surface-1)]">
              <div className="p-4">
                <Skeleton className="h-5 w-36" />
              </div>
              <div className="p-4">
                <div className="flex flex-wrap gap-6">
                  <Skeleton className="h-3.5 w-32" />
                  <Skeleton className="h-3.5 w-28" />
                  <Skeleton className="h-3.5 w-20" />
                </div>
              </div>
            </div>
          </div>

          {/* Festivals heading */}
          <div className="mb-6">
            <div className="flex items-center gap-2 mb-4">
              <Skeleton className="w-1 h-8 rounded-full" />
              <Skeleton className="h-6 w-24" />
            </div>
          </div>

          {/* Festival grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="rounded-xl bg-[var(--surface-1)] p-4">
                <div className="flex items-start gap-3">
                  <Skeleton className="w-16 h-24 rounded-lg flex-shrink-0" />
                  <div className="flex-1">
                    <Skeleton className="h-4 w-32 mb-1" />
                    <Skeleton className="h-3 w-20 mb-2" />
                    <Skeleton className="h-5 w-16 rounded-full" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>
    </>
  );
}
