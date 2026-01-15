import { Skeleton } from "@/components/ui/skeleton";

export default function EndlessLoading() {
  return (
    <div className="w-full max-w-4xl mx-auto px-4 py-6">
      <div className="space-y-6">
        {/* Festival name */}
        <Skeleton className="h-6 w-48" />

        {/* Now Playing carousel */}
        <div>
          <Skeleton className="h-4 w-24 mb-3" />
          <div className="flex gap-4 overflow-hidden">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="flex-shrink-0 w-28">
                <Skeleton className="aspect-[2/3] w-full rounded-lg" />
              </div>
            ))}
          </div>
        </div>

        {/* Selected movie detail card */}
        <div className="rounded-xl border border-[var(--border)] bg-[var(--surface-1)] p-4">
          <div className="flex gap-4">
            <Skeleton className="w-24 aspect-[2/3] rounded-lg flex-shrink-0" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-5 w-40" />
              <Skeleton className="h-3 w-24" />
              <div className="flex gap-2 pt-2">
                <Skeleton className="h-8 w-20 rounded-lg" />
                <Skeleton className="h-8 w-8 rounded-lg" />
              </div>
            </div>
          </div>
        </div>

        {/* Member panel */}
        <div className="rounded-xl border border-[var(--border)] bg-[var(--surface-1)] p-4">
          <div className="flex items-center justify-between">
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-4 w-4" />
          </div>
        </div>

        {/* Discussion section */}
        <div className="rounded-xl border border-[var(--border)] bg-[var(--surface-1)] p-4">
          <Skeleton className="h-5 w-28 mb-3" />
          <div className="space-y-3">
            {[1, 2].map((i) => (
              <div key={i} className="flex items-start gap-3">
                <Skeleton className="w-8 h-8 rounded-full flex-shrink-0" />
                <div className="flex-1">
                  <Skeleton className="h-3 w-20 mb-1" />
                  <Skeleton className="h-3 w-full" />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Pool section */}
        <div>
          <Skeleton className="h-4 w-16 mb-3" />
          <div className="flex gap-4 overflow-hidden">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div key={i} className="flex-shrink-0 w-24">
                <Skeleton className="aspect-[2/3] w-full rounded-lg" />
              </div>
            ))}
          </div>
        </div>

        {/* Recently Played section */}
        <div>
          <Skeleton className="h-4 w-32 mb-3" />
          <div className="flex gap-4 overflow-hidden">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div key={i} className="flex-shrink-0 w-24">
                <Skeleton className="aspect-[2/3] w-full rounded-lg" />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
