import { Skeleton } from "@/components/ui/skeleton";

export default function ClubManagementLoading() {
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
            <Skeleton className="h-5 w-36 mb-1.5" />
            <Skeleton className="h-3 w-60" />
          </div>

          <div className="space-y-6">
            {/* Member Permissions */}
            <section className="space-y-4">
              <Skeleton className="h-5 w-40" />
              <Skeleton className="h-3 w-52" />
              <div className="flex items-center justify-between py-3">
                <div>
                  <Skeleton className="h-4 w-36 mb-1" />
                  <Skeleton className="h-3 w-56" />
                </div>
                <Skeleton className="h-6 w-11 rounded-full" />
              </div>
            </section>

            {/* Word Blacklist */}
            <section className="pt-6 mt-6 space-y-4">
              <Skeleton className="h-5 w-28" />
              <Skeleton className="h-3 w-64" />
              <Skeleton className="h-9 w-full rounded-md" />
              <div className="flex flex-wrap gap-2">
                {[1, 2, 3].map((i) => (
                  <Skeleton key={i} className="h-7 w-16 rounded-full" />
                ))}
              </div>
            </section>

            {/* Blocked Users */}
            <section className="pt-6 mt-6 space-y-4">
              <Skeleton className="h-5 w-28" />
              <Skeleton className="h-3 w-64" />
              <Skeleton className="h-20 w-full rounded-lg" />
            </section>

            {/* Transfer Ownership */}
            <section className="pt-6 mt-6 space-y-4">
              <Skeleton className="h-5 w-40" />
              <Skeleton className="h-9 w-full rounded-md" />
              <Skeleton className="h-9 w-32 rounded-md" />
            </section>

            {/* Archive Club */}
            <section className="pt-6 mt-6 space-y-4">
              <Skeleton className="h-5 w-24" />
              <Skeleton className="h-9 w-32 rounded-md" />
            </section>

            {/* Delete Club */}
            <section className="pt-6 mt-6 space-y-4">
              <Skeleton className="h-5 w-24" />
              <Skeleton className="h-9 w-32 rounded-md" />
            </section>
          </div>
        </div>
      </div>
    </>
  );
}
