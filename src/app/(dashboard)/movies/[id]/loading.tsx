import { Skeleton } from "@/components/ui/skeleton";

export default function MovieDetailLoading() {
  return (
    <div className="bg-[var(--background)]">
      {/* Hero Section */}
      <div className="relative w-full h-[250px] lg:h-[350px] overflow-hidden">
        <Skeleton className="absolute inset-0 rounded-none" />
        <div className="absolute inset-0 bg-gradient-to-t from-[var(--background)] via-[var(--background)]/80 to-transparent z-10" />
        <div className="absolute inset-0 flex items-end z-20 pb-6">
          <div className="max-w-3xl mx-auto w-full px-4 lg:px-6">
            <div className="flex gap-4 lg:gap-6 items-end">
              <Skeleton className="w-[120px] lg:w-[160px] aspect-[2/3] rounded-lg flex-shrink-0" />
              <div className="flex-1 min-w-0 flex flex-col justify-between">
                <div className="flex items-start gap-2">
                  <Skeleton className="h-7 w-3/4 flex-1" />
                  <Skeleton className="h-7 w-7 rounded-lg flex-shrink-0" />
                </div>
                <div>
                  <div className="flex gap-2 mb-2 mt-2">
                    <Skeleton className="h-4 w-12" />
                    <Skeleton className="h-4 w-16 rounded-full" />
                    <Skeleton className="h-4 w-16" />
                  </div>
                  <div className="flex gap-2">
                    <Skeleton className="h-6 w-6 rounded" />
                    <Skeleton className="h-6 w-6 rounded" />
                    <Skeleton className="h-6 w-6 rounded" />
                  </div>
                </div>
                {/* MovieActions placeholder */}
                <div className="flex gap-2 mt-2">
                  <Skeleton className="h-8 w-20 rounded-lg" />
                  <Skeleton className="h-8 w-8 rounded-lg" />
                  <Skeleton className="h-8 w-8 rounded-lg" />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-3xl mx-auto px-4 lg:px-6 py-6">
        <div className="space-y-6">
          {/* Private Notes */}
          <div>
            <Skeleton className="h-4 w-28 mb-2" />
            <Skeleton className="h-20 w-full rounded-lg" />
          </div>

          {/* Club Discussions */}
          <div>
            <Skeleton className="h-5 w-36 mb-3" />
            <div className="rounded-lg border border-[var(--border)] p-3">
              <div className="flex items-center gap-3">
                <Skeleton className="w-8 h-8 rounded-full" />
                <div className="flex-1">
                  <Skeleton className="h-4 w-48 mb-1" />
                  <Skeleton className="h-3 w-20" />
                </div>
              </div>
            </div>
          </div>

          {/* Overview */}
          <div>
            <Skeleton className="h-5 w-24 mb-3" />
            <div className="flex gap-1.5 mb-3">
              <Skeleton className="h-5 w-16 rounded-full" />
              <Skeleton className="h-5 w-20 rounded-full" />
              <Skeleton className="h-5 w-14 rounded-full" />
            </div>
            <Skeleton className="h-4 w-full mb-2" />
            <Skeleton className="h-4 w-full mb-2" />
            <Skeleton className="h-4 w-2/3" />
          </div>

          {/* Cast */}
          <div>
            <Skeleton className="h-5 w-24 mb-4" />
            <div className="flex gap-4 overflow-hidden">
              {[1, 2, 3, 4, 5].map((i) => (
                <div key={i} className="flex-shrink-0 w-[100px]">
                  <Skeleton className="w-[100px] h-[150px] rounded-lg mb-2" />
                  <Skeleton className="h-3 w-full mb-1" />
                  <Skeleton className="h-2.5 w-2/3" />
                </div>
              ))}
            </div>
          </div>

          {/* Crew */}
          <div>
            <Skeleton className="h-5 w-20 mb-4" />
            <div className="flex gap-4 overflow-hidden">
              {[1, 2, 3, 4, 5].map((i) => (
                <div key={i} className="flex-shrink-0 w-[100px]">
                  <Skeleton className="w-[100px] h-[150px] rounded-lg mb-2" />
                  <Skeleton className="h-3 w-full mb-1" />
                  <Skeleton className="h-2.5 w-2/3" />
                </div>
              ))}
            </div>
          </div>

          {/* Details */}
          <div className="space-y-3">
            <Skeleton className="h-5 w-20" />
            {[1, 2, 3, 4].map((i) => (
              <div key={i}>
                <div className="flex justify-between">
                  <Skeleton className="h-3 w-16" />
                  <Skeleton className="h-3 w-24" />
                </div>
                {i < 4 && <div className="h-px bg-[var(--border)] mt-3" />}
              </div>
            ))}
          </div>

          {/* Where to Watch */}
          <div>
            <Skeleton className="h-5 w-32 mb-3" />
            <div className="flex gap-2">
              {[1, 2, 3, 4].map((i) => (
                <Skeleton key={i} className="h-10 w-10 rounded-lg" />
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
