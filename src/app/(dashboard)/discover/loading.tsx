import { Skeleton } from "@/components/ui/skeleton";

export default function DiscoverLoading() {
  return (
    <div className="bg-[var(--background)]">
      <div className="max-w-6xl mx-auto px-4 lg:px-6 py-6">
        {/* Toolbar */}
        <div className="flex items-center gap-3 mb-4">
          <Skeleton className="h-9 flex-1 rounded-lg" />
          <Skeleton className="h-8 w-20 rounded-md" />
          <Skeleton className="h-8 w-16 rounded-md" />
          <Skeleton className="h-8 w-20 rounded-md" />
        </div>

        {/* Keyword pills */}
        <div className="flex gap-1.5 mb-4">
          {[1, 2, 3, 4, 5].map((i) => (
            <Skeleton key={i} className="h-6 w-16 rounded-full" />
          ))}
        </div>

        {/* Result count */}
        <Skeleton className="h-3 w-16 mb-3" />

        {/* Club cards grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="rounded-xl border border-[var(--border)] overflow-hidden">
              <Skeleton className="h-16 w-full" />
              <div className="flex justify-center -mt-7 relative z-10 mb-2">
                <Skeleton className="w-14 h-14 rounded-full" />
              </div>
              <div className="px-4 pb-3 flex flex-col items-center">
                <Skeleton className="h-4 w-28 mb-1.5" />
                <Skeleton className="h-3 w-16 mb-2" />
                <Skeleton className="h-3 w-full mb-1" />
                <Skeleton className="h-3 w-3/4" />
              </div>
              <div className="border-t border-[var(--border)] flex divide-x divide-[var(--border)]">
                <Skeleton className="flex-1 h-9" />
                <Skeleton className="flex-1 h-9" />
                <Skeleton className="flex-1 h-9" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
