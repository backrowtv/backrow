import { Skeleton } from "@/components/ui/skeleton";

export default function GeneralSettingsLoading() {
  return (
    <div className="bg-[var(--background)]">
      <div className="max-w-3xl mx-auto px-4 lg:px-6 py-6">
        {/* Mobile Back Button */}
        <div className="md:hidden mb-4">
          <Skeleton className="h-8 w-24 rounded-md" />
        </div>

        {/* Header - Hidden on mobile */}
        <div className="hidden md:block mb-6">
          <Skeleton className="h-5 w-36 mb-1.5" />
          <Skeleton className="h-3 w-48" />
        </div>

        {/* Settings Sections */}
        <div className="space-y-1">
          {/* Club Profile Section */}
          <div className="rounded-lg bg-[var(--surface-1)]">
            <div className="flex items-center gap-3 p-4 cursor-pointer">
              <Skeleton className="w-5 h-5 rounded" />
              <div className="flex-1">
                <Skeleton className="h-4 w-24 mb-1" />
                <Skeleton className="h-3 w-48" />
              </div>
              <Skeleton className="w-4 h-4" />
            </div>
            <div className="p-4">
              <div className="space-y-4">
                <div>
                  <Skeleton className="h-3.5 w-20 mb-2" />
                  <Skeleton className="h-9 w-full rounded-md" />
                </div>
                <div>
                  <Skeleton className="h-3.5 w-24 mb-2" />
                  <Skeleton className="h-20 w-full rounded-md" />
                </div>
                <div>
                  <Skeleton className="h-3.5 w-16 mb-2" />
                  <Skeleton className="h-9 w-full rounded-md" />
                </div>
                <Skeleton className="h-9 w-24 rounded-md" />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
