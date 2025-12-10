import { Skeleton } from "@/components/ui/skeleton";

export default function ClubLoading() {
  return (
    <>
      {/* ClubNavigation placeholder */}
      <div className="h-10 bg-[var(--surface-1)]" />

      <div className="relative">
        {/* Main Content - 3 Column Layout */}
        <div className="relative z-10 max-w-7xl mx-auto px-4 lg:px-6 py-4 lg:py-6">
          {/* Member Content - 3 Column Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 lg:gap-6">
            {/* Left Sidebar - Desktop Only */}
            <aside className="hidden lg:block lg:col-span-3 space-y-4">
              {/* Club ID Card */}
              <div className="rounded-xl bg-[var(--surface-1)] p-4 space-y-3">
                <div className="flex items-center gap-3">
                  <Skeleton className="w-12 h-12 rounded-lg flex-shrink-0" />
                  <div className="flex-1">
                    <Skeleton className="h-4 w-28 mb-1" />
                    <Skeleton className="h-3 w-20" />
                  </div>
                </div>
                <Skeleton className="h-3 w-full" />
                <Skeleton className="h-3 w-3/4" />
                <div className="flex gap-4 pt-2">
                  <Skeleton className="h-8 w-16" />
                  <Skeleton className="h-8 w-16" />
                  <Skeleton className="h-8 w-16" />
                </div>
              </div>

              {/* Theme Pool - Collapsible */}
              <div className="rounded-xl bg-[var(--surface-1)] p-3">
                <Skeleton className="h-4 w-24 mb-2" />
                <Skeleton className="h-3 w-full" />
              </div>

              {/* Movie Pool - Collapsible */}
              <div className="rounded-xl bg-[var(--surface-1)] p-3">
                <Skeleton className="h-4 w-24 mb-2" />
                <Skeleton className="h-3 w-full" />
              </div>
            </aside>

            {/* Main Column */}
            <div className="lg:col-span-6 space-y-4 lg:space-y-6">
              {/* Mobile Club Header - Compact ID Card */}
              <div className="lg:hidden">
                <div className="rounded-xl bg-[var(--surface-1)] p-3">
                  <div className="flex items-center gap-3">
                    <Skeleton className="w-10 h-10 rounded-lg flex-shrink-0" />
                    <div className="flex-1">
                      <Skeleton className="h-4 w-32 mb-1" />
                      <Skeleton className="h-3 w-20" />
                    </div>
                    <Skeleton className="h-8 w-8 rounded-full" />
                  </div>
                </div>
              </div>

              {/* Festival Hero Card */}
              <div className="rounded-xl bg-[var(--surface-1)] p-4">
                <div className="flex items-start gap-4">
                  <Skeleton className="w-20 h-28 lg:w-24 lg:h-36 rounded-lg flex-shrink-0" />
                  <div className="flex-1 space-y-2">
                    <Skeleton className="h-5 w-48" />
                    <Skeleton className="h-4 w-32" />
                    <Skeleton className="h-3 w-full" />
                    <Skeleton className="h-3 w-3/4" />
                    <div className="flex gap-2 pt-2">
                      <Skeleton className="h-6 w-20 rounded-full" />
                      <Skeleton className="h-6 w-16 rounded-full" />
                    </div>
                  </div>
                </div>
              </div>

              {/* Desktop: Discussions */}
              <div className="hidden lg:block rounded-xl bg-[var(--surface-1)] p-3">
                <Skeleton className="h-4 w-32 mb-3" />
                <div className="space-y-2">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="flex items-center gap-2 py-1">
                      <Skeleton className="w-6 h-6 rounded-full flex-shrink-0" />
                      <Skeleton className="h-3 w-full" />
                    </div>
                  ))}
                </div>
              </div>

              {/* Mobile: Discussions */}
              <div className="lg:hidden rounded-xl bg-[var(--surface-1)] p-3">
                <Skeleton className="h-4 w-32 mb-3" />
                <div className="space-y-2">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="flex items-center gap-2 py-1">
                      <Skeleton className="w-6 h-6 rounded-full flex-shrink-0" />
                      <Skeleton className="h-3 w-full" />
                    </div>
                  ))}
                </div>
              </div>

              {/* Mobile: Upcoming Dates */}
              <div className="lg:hidden rounded-xl bg-[var(--surface-1)] p-3">
                <Skeleton className="h-4 w-32" />
              </div>

              {/* Mobile: Theme Pool */}
              <div className="lg:hidden rounded-xl bg-[var(--surface-1)] p-3">
                <Skeleton className="h-4 w-24" />
              </div>

              {/* Mobile: Movie Pool */}
              <div className="lg:hidden rounded-xl bg-[var(--surface-1)] p-3">
                <Skeleton className="h-4 w-24" />
              </div>

              {/* Mobile: Recent Activity */}
              <div className="lg:hidden rounded-xl bg-[var(--surface-1)] p-3">
                <Skeleton className="h-4 w-28" />
              </div>

              {/* Mobile: Club Resources */}
              <div className="lg:hidden rounded-xl bg-[var(--surface-1)] p-3">
                <Skeleton className="h-4 w-28" />
              </div>

              {/* Quick Links */}
              <section className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-4 border-t border-[var(--border)]">
                <div className="flex items-center gap-3 p-3 rounded-lg border border-[var(--border)]">
                  <Skeleton className="w-9 h-9 rounded-lg flex-shrink-0" />
                  <div className="flex-1">
                    <Skeleton className="h-4 w-16 mb-1" />
                    <Skeleton className="h-3 w-40" />
                  </div>
                </div>
                <div className="flex items-center gap-3 p-3 rounded-lg border border-[var(--border)]">
                  <Skeleton className="w-9 h-9 rounded-lg flex-shrink-0" />
                  <div className="flex-1">
                    <Skeleton className="h-4 w-16 mb-1" />
                    <Skeleton className="h-3 w-40" />
                  </div>
                </div>
              </section>
            </div>

            {/* Right Sidebar - Desktop Only */}
            <aside className="hidden lg:block lg:col-span-3 space-y-4">
              {/* Upcoming Dates */}
              <div className="rounded-xl bg-[var(--surface-1)] p-3">
                <Skeleton className="h-4 w-32 mb-3" />
                <div className="space-y-2">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="flex items-center gap-2 py-1">
                      <Skeleton className="w-8 h-8 rounded flex-shrink-0" />
                      <div className="flex-1">
                        <Skeleton className="h-3 w-full mb-1" />
                        <Skeleton className="h-2.5 w-16" />
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Activity Feed */}
              <div className="rounded-xl bg-[var(--surface-1)] p-3">
                <Skeleton className="h-4 w-28 mb-3" />
                <div className="space-y-2">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="flex items-start gap-2 py-1">
                      <Skeleton className="w-6 h-6 rounded-full flex-shrink-0" />
                      <div className="flex-1">
                        <Skeleton className="h-3 w-full mb-1" />
                        <Skeleton className="h-2.5 w-16" />
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Club Resources */}
              <div className="rounded-xl bg-[var(--surface-1)] p-3">
                <Skeleton className="h-4 w-28" />
              </div>
            </aside>
          </div>
        </div>
      </div>
    </>
  );
}
