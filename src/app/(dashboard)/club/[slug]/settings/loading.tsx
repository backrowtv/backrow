import { Skeleton } from "@/components/ui/skeleton";

export default function SettingsLoading() {
  return (
    <>
      {/* ClubNavigation placeholder */}
      <div className="h-10 bg-[var(--surface-1)]" />

      <div className="bg-[var(--background)]">
        <div className="max-w-3xl mx-auto px-4 lg:px-6 py-6">
          {/* Header - Hidden on mobile */}
          <div className="hidden lg:block mb-6">
            <Skeleton className="h-5 w-20 mb-1.5" />
            <Skeleton className="h-3 w-48" />
          </div>

          {/* Menu Items */}
          <div className="space-y-1">
            {[1, 2, 3].map((i) => (
              <div key={i} className="flex items-center gap-3 py-3 px-3 -mx-3 rounded-lg">
                <Skeleton className="w-10 h-10 rounded-lg flex-shrink-0" />
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
    </>
  );
}
