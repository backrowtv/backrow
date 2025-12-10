import { Skeleton } from "@/components/ui/skeleton";

export default function JoinClubLoading() {
  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="max-w-md w-full rounded-xl border border-[var(--border)] bg-[var(--surface-1)] p-8 text-center space-y-6">
        {/* Club avatar */}
        <div className="flex justify-center">
          <Skeleton className="h-20 w-20 rounded-full" />
        </div>

        {/* Title and description */}
        <div className="space-y-2">
          <Skeleton className="h-6 w-48 mx-auto" />
          <Skeleton className="h-5 w-36 mx-auto" />
          <Skeleton className="h-4 w-64 mx-auto" />
          <Skeleton className="h-4 w-44 mx-auto" />
        </div>

        {/* Action buttons */}
        <div className="space-y-3">
          <Skeleton className="h-10 w-full rounded-md" />
          <Skeleton className="h-10 w-full rounded-md" />
        </div>
      </div>
    </div>
  );
}
