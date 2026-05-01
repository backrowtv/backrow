import { Skeleton } from "@/components/ui/skeleton";

export default function PersonalizationSettingsLoading() {
  return (
    <div className="bg-[var(--background)]">
      <div className="max-w-3xl mx-auto px-4 lg:px-6 py-6">
        {/* Mobile Back Button */}
        <div className="lg:hidden mb-4">
          <Skeleton className="h-8 w-24 rounded-md" />
        </div>

        {/* Header - Hidden on mobile */}
        <div className="hidden lg:block mb-6">
          <Skeleton className="h-5 w-32 mb-1.5" />
          <Skeleton className="h-3 w-52" />
        </div>

        <div className="space-y-6">
          {/* Personalization Form */}
          <div className="rounded-lg bg-[var(--surface-1)] p-4 space-y-4">
            <Skeleton className="h-5 w-40 mb-2" />
            <div>
              <Skeleton className="h-3.5 w-28 mb-2" />
              <Skeleton className="h-9 w-full rounded-md" />
            </div>
            <Skeleton className="h-9 w-24 rounded-md" />
          </div>

          {/* Rubric Selector */}
          <div className="rounded-lg bg-[var(--surface-1)] p-4 space-y-4">
            <Skeleton className="h-5 w-32 mb-2" />
            <Skeleton className="h-3 w-56" />
            <div className="space-y-2">
              {[1, 2, 3].map((i) => (
                <div key={i} className="flex items-center gap-3 py-2">
                  <Skeleton className="w-4 h-4 rounded-full" />
                  <Skeleton className="h-3.5 w-32" />
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
