import { SkeletonRegion, Skeleton } from "@/components/ui/skeleton";

export default function AdminLoading() {
  return (
    <SkeletonRegion label="Loading admin">
      <div className="max-w-6xl mx-auto px-4 lg:px-6 py-6 space-y-4">
        <Skeleton className="h-7 w-32" />
        <Skeleton className="h-4 w-80" />
        <div className="flex gap-4 pb-0">
          {[0, 1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-9 w-24" />
          ))}
        </div>
        <div className="space-y-3 pt-2">
          {[0, 1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-16 w-full rounded-lg" />
          ))}
        </div>
      </div>
    </SkeletonRegion>
  );
}
