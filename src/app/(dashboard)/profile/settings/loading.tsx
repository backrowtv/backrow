import { Skeleton } from "@/components/ui/skeleton";

export default function SettingsLoading() {
  return (
    <div className="bg-[var(--background)]">
      <div className="max-w-3xl mx-auto px-4 lg:px-6 py-6">
        {/* Mobile Back Button placeholder */}
        <div className="md:hidden mb-4">
          <Skeleton className="h-4 w-16" />
        </div>

        {/* Header - Hidden on mobile since TopNav shows "Profile" */}
        <div className="hidden md:block mb-6">
          <Skeleton className="h-6 w-20" />
        </div>

        {/* ProfileEditForm skeleton */}
        <div className="space-y-6">
          {/* Profile Picture section */}
          <div>
            <Skeleton className="h-2.5 w-28 mb-3" />
            <div className="flex items-center gap-4">
              <Skeleton className="w-20 h-20 rounded-full" />
              <div className="space-y-2">
                <Skeleton className="h-8 w-24 rounded-md" />
                <Skeleton className="h-3 w-40" />
              </div>
            </div>
          </div>

          {/* Display Name field */}
          <div className="space-y-2">
            <Skeleton className="h-2.5 w-24" />
            <Skeleton className="h-10 w-full rounded-md" />
          </div>

          {/* Username field */}
          <div className="space-y-2">
            <Skeleton className="h-2.5 w-20" />
            <Skeleton className="h-10 w-full rounded-md" />
          </div>

          {/* Bio field */}
          <div className="space-y-2">
            <Skeleton className="h-2.5 w-12" />
            <Skeleton className="h-24 w-full rounded-md" />
          </div>

          {/* Submit button */}
          <Skeleton className="h-10 w-32 rounded-md" />
        </div>

        {/* Settings Sub-pages */}
        <div className="mt-6 pt-6">
          <div className="space-y-1">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="flex items-center gap-3 p-3 -mx-3 rounded-lg">
                <div className="flex-1 min-w-0">
                  <Skeleton className="h-4 w-24 mb-1" />
                  <Skeleton className="h-3 w-48" />
                </div>
                <Skeleton className="w-4 h-4 flex-shrink-0" />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
