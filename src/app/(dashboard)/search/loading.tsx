import { Skeleton } from "@/components/ui/skeleton";

export default function SearchLoading() {
  return (
    <div className="bg-[var(--background)]">
      <div className="max-w-3xl mx-auto px-4 lg:px-6 py-6">
        {/* Header - hidden on mobile */}
        <div className="hidden md:block mb-6">
          <Skeleton className="h-7 w-20 mb-1" />
          <Skeleton className="h-4 w-64" />
        </div>

        {/* Search input */}
        <Skeleton className="h-10 w-full rounded-lg mb-4" />

        {/* Curated collection sections */}
        {[1, 2].map((section) => (
          <div key={section} className="mt-6 md:mt-12">
            <div className="mb-3">
              <Skeleton className="h-6 w-36" />
              <Skeleton className="h-4 w-48 mt-1" />
            </div>
            {/* Movie poster carousel */}
            <div className="flex gap-4 overflow-hidden px-4 py-3">
              {[1, 2, 3, 4, 5, 6].map((i) => (
                <div key={i} className="flex-shrink-0 w-24 md:w-28">
                  <Skeleton className="aspect-[2/3] w-full rounded-md" />
                </div>
              ))}
            </div>
          </div>
        ))}

        {/* Upcoming movies section */}
        <div className="mt-6 md:mt-12">
          <div className="mb-3">
            <Skeleton className="h-6 w-32" />
          </div>
          {/* Movie poster carousel */}
          <div className="flex gap-4 overflow-hidden px-4 py-3">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div key={i} className="flex-shrink-0 w-24 md:w-28">
                <Skeleton className="aspect-[2/3] w-full rounded-md" />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
