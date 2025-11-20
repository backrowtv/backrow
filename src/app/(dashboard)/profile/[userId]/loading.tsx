import { Skeleton } from "@/components/ui/skeleton";

export default function UserProfileLoading() {
  return (
    <>
      {/* Section: variant="default" (no fullWidth) -> py-8 md:py-12 mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 */}
      <section className="py-8 md:py-12 mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {/* Container: size="lg" (default) -> max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="space-y-6">
            {/* Admin Notice Card */}
            <div className="rounded-lg border border-yellow-500/50 bg-yellow-500/10">
              <div className="p-4">
                <Skeleton className="h-4 w-80" />
              </div>
            </div>

            {/* Profile Header Card */}
            <div className="rounded-lg border border-[var(--border)] bg-[var(--surface-1)]">
              <div className="p-6">
                <div className="flex items-start gap-6">
                  {/* Avatar xl size */}
                  <Skeleton className="w-16 h-16 rounded-full flex-shrink-0" />
                  <div className="flex-1">
                    {/* Display name - Heading level={1} */}
                    <Skeleton className="h-7 w-48 mb-1" />
                    {/* Username */}
                    <Skeleton className="h-4 w-24 mb-2" />
                    {/* Bio */}
                    <Skeleton className="h-4 w-64 mt-3" />
                    {/* Meta info row */}
                    <div className="flex flex-wrap gap-4 mt-4">
                      <div className="flex items-center gap-1">
                        <Skeleton className="w-4 h-4" />
                        <Skeleton className="h-3.5 w-44" />
                      </div>
                      <div className="flex items-center gap-1">
                        <Skeleton className="w-4 h-4" />
                        <Skeleton className="h-3.5 w-40" />
                      </div>
                      <div className="flex items-center gap-1">
                        <Skeleton className="w-4 h-4" />
                        <Skeleton className="h-3.5 w-32" />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Club Memberships Card */}
            <div className="rounded-lg border border-[var(--border)] bg-[var(--surface-1)]">
              <div className="p-6 pb-0">
                <Skeleton className="h-5 w-44" />
              </div>
              <div className="p-6">
                <div className="space-y-3">
                  {[1, 2, 3].map((i) => (
                    <div
                      key={i}
                      className="flex items-center justify-between p-3 rounded-lg bg-[var(--surface-1)]"
                    >
                      <div className="flex items-center gap-3">
                        <Skeleton className="w-8 h-8 rounded-full" />
                        <div>
                          <Skeleton className="h-4 w-32 mb-1" />
                          <Skeleton className="h-3 w-40" />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Favorites Card */}
            <div className="rounded-lg border border-[var(--border)] bg-[var(--surface-1)]">
              <div className="p-6 pb-0">
                <Skeleton className="h-5 w-36" />
              </div>
              <div className="p-6">
                <div className="grid grid-cols-2 gap-4 text-sm">
                  {[1, 2, 3, 4].map((i) => (
                    <div key={i}>
                      <Skeleton className="h-3 w-24 mb-1" />
                      <Skeleton className="h-4 w-16" />
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
