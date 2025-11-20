import { Skeleton } from "@/components/ui/skeleton";

export default function SubscriptionSettingsLoading() {
  return (
    <div className="bg-[var(--background)]">
      <div className="max-w-3xl mx-auto px-4 lg:px-6 py-6">
        {/* Mobile Back Button placeholder */}
        <div className="md:hidden mb-4">
          <Skeleton className="h-4 w-16" />
        </div>

        {/* Header - Hidden on mobile since TopNav shows "Profile" */}
        <div className="hidden md:block mb-6">
          <Skeleton className="h-6 w-48" />
        </div>

        <div className="space-y-6">
          {/* Current Plan section */}
          <div>
            {/* Section header: text-[10px] font-semibold uppercase tracking-wider */}
            <Skeleton className="h-2.5 w-24 mb-3" />
            <div className="space-y-2">
              <div className="flex items-center justify-between py-2">
                <Skeleton className="h-4 w-12" />
                <Skeleton className="h-4 w-16" />
              </div>
              <div className="flex items-center justify-between py-2">
                <Skeleton className="h-4 w-14" />
                <Skeleton className="h-4 w-16" />
              </div>
              <div className="flex items-center justify-between py-2">
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-4 w-20" />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
