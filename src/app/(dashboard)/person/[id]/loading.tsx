import { Skeleton } from "@/components/ui/skeleton";

export default function PersonDetailLoading() {
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
              <div className="flex-1 min-w-0">
                <div className="flex items-start gap-2 mb-2">
                  <Skeleton className="h-7 w-48 flex-1" />
                  <Skeleton className="h-7 w-7 rounded-lg flex-shrink-0" />
                </div>
                <div className="flex gap-2 mb-3">
                  <Skeleton className="h-4 w-16" />
                  <Skeleton className="h-4 w-32" />
                  <Skeleton className="h-4 w-24" />
                </div>
                <div className="flex gap-2">
                  <Skeleton className="h-6 w-6 rounded" />
                  <Skeleton className="h-6 w-6 rounded" />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-3xl mx-auto px-4 lg:px-6 py-6">
        <div className="space-y-6">
          {/* Biography */}
          <div>
            <Skeleton className="h-5 w-24 mb-2" />
            <Skeleton className="h-4 w-full mb-2" />
            <Skeleton className="h-4 w-full mb-2" />
            <Skeleton className="h-4 w-3/4" />
          </div>

          {/* Known For */}
          <div>
            <Skeleton className="h-5 w-24 mb-4" />
            <div className="flex gap-4 overflow-hidden">
              {[1, 2, 3, 4, 5].map((i) => (
                <div key={i} className="flex-shrink-0 w-32">
                  <Skeleton className="aspect-[2/3] w-full rounded-lg mb-2" />
                  <Skeleton className="h-3 w-full mb-1" />
                  <Skeleton className="h-2.5 w-2/3" />
                </div>
              ))}
            </div>
          </div>

          {/* Filmography */}
          <div>
            <Skeleton className="h-5 w-32 mb-3" />
            <div className="space-y-0.5">
              {[1, 2, 3, 4, 5].map((i) => (
                <div key={i} className="flex items-center gap-3 py-2 px-2">
                  <Skeleton className="w-10 h-14 rounded flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-baseline gap-2">
                      <Skeleton className="h-4 w-32" />
                      <Skeleton className="h-3 w-10" />
                    </div>
                    <Skeleton className="h-3 w-20 mt-1" />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
