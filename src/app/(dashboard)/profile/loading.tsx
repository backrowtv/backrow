import { Skeleton } from "@/components/ui/skeleton";

export default function ProfileLoading() {
  return (
    <div className="max-w-3xl mx-auto animate-fade-in">
      <div className="space-y-6">
        {/* Recently Watched - poster carousel */}
        <section>
          <div className="flex gap-4 overflow-hidden">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <Skeleton key={i} className="w-24 md:w-28 aspect-[2/3] rounded-md flex-shrink-0" />
            ))}
          </div>
        </section>

        {/* Recent Activity */}
        <section>
          <div className="flex items-center justify-between mb-3">
            <Skeleton className="h-3.5 w-28" />
            <Skeleton className="h-3.5 w-6" />
          </div>
          <div className="space-y-1">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="flex items-center gap-2 py-1.5">
                <Skeleton className="w-6 h-6 rounded-full flex-shrink-0" />
                <Skeleton className="h-3 flex-1" />
                <Skeleton className="h-2.5 w-12 flex-shrink-0" />
              </div>
            ))}
          </div>
        </section>

        {/* Future Nominations */}
        <section>
          <div className="flex items-center justify-between mb-3">
            <Skeleton className="h-3.5 w-36" />
            <Skeleton className="h-3.5 w-6" />
          </div>
          {/* Nomination cards - horizontal scroll of movie posters */}
          <div className="flex gap-3 overflow-hidden">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="flex-shrink-0 w-28">
                <Skeleton className="w-28 aspect-[2/3] rounded-lg mb-2" />
                <Skeleton className="h-3 w-full mb-1" />
                <Skeleton className="h-2.5 w-16" />
              </div>
            ))}
          </div>
        </section>

        {/* Quick Links - 2 column grid */}
        <section className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-4 border-t border-[var(--border)]">
          {[1, 2].map((i) => (
            <div
              key={i}
              className="flex items-center gap-3 p-3 rounded-lg border border-[var(--border)]"
            >
              <div className="flex-1 min-w-0">
                <Skeleton className="h-3.5 w-16 mb-1" />
                <Skeleton className="h-3 w-48" />
              </div>
              <Skeleton className="w-4 h-4 flex-shrink-0" />
            </div>
          ))}
        </section>
      </div>
    </div>
  );
}
