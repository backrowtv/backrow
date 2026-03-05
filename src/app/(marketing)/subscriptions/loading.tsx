import { Skeleton } from "@/components/ui/skeleton";

export default function SubscriptionsLoading() {
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
          <Skeleton className="h-3 w-72" />
        </div>

        {/* Empty state card - matches p-8 rounded-lg border */}
        <div className="p-8 rounded-lg border border-[var(--border)]">
          <div className="flex flex-col items-center text-center">
            <Skeleton className="h-12 w-12 rounded-full mb-4" />
            <Skeleton className="h-6 w-32 mb-2" />
            <Skeleton className="h-4 w-80 max-w-full" />
          </div>
        </div>
      </div>
    </div>
  );
}
