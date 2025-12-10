import { Skeleton } from "@/components/ui/skeleton";

export default function MembersLoading() {
  return (
    <>
      {/* ClubNavigation placeholder */}
      <div className="h-10 bg-[var(--surface-1)]" />

      <div className="">
        <div className="max-w-3xl mx-auto px-4 lg:px-6 py-6">
          {/* Header - Desktop only */}
          <div className="hidden md:flex items-center justify-between mb-6">
            <div>
              <Skeleton className="h-5 w-20 mb-1.5" />
              <Skeleton className="h-3 w-24" />
            </div>
            <div className="flex items-center gap-2">
              <Skeleton className="h-9 w-32 rounded-md" />
            </div>
          </div>

          {/* Filters Bar */}
          <div className="flex flex-wrap items-center gap-3 mb-6">
            {/* Search */}
            <div className="relative flex-1 min-w-[200px] max-w-sm">
              <Skeleton className="h-9 w-full rounded-md" />
            </div>
            {/* Role Filter Pills */}
            <div className="flex gap-1.5">
              {["All", "Prod", "Dir", "Crit"].map((label) => (
                <Skeleton key={label} className="h-8 w-16 rounded-full" />
              ))}
            </div>
            {/* Sort */}
            <Skeleton className="h-8 w-24 rounded-md" />
          </div>

          {/* Member List */}
          <div className="space-y-1">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div key={i} className="flex items-center gap-3 py-3 px-3">
                <Skeleton className="w-10 h-10 rounded-full flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <Skeleton className="h-4 w-32 mb-1" />
                  <Skeleton className="h-3 w-20" />
                </div>
                <Skeleton className="h-5 w-14 rounded-full" />
              </div>
            ))}
          </div>
        </div>
      </div>
    </>
  );
}
