import { Skeleton } from "@/components/ui/skeleton";

export default function ManageSeasonLoading() {
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
            <Skeleton className="h-5 w-40 mb-1.5" />
            <Skeleton className="h-3 w-52" />
          </div>

          {/* Active Season Card */}
          <section className="mb-6">
            <div className="p-4 rounded-xl border border-[var(--border)] bg-[var(--surface-1)]">
              <div className="flex items-start justify-between gap-3 mb-3">
                <div>
                  <Skeleton className="h-5 w-28 mb-1" />
                  <Skeleton className="h-3 w-20" />
                </div>
                <Skeleton className="h-5 w-14 rounded-full" />
              </div>
              <div className="flex items-center gap-4">
                <Skeleton className="h-3 w-24" />
                <Skeleton className="h-3 w-20" />
              </div>
              <Skeleton className="h-9 w-full rounded-md mt-4" />
            </div>
          </section>

          {/* Past Seasons */}
          <section className="border-t border-[var(--border)] pt-6">
            <Skeleton className="h-4 w-28 mb-4" />
            <div className="space-y-2">
              {[1, 2, 3].map((i) => (
                <div
                  key={i}
                  className="p-3 rounded-lg border border-[var(--border)] bg-[var(--surface-1)]"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <Skeleton className="h-3.5 w-24 mb-1" />
                      <Skeleton className="h-3 w-32" />
                    </div>
                    <Skeleton className="h-3 w-16" />
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
