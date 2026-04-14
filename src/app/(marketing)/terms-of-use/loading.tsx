import { Skeleton } from "@/components/ui/skeleton";

export default function TermsOfUseLoading() {
  return (
    <div className="bg-[var(--background)]">
      <div className="max-w-3xl mx-auto px-4 lg:px-6 py-6">
        {/* Mobile Back Button placeholder */}
        <div className="lg:hidden mb-4">
          <Skeleton className="h-4 w-12" />
        </div>

        {/* Header */}
        <div className="mb-6">
          <Skeleton className="h-5 w-28 mb-1" />
          <Skeleton className="h-3 w-40" />
        </div>

        {/* Terms content sections - 11 sections total */}
        <div className="space-y-6">
          {/* First section (no border-t) */}
          <section className="space-y-3">
            <Skeleton className="h-5 w-28" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-3/4" />
          </section>

          {/* Remaining sections with border-t */}
          {[2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map((i) => (
            <section key={i} className="space-y-3 border-t border-[var(--border)] pt-6">
              <Skeleton className="h-5 w-40" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-3/4" />
            </section>
          ))}
        </div>
      </div>
    </div>
  );
}
