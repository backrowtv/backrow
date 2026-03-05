import { Skeleton } from "@/components/ui/skeleton";

export default function ThreadLoading() {
  return (
    <>
      {/* ClubNavigation placeholder */}
      <div className="h-10 bg-[var(--surface-1)]" />

      <section className="py-8 md:py-12 w-full">
        <div className="mx-auto px-4 sm:px-6 lg:px-8 max-w-4xl !p-4 md:!p-6">
          {/* Back link */}
          <Skeleton className="h-8 w-40 mb-4 rounded-md" />

          {/* Thread card */}
          <div className="rounded-xl border border-[var(--border)] bg-[var(--surface-1)] p-4 sm:p-6">
            {/* Thread header */}
            <div className="flex items-start gap-3 mb-4">
              <Skeleton className="w-10 h-10 rounded-full flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <Skeleton className="h-5 w-64 mb-1.5" />
                <div className="flex items-center gap-2">
                  <Skeleton className="h-3 w-24" />
                  <Skeleton className="h-3 w-20" />
                </div>
              </div>
              <Skeleton className="h-5 w-14 rounded-full flex-shrink-0" />
            </div>

            {/* Thread content */}
            <div className="space-y-2 mb-6">
              <Skeleton className="h-3 w-full" />
              <Skeleton className="h-3 w-full" />
              <Skeleton className="h-3 w-3/4" />
              <Skeleton className="h-3 w-1/2" />
            </div>

            {/* Thread actions */}
            <div className="flex items-center gap-3 py-3 border-t border-[var(--border)]">
              <Skeleton className="h-7 w-16 rounded-md" />
              <Skeleton className="h-7 w-16 rounded-md" />
            </div>

            {/* Comments */}
            <div className="mt-4 space-y-4">
              {[1, 2, 3].map((i) => (
                <div
                  key={i}
                  className="flex items-start gap-3 pl-4 border-l-2 border-[var(--border)]"
                >
                  <Skeleton className="w-8 h-8 rounded-full flex-shrink-0" />
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <Skeleton className="h-3 w-20" />
                      <Skeleton className="h-3 w-16" />
                    </div>
                    <Skeleton className="h-3 w-full mb-1" />
                    <Skeleton className="h-3 w-2/3" />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
