import { Skeleton } from "@/components/ui/skeleton";

export default function DisplayCaseLoading() {
  return (
    <div className="bg-[var(--background)]">
      <div className="max-w-3xl mx-auto px-4 lg:px-6 py-6">
        {/* Header */}
        <div className="hidden md:block mb-6">
          <Skeleton className="h-6 w-28" />
        </div>

        <div className="space-y-8">
          {/* Favorites Section */}
          <section className="space-y-4">
            <Skeleton className="h-5 w-20" />
            {/* Tabs */}
            <Skeleton className="h-8 w-56 rounded-lg" />
            {/* Toolbar */}
            <div className="flex justify-between">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-4 w-12" />
            </div>
            {/* List items */}
            <div className="space-y-1">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="flex items-center gap-2 px-2 py-1.5">
                  <Skeleton className="w-4 h-4" />
                  <Skeleton className="w-6 h-9 rounded-sm" />
                  <Skeleton className="h-4 flex-1" />
                  <Skeleton className="w-4 h-4 rounded-full" />
                </div>
              ))}
            </div>
          </section>

          {/* Challenges Section */}
          <section className="border-t border-[var(--border)] pt-6">
            {/* Header */}
            <div className="flex justify-between mb-4">
              <div className="flex items-baseline gap-2">
                <Skeleton className="h-5 w-24" />
                <Skeleton className="h-3 w-16" />
              </div>
              <Skeleton className="h-7 w-32 rounded-md" />
            </div>
            {/* Stats row */}
            <div className="pb-4 border-b border-[var(--border)]">
              <Skeleton className="h-3 w-72" />
            </div>
            {/* Badge categories */}
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="py-4 border-b border-[var(--border)] last:border-b-0">
                <div className="flex justify-between mb-3">
                  <Skeleton className="h-4 w-32" />
                  <Skeleton className="h-3 w-8" />
                </div>
                <div className="grid grid-cols-3 sm:grid-cols-6 gap-2 sm:gap-3 justify-items-center">
                  {[1, 2, 3, 4, 5].map((j) => (
                    <div key={j} className="flex flex-col items-center gap-1">
                      <Skeleton className="w-14 h-14 rounded-full" />
                      <Skeleton className="h-2.5 w-10" />
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </section>
        </div>
      </div>
    </div>
  );
}
