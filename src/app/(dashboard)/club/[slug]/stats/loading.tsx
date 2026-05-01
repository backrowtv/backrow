import { Skeleton } from "@/components/ui/skeleton";

export default function StatsLoading() {
  return (
    <>
      {/* ClubNavigation placeholder */}
      <div className="h-10 bg-[var(--surface-1)]" />

      <div className="">
        <div className="max-w-4xl mx-auto px-4 lg:px-6 py-6">
          {/* Header - Desktop only */}
          <div className="hidden md:block mb-6">
            <Skeleton className="h-5 w-32 mb-1.5" />
            <Skeleton className="h-3 w-52" />
          </div>

          <div className="space-y-6">
            {/* Season Leaderboard */}
            <div className="rounded-xl bg-[var(--surface-1)] overflow-hidden">
              <div className="p-4 pb-3">
                <div className="flex items-center justify-between gap-4">
                  <Skeleton className="h-5 w-40" />
                  <Skeleton className="h-8 w-36 rounded-lg" />
                </div>
              </div>
              <div className="px-4 pb-4">
                <div className="space-y-2">
                  {[1, 2, 3, 4, 5].map((i) => (
                    <div key={i} className="flex items-center gap-3 py-2">
                      <Skeleton className="w-6 h-6 rounded-full flex-shrink-0" />
                      <Skeleton className="w-8 h-8 rounded-full flex-shrink-0" />
                      <div className="flex-1">
                        <Skeleton className="h-3.5 w-28" />
                      </div>
                      <Skeleton className="h-4 w-12" />
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Lifetime Leaderboard */}
            <div className="rounded-xl bg-[var(--surface-1)] overflow-hidden">
              <div className="p-4 pb-3">
                <Skeleton className="h-5 w-40" />
              </div>
              <div className="px-4 pb-4">
                <div className="space-y-2">
                  {[1, 2, 3, 4, 5].map((i) => (
                    <div key={i} className="flex items-center gap-3 py-2">
                      <Skeleton className="w-6 h-6 rounded-full flex-shrink-0" />
                      <Skeleton className="w-8 h-8 rounded-full flex-shrink-0" />
                      <div className="flex-1">
                        <Skeleton className="h-3.5 w-28" />
                      </div>
                      <Skeleton className="h-4 w-12" />
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
