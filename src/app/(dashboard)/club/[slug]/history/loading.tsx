import { Skeleton } from "@/components/ui/skeleton";

export default function HistoryLoading() {
  return (
    <>
      {/* ClubNavigation placeholder */}
      <div className="h-10 bg-[var(--surface-1)]" />

      <div className="bg-[var(--background)]">
        <div className="max-w-3xl mx-auto px-4 lg:px-6 py-6">
          {/* Header - Desktop only */}
          <div className="hidden md:block mb-6">
            <Skeleton className="h-6 w-20 mb-1.5" />
            <Skeleton className="h-3.5 w-52" />
          </div>

          {/* Tabs */}
          <div className="flex gap-1 mb-6">
            {["Seasons", "Festivals", "Movies"].map((tab) => (
              <Skeleton key={tab} className="h-9 w-20 rounded-t-md" />
            ))}
          </div>

          {/* Content list */}
          <div className="space-y-3">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="p-4 rounded-xl bg-[var(--surface-1)]">
                <div className="flex items-center gap-3">
                  <Skeleton className="w-10 h-10 rounded-lg flex-shrink-0" />
                  <div className="flex-1">
                    <Skeleton className="h-4 w-40 mb-1" />
                    <Skeleton className="h-3 w-28" />
                  </div>
                  <Skeleton className="h-5 w-16 rounded-full" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </>
  );
}
