import { Skeleton } from "@/components/ui/skeleton";

export default function DiscussLoading() {
  return (
    <>
      {/* ClubNavigation placeholder */}
      <div className="h-10 bg-[var(--surface-1)]" />

      <div className="">
        <div className="max-w-3xl mx-auto px-4 lg:px-6 py-6">
          {/* Header - Desktop only */}
          <div className="hidden md:block mb-6">
            <Skeleton className="h-5 w-28 mb-1.5" />
            <Skeleton className="h-3 w-56" />
          </div>

          {/* Filter tabs + Create button */}
          <div className="flex items-center justify-between mb-4">
            <div className="flex gap-2">
              {["All", "Movie", "Actor", "Director", "Composer", "Festival"].map((label) => (
                <Skeleton key={label} className="h-8 w-16 rounded-full" />
              ))}
            </div>
            <Skeleton className="h-8 w-8 rounded-full" />
          </div>

          {/* Thread list */}
          <div className="space-y-2">
            {[1, 2, 3, 4, 5].map((i) => (
              <div
                key={i}
                className="p-3 rounded-lg border border-[var(--border)] bg-[var(--surface-1)]"
              >
                <div className="flex items-start gap-3">
                  <Skeleton className="w-8 h-8 rounded-full flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <Skeleton className="h-4 w-48" />
                      <Skeleton className="h-4 w-12 rounded-full" />
                    </div>
                    <Skeleton className="h-3 w-full mb-1" />
                    <Skeleton className="h-3 w-2/3" />
                    <div className="flex items-center gap-3 mt-2">
                      <Skeleton className="h-3 w-20" />
                      <Skeleton className="h-3 w-16" />
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </>
  );
}
