import { Skeleton } from "@/components/ui/skeleton";

export default function FAQLoading() {
  return (
    <div className="bg-[var(--background)] relative">
      <div className="max-w-3xl mx-auto px-4 lg:px-6 py-6 relative z-10">
        {/* Header */}
        <div className="mb-8">
          <Skeleton className="h-7 w-72 mb-2" />
          <Skeleton className="h-4 w-80" />
        </div>

        {/* Quick links to categories */}
        <nav className="mb-8 pb-6">
          <div className="flex flex-wrap gap-2">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <Skeleton key={i} className="h-7 w-24 rounded-full" />
            ))}
          </div>
        </nav>

        {/* FAQ Categories */}
        <div className="space-y-10">
          {[1, 2, 3, 4].map((category) => (
            <section key={category} className="scroll-mt-20">
              <div className="mb-4">
                <Skeleton className="h-5 w-36 mb-1" />
                <Skeleton className="h-3 w-56" />
              </div>
              <div className="space-y-1">
                {[1, 2, 3, 4].map((item) => (
                  <div key={item} className="py-3">
                    <div className="flex items-center justify-between">
                      <Skeleton className="h-4 w-3/4" />
                      <Skeleton className="h-4 w-4 flex-shrink-0 ml-4" />
                    </div>
                  </div>
                ))}
              </div>
            </section>
          ))}
        </div>

        {/* Still have questions CTA */}
        <div className="mt-12 pt-8 text-center">
          <Skeleton className="h-4 w-36 mx-auto mb-3" />
          <Skeleton className="h-4 w-24 mx-auto" />
        </div>
      </div>
    </div>
  );
}
