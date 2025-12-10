import { Skeleton } from "@/components/ui/skeleton";

export default function Loading() {
  return (
    <div className="space-y-6">
      <div>
        <Skeleton className="h-6 w-36 mb-2" />
        <Skeleton className="h-4 w-56" />
      </div>
      <div className="rounded-xl border border-[var(--border)] bg-[var(--surface-1)] p-5">
        <Skeleton className="h-5 w-40 mb-4" />
        <div className="space-y-3">
          <Skeleton className="h-9 w-full" />
          <Skeleton className="h-20 w-full" />
          <Skeleton className="h-9 w-32" />
        </div>
      </div>
      <div className="rounded-xl border border-[var(--border)] bg-[var(--surface-1)] p-5">
        <Skeleton className="h-5 w-36 mb-4" />
        <div className="space-y-2">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-20 w-full rounded-lg" />
          ))}
        </div>
      </div>
    </div>
  );
}
