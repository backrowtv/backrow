import { Skeleton } from "@/components/ui/skeleton";

export default function Loading() {
  return (
    <div className="space-y-6">
      <div>
        <Skeleton className="h-6 w-20 mb-2" />
        <Skeleton className="h-4 w-52" />
      </div>
      {/* Admins card */}
      <div className="rounded-xl bg-[var(--surface-1)] p-5">
        <Skeleton className="h-5 w-28 mb-3" />
        <div className="space-y-2">
          {[1, 2].map((i) => (
            <Skeleton key={i} className="h-12 w-full rounded-lg" />
          ))}
        </div>
      </div>
      {/* User table */}
      <div className="rounded-xl bg-[var(--surface-1)] overflow-hidden">
        <div className="p-4">
          <Skeleton className="h-9 w-full" />
        </div>
        <div className="p-4 space-y-2">
          {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
            <Skeleton key={i} className="h-10 w-full" />
          ))}
        </div>
      </div>
    </div>
  );
}
