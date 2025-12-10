import { Skeleton } from "@/components/ui/skeleton";

export default function AdminOverviewLoading() {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <Skeleton className="h-6 w-28 mb-2" />
        <Skeleton className="h-4 w-64" />
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        {[1, 2, 3, 4, 5, 6].map((i) => (
          <div
            key={i}
            className="rounded-xl border border-[var(--border)] bg-[var(--surface-1)] p-4"
          >
            <Skeleton className="h-4 w-16 mb-2" />
            <Skeleton className="h-8 w-12" />
          </div>
        ))}
      </div>

      {/* Featured club */}
      <div className="rounded-xl border border-[var(--border)] bg-[var(--surface-1)] p-5">
        <Skeleton className="h-5 w-32 mb-3" />
        <Skeleton className="h-16 w-full rounded-lg" />
      </div>

      {/* Needs attention */}
      <div className="rounded-xl border border-[var(--border)] bg-[var(--surface-1)] p-5">
        <Skeleton className="h-5 w-40 mb-3" />
        <div className="space-y-2">
          <Skeleton className="h-10 w-full rounded-lg" />
          <Skeleton className="h-10 w-full rounded-lg" />
          <Skeleton className="h-10 w-full rounded-lg" />
        </div>
      </div>
    </div>
  );
}
