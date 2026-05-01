import { SkeletonRegion, Skeleton } from "@/components/ui/skeleton";
import { RecentlyWatchedSkeleton } from "@/components/profile/RecentlyWatched";
import { ProfileActivityFeedSkeleton } from "@/components/profile/ProfileActivityFeed";
import { FutureNominationsSkeleton } from "@/components/profile/FutureNominations";

function SectionHeaderSkeleton({ labelWidth }: { labelWidth: string }) {
  return (
    <div className="flex items-center justify-between mb-3">
      <Skeleton className={`h-5 ${labelWidth}`} />
      <Skeleton className="h-4 w-6" />
    </div>
  );
}

function QuickLinkRowSkeleton() {
  return (
    <div className="flex items-center gap-3 p-3 rounded-lg bg-[var(--surface-1)]">
      <div className="flex-1 min-w-0 space-y-1">
        <Skeleton className="h-4 w-20" />
        <Skeleton className="h-3 w-48" />
      </div>
      <Skeleton className="w-4 h-4 flex-shrink-0" />
    </div>
  );
}

export default function ProfileLoading() {
  return (
    <SkeletonRegion label="Loading profile">
      <div className="max-w-3xl mx-auto">
        <div className="space-y-6">
          <section>
            <RecentlyWatchedSkeleton count={6} />
          </section>

          <section>
            <SectionHeaderSkeleton labelWidth="w-28" />
            <ProfileActivityFeedSkeleton limit={5} />
          </section>

          <section>
            <SectionHeaderSkeleton labelWidth="w-36" />
            <FutureNominationsSkeleton count={4} />
          </section>

          {/* Quick Links — real page renders 3 (Settings, Display Case, Stats) */}
          <section className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-4 mt-4">
            <QuickLinkRowSkeleton />
            <QuickLinkRowSkeleton />
            <QuickLinkRowSkeleton />
          </section>
        </div>
      </div>
    </SkeletonRegion>
  );
}
