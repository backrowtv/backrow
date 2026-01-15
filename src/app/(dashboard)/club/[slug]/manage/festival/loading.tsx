import { Skeleton } from "@/components/ui/skeleton";

export default function ManageFestivalLoading() {
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
            <Skeleton className="h-3 w-56" />
          </div>

          {/* Active Festival Section */}
          <section className="mb-6 space-y-4">
            {/* Festival Header Card */}
            <div className="p-4 rounded-xl border border-[var(--border)] bg-[var(--surface-1)]">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <Skeleton className="h-5 w-24 rounded-full" />
                  </div>
                  <Skeleton className="h-6 w-48 mb-1" />
                  <Skeleton className="h-3.5 w-36" />
                </div>
                <Skeleton className="w-5 h-5 flex-shrink-0" />
              </div>
              <div className="flex items-center gap-4 mt-3 pt-3 border-t border-[var(--border)]">
                <Skeleton className="h-3.5 w-20" />
                <Skeleton className="h-3.5 w-28" />
              </div>
            </div>

            {/* Phase Controls */}
            <div className="rounded-xl border border-[var(--border)] bg-[var(--surface-1)] p-4">
              <div className="flex items-center gap-3">
                {[1, 2, 3, 4].map((i) => (
                  <div key={i} className="flex items-center gap-2">
                    <Skeleton className="h-8 w-8 rounded-full" />
                    {i < 4 && <Skeleton className="h-0.5 w-8" />}
                  </div>
                ))}
              </div>
              <Skeleton className="h-9 w-36 rounded-md mt-4" />
            </div>
          </section>

          {/* Festival Rules Settings */}
          <section className="border-t border-[var(--border)] pt-6">
            <Skeleton className="h-5 w-28 mb-4" />
            <div className="space-y-4">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="flex items-center justify-between py-3">
                  <div>
                    <Skeleton className="h-4 w-32 mb-1" />
                    <Skeleton className="h-3 w-48" />
                  </div>
                  <Skeleton className="h-6 w-11 rounded-full" />
                </div>
              ))}
            </div>
          </section>
        </div>
      </div>
    </>
  );
}
