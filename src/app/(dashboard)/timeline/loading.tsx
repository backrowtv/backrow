import { Skeleton } from "@/components/ui/skeleton";

export default function TimelineLoading() {
  return (
    <div className="bg-[var(--background)]">
      <div className="max-w-3xl mx-auto px-4 lg:px-6 py-6">
        {/* Header - hidden on mobile */}
        <div className="hidden md:block mb-6">
          <Skeleton className="h-7 w-28 mb-1" />
          <Skeleton className="h-4 w-64" />
        </div>

        {/* TimelineContainer -> TimelineView */}
        <div className="space-y-6">
          {/* Tabs - debossed tab bar matching TimelineView */}
          <div className="rounded-lg overflow-hidden h-8 bg-[var(--surface-1)]">
            <div className="flex items-center h-full">
              <Skeleton className="h-6 w-1/2 mx-[2px] rounded-md" />
              <Skeleton className="h-6 w-1/2 mx-[2px] rounded-md" />
            </div>
          </div>

          {/* Club filter pills (global mode) */}
          <div className="flex gap-2 overflow-hidden">
            {[1, 2, 3, 4].map((i) => (
              <Skeleton key={i} className="h-7 w-20 rounded-full flex-shrink-0" />
            ))}
          </div>

          {/* Timeline items - matches TimelineItemCard layout */}
          <div className="space-y-0">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="flex items-center gap-4 py-6 rounded-lg -mx-3 px-3">
                {/* Club avatar */}
                <Skeleton className="w-10 h-10 rounded-full flex-shrink-0" />
                {/* Content - spread horizontally */}
                <div className="flex-1 min-w-0 flex items-center justify-between gap-4">
                  {/* Left: type label + title */}
                  <div className="min-w-0">
                    <Skeleton className="h-3 w-16 mb-1" />
                    <Skeleton className="h-5 w-44 mt-1" />
                  </div>
                  {/* Right: date/time */}
                  <div className="flex-shrink-0 text-right">
                    <Skeleton className="h-4 w-24 mb-0.5" />
                    <Skeleton className="h-4 w-16 ml-auto" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
