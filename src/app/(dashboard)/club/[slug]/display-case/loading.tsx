import { Skeleton } from "@/components/ui/skeleton";

export default function DisplayCaseLoading() {
  return (
    <>
      {/* ClubNavigation placeholder */}
      <div className="h-10 bg-[var(--surface-1)]" />

      <div className="bg-[var(--background)]">
        <div className="max-w-3xl mx-auto px-4 lg:px-6 py-6">
          {/* Header - Desktop only */}
          <div className="hidden md:block mb-6">
            <Skeleton className="h-5 w-28 mb-1.5" />
            <Skeleton className="h-3 w-64" />
          </div>

          <div className="space-y-6">
            {/* Festival Winners Section */}
            <div className="rounded-xl border border-[var(--border)] bg-[var(--surface-1)]">
              <div className="p-4 border-b border-[var(--border)]">
                <div className="flex items-center gap-2">
                  <Skeleton className="h-5 w-5 rounded" />
                  <Skeleton className="h-5 w-36" />
                </div>
              </div>
              <div className="p-4">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="rounded-lg border border-[var(--border)] p-4">
                      <div className="flex gap-4">
                        <Skeleton className="w-16 h-24 rounded flex-shrink-0" />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-2 mb-2">
                            <div className="flex-1">
                              <Skeleton className="h-3.5 w-24 mb-1" />
                              <Skeleton className="h-3 w-16" />
                            </div>
                            <Skeleton className="h-5 w-14 rounded-full" />
                          </div>
                          <div className="flex items-center gap-2 mb-2">
                            <Skeleton className="w-6 h-6 rounded-full" />
                            <Skeleton className="h-3.5 w-20" />
                          </div>
                          <Skeleton className="h-3 w-28 mb-2" />
                          <Skeleton className="h-4 w-16" />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Challenges Section */}
            <div className="rounded-xl border border-[var(--border)] bg-[var(--surface-1)]">
              <div className="p-4 border-b border-[var(--border)]">
                <Skeleton className="h-5 w-24" />
              </div>
              <div className="p-4 space-y-3">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="flex items-center gap-3">
                    <Skeleton className="w-10 h-10 rounded-full flex-shrink-0" />
                    <div className="flex-1">
                      <Skeleton className="h-3.5 w-32 mb-1" />
                      <Skeleton className="h-2.5 w-full rounded-full" />
                    </div>
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
