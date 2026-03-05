import { Skeleton } from "@/components/ui/skeleton";

export default function MarketingLoading() {
  return (
    <div className="flex flex-col" style={{ backgroundColor: "var(--background)" }}>
      {/* Hero — full viewport backdrop with centered CTA */}
      <div className="relative min-h-[60vh] md:min-h-[70vh] -mt-14 lg:-mt-24 pt-14 lg:pt-24">
        {/* Backdrop placeholder */}
        <Skeleton className="absolute inset-0 rounded-none" />

        {/* CTA content */}
        <div className="relative z-10 flex items-center justify-center min-h-[60vh] md:min-h-[70vh]">
          <div className="text-center px-4">
            <Skeleton className="h-12 md:h-14 lg:h-16 w-56 md:w-72 mx-auto" />
            <Skeleton className="h-10 md:h-12 w-48 md:w-60 mx-auto mt-2" />
            <Skeleton className="h-6 w-64 mx-auto mt-5" />
            <div className="mt-8 flex items-center justify-center gap-4">
              <Skeleton className="h-11 w-32 rounded-lg" />
              <Skeleton className="h-11 w-28 rounded-lg" />
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <main className="flex-1">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 md:py-16">
          {/* How It Works section */}
          <div className="mb-24 md:mb-32">
            <Skeleton className="h-8 w-72 mb-2" />
            <Skeleton className="h-5 w-96 max-w-full mb-8" />
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {[1, 2].map((i) => (
                <div key={i} className="rounded-xl border border-[var(--border)] p-5">
                  <div className="flex items-center gap-3 mb-3">
                    <Skeleton className="w-10 h-10 rounded-lg" />
                    <Skeleton className="h-5 w-36" />
                  </div>
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-4 w-3/4 mt-1" />
                </div>
              ))}
            </div>
          </div>

          {/* FAQ Section */}
          <div className="mb-16 md:mb-24 space-y-6">
            <div className="mb-8">
              <div className="flex items-center gap-3 mb-4">
                <Skeleton className="w-10 h-10 rounded-lg" />
                <Skeleton className="h-10 w-48" />
              </div>
              <Skeleton className="h-5 w-80 max-w-full" />
            </div>
            <div className="grid gap-6 md:grid-cols-3">
              {[1, 2, 3].map((i) => (
                <div
                  key={i}
                  className="rounded-lg border border-[var(--border)] bg-[var(--surface-1)] p-5"
                >
                  <Skeleton className="h-5 w-24 mb-3" />
                  <div className="space-y-1">
                    {[1, 2, 3].map((j) => (
                      <div
                        key={j}
                        className="py-2 border-b border-[var(--border)]/50 last:border-0"
                      >
                        <Skeleton className="h-4 w-full" />
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
