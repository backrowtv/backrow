import { Skeleton } from "@/components/ui/skeleton";

export default function DisplaySettingsLoading() {
  return (
    <div className="bg-[var(--background)]">
      <div className="max-w-3xl mx-auto px-4 lg:px-6 py-6 space-y-4">
        {/* Mobile Back Button placeholder */}
        <div className="md:hidden">
          <Skeleton className="h-4 w-16" />
        </div>

        {/* Header - Hidden on mobile since TopNav shows "Display Settings" */}
        <div className="hidden md:block">
          <Skeleton className="h-6 w-36" />
        </div>

        {/* Navigation section */}
        <div className="p-3 rounded-xl bg-[var(--surface-1)] border border-[var(--border)]">
          <Skeleton className="h-4 w-20 mb-2" />
          {/* Tabs placeholder */}
          <Skeleton className="h-9 w-full rounded-lg mb-3" />
          {/* Toggle rows */}
          <div className="space-y-2">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="flex items-center justify-between py-2">
                <Skeleton className="h-4 w-28" />
                <Skeleton className="h-6 w-11 rounded-full" />
              </div>
            ))}
          </div>
        </div>

        {/* Movie Page Links section */}
        <div className="p-3 rounded-xl bg-[var(--surface-1)] border border-[var(--border)]">
          <Skeleton className="h-4 w-28 mb-2" />
          <div className="space-y-2">
            {[1, 2, 3].map((i) => (
              <div key={i} className="flex items-center justify-between py-2">
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-6 w-11 rounded-full" />
              </div>
            ))}
          </div>
        </div>

        {/* Discussions section */}
        <div className="p-3 rounded-xl bg-[var(--surface-1)] border border-[var(--border)]">
          <Skeleton className="h-4 w-24 mb-2" />
          <div className="space-y-2">
            {[1, 2].map((i) => (
              <div key={i} className="flex items-center justify-between py-2">
                <Skeleton className="h-4 w-36" />
                <Skeleton className="h-6 w-11 rounded-full" />
              </div>
            ))}
          </div>
        </div>

        {/* Appearance section */}
        <div className="p-3 rounded-xl bg-[var(--surface-1)] border border-[var(--border)]">
          <Skeleton className="h-4 w-24 mb-2" />

          {/* Theme row */}
          <div className="flex items-center justify-between py-2">
            <Skeleton className="h-4 w-12" />
            <Skeleton className="h-8 w-20 rounded-md" />
          </div>

          <div className="border-t border-[var(--border)]" />

          {/* Color theme selector */}
          <div className="py-2">
            <Skeleton className="h-4 w-24 mb-2" />
            <div className="flex gap-2">
              {[1, 2, 3, 4].map((i) => (
                <Skeleton key={i} className="h-8 w-8 rounded-full" />
              ))}
            </div>
          </div>

          <div className="border-t border-[var(--border)]" />

          {/* Time format row */}
          <div className="flex items-center justify-between py-2">
            <Skeleton className="h-4 w-24" />
            <div className="flex gap-1">
              <Skeleton className="h-7 w-14 rounded-md" />
              <Skeleton className="h-7 w-14 rounded-md" />
            </div>
          </div>

          <div className="border-t border-[var(--border)]" />

          {/* Date format row */}
          <div className="flex items-center justify-between py-2">
            <Skeleton className="h-4 w-24" />
            <div className="flex gap-1">
              <Skeleton className="h-7 w-20 rounded-md" />
              <Skeleton className="h-7 w-20 rounded-md" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
