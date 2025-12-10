import { Skeleton } from "@/components/ui/skeleton";

export default function NotificationsSettingsLoading() {
  return (
    <div className="bg-[var(--background)]">
      <div className="max-w-3xl mx-auto px-4 lg:px-6 py-6">
        {/* Mobile Back Button */}
        <div className="md:hidden mb-4">
          <Skeleton className="h-8 w-24 rounded-md" />
        </div>

        {/* Header - Hidden on mobile */}
        <div className="hidden md:block mb-6">
          <Skeleton className="h-5 w-40 mb-1.5" />
          <Skeleton className="h-3 w-52" />
        </div>

        {/* Notification toggles */}
        <div className="space-y-6">
          {/* Master toggle */}
          <div className="flex items-center justify-between py-3 border-b border-[var(--border)]">
            <div>
              <Skeleton className="h-4 w-40 mb-1" />
              <Skeleton className="h-3 w-48" />
            </div>
            <Skeleton className="h-6 w-11 rounded-full" />
          </div>

          {/* Section: Festival */}
          <div className="space-y-3">
            <Skeleton className="h-4 w-20" />
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="flex items-center justify-between py-2">
                <Skeleton className="h-3.5 w-32" />
                <Skeleton className="h-6 w-11 rounded-full" />
              </div>
            ))}
          </div>

          {/* Section: Club */}
          <div className="space-y-3">
            <Skeleton className="h-4 w-12" />
            {[1, 2].map((i) => (
              <div key={i} className="flex items-center justify-between py-2">
                <Skeleton className="h-3.5 w-28" />
                <Skeleton className="h-6 w-11 rounded-full" />
              </div>
            ))}
          </div>

          {/* Section: Social */}
          <div className="space-y-3">
            <Skeleton className="h-4 w-14" />
            {[1, 2].map((i) => (
              <div key={i} className="flex items-center justify-between py-2">
                <Skeleton className="h-3.5 w-24" />
                <Skeleton className="h-6 w-11 rounded-full" />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
