import { Skeleton } from "@/components/ui/skeleton";

export default function BadgesLoading() {
  return (
    <div className="space-y-8 p-6">
      {/* Header */}
      <div>
        <Skeleton className="h-6 w-28 mb-1" />
        <Skeleton className="h-4 w-80" />
      </div>

      {/* Badge categories */}
      {[1, 2].map((category) => (
        <div key={category} className="space-y-6">
          <Skeleton className="h-4 w-32" />
          <div className="grid grid-cols-6 gap-3">
            {Array.from({ length: 12 }).map((_, i) => (
              <div
                key={i}
                className="flex flex-col items-center gap-1.5 p-2 rounded-lg bg-[var(--surface-1)]"
              >
                <Skeleton className="w-12 h-12 rounded-full" />
                <Skeleton className="h-2 w-10" />
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
