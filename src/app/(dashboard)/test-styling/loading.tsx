import { Skeleton } from "@/components/ui/skeleton";

export default function TestStylingLoading() {
  return (
    <div className="p-6 space-y-8">
      <div className="max-w-4xl mx-auto">
        {/* Page heading */}
        <Skeleton className="h-9 w-44 mb-2" />
        <Skeleton className="h-5 w-96 mb-8" />

        {/* Preview Mode Toggle */}
        <div className="flex gap-2 mb-8">
          <Skeleton className="h-10 w-40 rounded-lg" />
          <Skeleton className="h-10 w-40 rounded-lg" />
        </div>

        {/* Section 1: Background Colors */}
        <section className="mb-12">
          <Skeleton className="h-7 w-44 mb-4" />
          <div className="grid md:grid-cols-2 gap-6">
            {[1, 2].map((i) => (
              <div
                key={i}
                className="p-4 rounded-lg border border-[var(--border)] bg-[var(--surface-1)]"
              >
                <div className="flex justify-between items-center mb-3">
                  <Skeleton className="h-5 w-40" />
                  <Skeleton className="h-6 w-24 rounded" />
                </div>
                <div className="space-y-3">
                  <Skeleton className="h-8 w-full rounded" />
                  <Skeleton className="h-8 w-full rounded" />
                  <Skeleton className="h-8 w-full rounded" />
                </div>
                {/* Color preview */}
                <Skeleton className="h-16 w-full rounded-md mt-3" />
              </div>
            ))}
          </div>
        </section>

        {/* Section 2: Heading Fonts */}
        <section className="mb-12">
          <Skeleton className="h-7 w-36 mb-4" />
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <div
                key={i}
                className="p-3 rounded-lg border border-[var(--border)] bg-[var(--surface-1)]"
              >
                <Skeleton className="h-6 w-24 mb-2" />
                <Skeleton className="h-3 w-32" />
              </div>
            ))}
          </div>
        </section>

        {/* Section 3: Body Fonts */}
        <section className="mb-12">
          <Skeleton className="h-7 w-28 mb-4" />
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <div
                key={i}
                className="p-3 rounded-lg border border-[var(--border)] bg-[var(--surface-1)]"
              >
                <Skeleton className="h-6 w-24 mb-2" />
                <Skeleton className="h-3 w-32" />
              </div>
            ))}
          </div>
        </section>

        {/* Preview section */}
        <section className="mb-12">
          <Skeleton className="h-7 w-24 mb-4" />
          <div className="p-6 rounded-lg border border-[var(--border)] bg-[var(--surface-1)]">
            <Skeleton className="h-8 w-48 mb-3" />
            <Skeleton className="h-4 w-full mb-2" />
            <Skeleton className="h-4 w-3/4 mb-4" />
            <Skeleton className="h-32 w-full rounded-lg" />
          </div>
        </section>
      </div>
    </div>
  );
}
