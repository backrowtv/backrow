import { Skeleton } from "@/components/ui/skeleton";

export default function NotificationSettingsLoading() {
  return (
    <div className="bg-[var(--background)]">
      <div className="max-w-3xl mx-auto px-4 lg:px-6 py-6">
        {/* Mobile Back Button placeholder */}
        <div className="md:hidden mb-4">
          <Skeleton className="h-4 w-16" />
        </div>

        {/* Header - Hidden on mobile since TopNav shows "Profile" */}
        <div className="hidden md:block mb-6">
          <Skeleton className="h-6 w-44" />
        </div>

        {/* NotificationSettingsForm skeleton */}
        <div className="space-y-6">
          {/* Master toggle */}
          <div className="flex items-center justify-between p-4 rounded-lg border border-[var(--border)]">
            <div>
              <Skeleton className="h-4 w-32 mb-1" />
              <Skeleton className="h-3 w-48" />
            </div>
            <Skeleton className="h-6 w-11 rounded-full flex-shrink-0" />
          </div>

          {/* Notification categories */}
          {[1, 2, 3, 4, 5].map((section) => (
            <div key={section} className="space-y-2">
              <Skeleton className="h-3 w-24 mb-2" />
              {[1, 2, 3].map((row) => (
                <div key={row} className="flex items-center justify-between py-3">
                  <div>
                    <Skeleton className="h-4 w-36 mb-1" />
                    <Skeleton className="h-3 w-56" />
                  </div>
                  <Skeleton className="h-6 w-11 rounded-full flex-shrink-0" />
                </div>
              ))}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
