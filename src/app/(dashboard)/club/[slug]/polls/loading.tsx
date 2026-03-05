import { Skeleton } from "@/components/ui/skeleton";

export default function PollsLoading() {
  return (
    <>
      {/* ClubNavigation placeholder */}
      <div className="h-10 bg-[var(--surface-1)]" />

      <div className="bg-[var(--background)]">
        <div className="max-w-3xl mx-auto px-4 lg:px-6 py-6">
          {/* Header - Desktop only */}
          <div className="hidden md:flex items-center justify-between mb-6">
            <div>
              <Skeleton className="h-5 w-14 mb-1.5" />
              <Skeleton className="h-3 w-28" />
            </div>
            <Skeleton className="h-9 w-28 rounded-md" />
          </div>

          {/* Active Polls Section */}
          <section className="mb-8">
            <div className="space-y-3">
              {[1, 2].map((i) => (
                <div
                  key={i}
                  className="p-4 rounded-xl border border-[var(--border)] bg-[var(--surface-1)]"
                >
                  <div className="flex items-start gap-3 mb-3">
                    <Skeleton className="w-8 h-8 rounded-full flex-shrink-0" />
                    <div className="flex-1">
                      <Skeleton className="h-4 w-56 mb-1" />
                      <Skeleton className="h-3 w-24" />
                    </div>
                  </div>
                  <div className="space-y-2">
                    {[1, 2, 3].map((j) => (
                      <Skeleton key={j} className="h-10 w-full rounded-lg" />
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* Past Polls Section */}
          <section>
            <Skeleton className="h-4 w-20 mb-3" />
            <div className="space-y-2">
              {[1, 2].map((i) => (
                <div
                  key={i}
                  className="p-3 rounded-lg border border-[var(--border)] bg-[var(--surface-1)]"
                >
                  <Skeleton className="h-3.5 w-48 mb-1" />
                  <Skeleton className="h-3 w-24" />
                </div>
              ))}
            </div>
          </section>
        </div>
      </div>
    </>
  );
}
