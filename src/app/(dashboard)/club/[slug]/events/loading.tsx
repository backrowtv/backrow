import { Skeleton } from "@/components/ui/skeleton";

export default function EventsLoading() {
  return (
    <>
      {/* ClubNavigation placeholder */}
      <div className="h-10 bg-[var(--surface-1)]" />

      <div className="bg-[var(--background)]">
        <div className="max-w-3xl mx-auto px-4 lg:px-6 py-6">
          {/* Header - Desktop only */}
          <div className="hidden md:flex items-center justify-between mb-6">
            <div>
              <Skeleton className="h-5 w-16 mb-1.5" />
              <Skeleton className="h-3 w-32" />
            </div>
            <Skeleton className="h-9 w-28 rounded-md" />
          </div>

          {/* Upcoming Events Section */}
          <section className="mb-8">
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <div
                  key={i}
                  className="p-4 rounded-xl border border-[var(--border)] bg-[var(--surface-1)]"
                >
                  <div className="flex items-start gap-4">
                    <Skeleton className="w-12 h-12 rounded-lg flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <Skeleton className="h-4 w-48 mb-1.5" />
                      <Skeleton className="h-3 w-32 mb-2" />
                      <div className="flex items-center gap-3">
                        <Skeleton className="h-3 w-20" />
                        <Skeleton className="h-3 w-16" />
                      </div>
                    </div>
                    <Skeleton className="h-8 w-20 rounded-md flex-shrink-0" />
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* Past Events Section */}
          <section>
            <Skeleton className="h-4 w-24 mb-3" />
            <div className="space-y-2">
              {[1, 2].map((i) => (
                <div
                  key={i}
                  className="p-3 rounded-lg border border-[var(--border)] bg-[var(--surface-1)]"
                >
                  <div className="flex items-center gap-3">
                    <Skeleton className="w-10 h-10 rounded-lg flex-shrink-0" />
                    <div className="flex-1">
                      <Skeleton className="h-3.5 w-40 mb-1" />
                      <Skeleton className="h-3 w-24" />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </section>
        </div>
      </div>
    </>
  );
}
