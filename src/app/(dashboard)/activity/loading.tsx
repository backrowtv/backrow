import { Skeleton } from "@/components/ui/skeleton";

export default function ActivityLoading() {
  return (
    <div className="bg-[var(--background)]">
      <div className="max-w-3xl mx-auto px-4 lg:px-6 py-6">
        {/* Header - hidden on mobile */}
        <div className="hidden md:block mb-6">
          <Skeleton className="h-7 w-24 mb-1" />
          <Skeleton className="h-4 w-80" />
        </div>

        {/* Filters - ActivityFiltersV2 tabs row */}
        <div className="mb-6">
          <Skeleton className="h-10 w-full rounded-lg" />
        </div>

        {/* Activity Feed - matches NewActivityItem layout */}
        <div className="space-y-2" style={{ minHeight: "794px" }}>
          {Array.from({ length: 15 }, (_, i) => i + 1).map((i) => (
            <div key={i} className="flex items-center gap-2.5 py-2 px-2 h-[52px] overflow-hidden">
              {/* Display image - fixed 28px width container */}
              <div className="w-7 flex-shrink-0 flex items-center justify-center self-center">
                <Skeleton className="w-[19px] h-7 rounded-sm" />
              </div>
              {/* Content */}
              <div className="flex-1 min-w-0">
                <Skeleton className="h-3.5 w-48" />
              </div>
              {/* Timestamp */}
              <Skeleton className="h-3 w-8 flex-shrink-0" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
