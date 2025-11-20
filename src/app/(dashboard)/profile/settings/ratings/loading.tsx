import { Skeleton } from "@/components/ui/skeleton";

export default function RatingSettingsLoading() {
  return (
    <div className="bg-[var(--background)]">
      <div className="max-w-3xl mx-auto px-4 lg:px-6 py-6">
        {/* Mobile Back Button placeholder */}
        <div className="md:hidden mb-4">
          <Skeleton className="h-4 w-16" />
        </div>

        {/* Header - Hidden on mobile since TopNav shows "Profile" */}
        <div className="hidden md:block mb-6">
          <Skeleton className="h-6 w-32" />
        </div>

        {/* PersonalRubricsForm skeleton */}
        <div className="space-y-6">
          {/* Rating preferences section */}
          <div className="p-4 rounded-lg border border-[var(--border)]">
            <Skeleton className="h-5 w-36 mb-4" />
            <div className="space-y-3">
              {[1, 2].map((i) => (
                <div key={i} className="flex items-center justify-between py-2">
                  <Skeleton className="h-4 w-32" />
                  <Skeleton className="h-6 w-11 rounded-full" />
                </div>
              ))}
            </div>
          </div>

          {/* Rubric categories */}
          <div className="p-4 rounded-lg border border-[var(--border)]">
            <Skeleton className="h-5 w-32 mb-4" />
            <div className="space-y-3">
              {[1, 2, 3, 4].map((i) => (
                <div
                  key={i}
                  className="flex items-center gap-3 p-3 rounded-lg border border-[var(--border)]"
                >
                  <Skeleton className="w-5 h-5 rounded flex-shrink-0" />
                  <div className="flex-1">
                    <Skeleton className="h-4 w-28 mb-1" />
                    <Skeleton className="h-3 w-48" />
                  </div>
                  <Skeleton className="h-8 w-16 rounded-lg flex-shrink-0" />
                </div>
              ))}
            </div>
            <Skeleton className="h-9 w-36 rounded-lg mt-4" />
          </div>
        </div>
      </div>
    </div>
  );
}
