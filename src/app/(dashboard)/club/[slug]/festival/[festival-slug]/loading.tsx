import { Skeleton } from "@/components/ui/skeleton";

export default function FestivalLoading() {
  return (
    <>
      {/* ClubNavigation placeholder */}
      <div className="h-10 bg-[var(--surface-1)]" />

      <div className="bg-[var(--background)] relative">
        <div className="max-w-3xl mx-auto px-4 py-6 relative z-10">
          {/* Festival Header / Hero */}
          <div className="rounded-xl bg-[var(--surface-1)] p-4 mb-6">
            <div className="flex items-start gap-4">
              <Skeleton className="w-24 h-36 rounded-lg flex-shrink-0" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-3 w-20" />
                <Skeleton className="h-6 w-48" />
                <Skeleton className="h-3 w-32" />
                <Skeleton className="h-3 w-full" />
                <div className="flex gap-2 pt-2">
                  <Skeleton className="h-6 w-20 rounded-full" />
                  <Skeleton className="h-6 w-16 rounded-full" />
                  <Skeleton className="h-6 w-24 rounded-full" />
                </div>
              </div>
            </div>
          </div>

          {/* Phase progress / breadcrumbs */}
          <div className="flex items-center gap-2 mb-6">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="flex items-center gap-2">
                <Skeleton className="h-6 w-6 rounded-full" />
                <Skeleton className="h-3 w-16" />
                {i < 4 && <Skeleton className="h-px w-8" />}
              </div>
            ))}
          </div>

          {/* Content area - nominations / movies */}
          <div className="space-y-4">
            {/* User action card */}
            <div className="rounded-xl bg-[var(--surface-1)] p-4">
              <Skeleton className="h-4 w-36 mb-3" />
              <Skeleton className="h-10 w-full rounded-lg" />
            </div>

            {/* Movie grid */}
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
              {[1, 2, 3, 4, 5, 6].map((i) => (
                <div key={i} className="space-y-2">
                  <Skeleton className="aspect-[2/3] w-full rounded-lg" />
                  <Skeleton className="h-3 w-3/4" />
                  <Skeleton className="h-3 w-1/2" />
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
