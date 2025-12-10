import { Skeleton } from "@/components/ui/skeleton";

export default function TestAuthLoading() {
  return (
    <div className="container mx-auto py-12 max-w-4xl space-y-6">
      {/* Authentication Section Card */}
      <div className="rounded-xl border border-[var(--border)] bg-[var(--surface-1)]">
        <div className="p-6 pb-4">
          <Skeleton className="h-6 w-56 mb-2" />
          <Skeleton className="h-4 w-80" />
        </div>
        <div className="px-6 pb-6 space-y-6">
          {/* Current User */}
          <div className="p-4 rounded-lg bg-[var(--surface-2)]">
            <Skeleton className="h-4 w-24 mb-2" />
            <Skeleton className="h-4 w-40 mb-1" />
            <Skeleton className="h-3 w-28" />
          </div>

          {/* Sign Out Button */}
          <Skeleton className="h-10 w-full rounded-md" />

          {/* Test User Buttons */}
          <div className="space-y-3">
            <Skeleton className="h-4 w-40 mb-2" />
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <Skeleton key={i} className="h-10 w-full rounded-md" />
            ))}
          </div>
        </div>
      </div>

      {/* Quick Links Card */}
      <div className="rounded-xl border border-[var(--border)] bg-[var(--surface-1)]">
        <div className="p-6 pb-4">
          <Skeleton className="h-5 w-36" />
        </div>
        <div className="px-6 pb-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
            {[1, 2, 3, 4].map((i) => (
              <Skeleton key={i} className="h-10 w-full rounded-lg" />
            ))}
          </div>
        </div>
      </div>

      {/* Test Resources Card */}
      <div className="rounded-xl border border-[var(--border)] bg-[var(--surface-1)]">
        <div className="p-6 pb-4">
          <Skeleton className="h-5 w-32 mb-2" />
          <Skeleton className="h-4 w-72" />
        </div>
        <div className="px-6 pb-6 space-y-6">
          {/* Test Movies */}
          <div>
            <Skeleton className="h-4 w-36 mb-3" />
            <div className="space-y-2">
              {[1, 2, 3].map((i) => (
                <div key={i} className="p-3 rounded-lg bg-[var(--surface-2)]">
                  <Skeleton className="h-4 w-48 mb-1" />
                  <Skeleton className="h-3 w-24" />
                </div>
              ))}
            </div>
          </div>

          {/* Test Directors */}
          <div>
            <Skeleton className="h-4 w-28 mb-3" />
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
              {[1, 2, 3, 4].map((i) => (
                <Skeleton key={i} className="h-9 w-full rounded-lg" />
              ))}
            </div>
          </div>

          {/* Test Actors */}
          <div>
            <Skeleton className="h-4 w-24 mb-3" />
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
              {[1, 2, 3, 4].map((i) => (
                <Skeleton key={i} className="h-9 w-full rounded-lg" />
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
