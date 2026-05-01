import { Skeleton } from "@/components/ui/skeleton";

export default function AnnouncementsLoading() {
  return (
    <>
      {/* ClubNavigation placeholder */}
      <div className="h-10 bg-[var(--surface-1)]" />

      <div className="bg-[var(--background)]">
        <div className="max-w-3xl mx-auto px-4 lg:px-6 py-6">
          {/* Mobile Back Button */}
          <div className="lg:hidden mb-4">
            <Skeleton className="h-8 w-24 rounded-md" />
          </div>

          {/* Header - Hidden on mobile */}
          <div className="hidden lg:block mb-6">
            <Skeleton className="h-5 w-32 mb-1.5" />
            <Skeleton className="h-3 w-48" />
          </div>

          <div className="space-y-6">
            {/* Editor area */}
            <div className="rounded-xl bg-[var(--surface-1)] p-4">
              <div className="flex gap-2 mb-3">
                <Skeleton className="h-8 w-20 rounded-md" />
                <Skeleton className="h-8 w-20 rounded-md" />
              </div>
              <Skeleton className="h-24 w-full rounded-lg" />
              <Skeleton className="h-9 w-24 rounded-md mt-3" />
            </div>

            {/* Recent Announcements */}
            <div className="space-y-4">
              <Skeleton className="h-4 w-40" />
              <div className="bg-[var(--surface-1)] rounded-lg p-4">
                <div className="space-y-4">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="py-3">
                      <Skeleton className="h-4 w-full mb-2" />
                      <Skeleton className="h-3 w-3/4 mb-1" />
                      <Skeleton className="h-3 w-20" />
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
