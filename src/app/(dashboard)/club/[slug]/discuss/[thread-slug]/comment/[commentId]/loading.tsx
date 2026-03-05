import { Skeleton } from "@/components/ui/skeleton";

export default function ContinuedThreadLoading() {
  return (
    <>
      {/* ClubNavigation placeholder */}
      <div className="h-10 bg-[var(--surface-1)]" />

      <section className="py-8 md:py-12 w-full">
        <div className="mx-auto px-4 sm:px-6 lg:px-8 max-w-4xl !p-4 md:!p-6">
          {/* Navigation context */}
          <div className="mb-4">
            <Skeleton className="h-8 w-48 mb-2 rounded-md" />
            <div className="flex items-center gap-2">
              <Skeleton className="h-3 w-16" />
              <Skeleton className="h-3 w-32" />
            </div>
          </div>

          {/* Comment card */}
          <div className="rounded-lg border border-[var(--border)] bg-[var(--surface-1)] p-3 sm:p-4">
            {/* Anchor comment */}
            <div className="flex items-start gap-3 mb-4">
              <Skeleton className="w-8 h-8 rounded-full flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <Skeleton className="h-3 w-20" />
                  <Skeleton className="h-3 w-16" />
                </div>
                <Skeleton className="h-3 w-full mb-1" />
                <Skeleton className="h-3 w-3/4 mb-1" />
                <Skeleton className="h-3 w-1/2" />
              </div>
            </div>

            {/* Reply actions */}
            <div className="flex items-center gap-3 py-2 border-t border-[var(--border)] mb-4">
              <Skeleton className="h-7 w-16 rounded-md" />
              <Skeleton className="h-7 w-16 rounded-md" />
            </div>

            {/* Child comments */}
            <div className="space-y-3 pl-4 border-l-2 border-[var(--border)]">
              {[1, 2].map((i) => (
                <div key={i} className="flex items-start gap-3">
                  <Skeleton className="w-7 h-7 rounded-full flex-shrink-0" />
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <Skeleton className="h-3 w-16" />
                      <Skeleton className="h-3 w-12" />
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
