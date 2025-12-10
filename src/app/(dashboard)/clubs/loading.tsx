import { Skeleton } from "@/components/ui/skeleton";

export default function ClubsLoading() {
  return (
    <div className="bg-[var(--background)]">
      <div className="max-w-4xl mx-auto px-4 lg:px-6 py-6">
        {/* Header Row: Filter Toggle (left) + View Toggle & Create (right) */}
        <div className="flex items-center justify-between gap-2 mb-4">
          {/* Mobile: Filter button */}
          <div className="md:hidden">
            <Skeleton className="h-8 w-24 rounded-lg" />
          </div>

          {/* Desktop: Filter pills */}
          <div className="hidden md:flex gap-1">
            {[1, 2, 3, 4, 5].map((i) => (
              <Skeleton key={i} className="h-8 w-16 rounded-full" />
            ))}
          </div>

          {/* Right side: View Toggle + Create Button */}
          <div className="flex items-center gap-2">
            <div className="flex items-center rounded-lg border border-[var(--border)] p-0.5">
              <Skeleton className="h-7 w-7 rounded-md" />
              <Skeleton className="h-7 w-7 rounded-md" />
            </div>
            <Skeleton className="h-8 w-20 rounded-md" />
          </div>
        </div>

        {/* Club list items (list view default) - matches ClubListItem layout */}
        <div className="divide-y divide-[var(--border)]">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="py-5 px-4 md:py-6 md:px-5">
              <div className="flex items-start gap-4">
                {/* Avatar - xl on desktop, lg on mobile */}
                <div className="flex-shrink-0">
                  <Skeleton className="hidden md:block w-14 h-14 rounded-full" />
                  <Skeleton className="block md:hidden w-11 h-11 rounded-full" />
                </div>
                {/* Info */}
                <div className="flex-1 min-w-0">
                  <Skeleton className="h-6 md:h-7 w-40 mb-1" />
                  <div className="flex items-center gap-1.5 mt-1">
                    <Skeleton className="h-3 w-24" />
                    <Skeleton className="h-4 w-16 rounded-full" />
                    <Skeleton className="h-3 w-12" />
                  </div>
                  <Skeleton className="h-4 w-full max-w-xs mt-1.5" />
                </div>
                {/* Favorite button */}
                <Skeleton className="w-5 h-5 flex-shrink-0" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
