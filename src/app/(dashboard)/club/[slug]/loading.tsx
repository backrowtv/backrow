import { SkeletonRegion, Skeleton } from "@/components/ui/skeleton";
import { UnifiedClubCardSkeleton } from "@/components/clubs/UnifiedClubCard";
import { FestivalHeroCardSkeleton } from "@/components/festivals/display/FestivalHeroCard";
import { CollapsibleThemePoolSkeleton } from "@/components/festivals/themes/CollapsibleThemePool";
import { CollapsibleMoviePoolSkeleton } from "@/components/festivals/movies/CollapsibleMoviePool";
import { RecentDiscussionsSkeleton } from "@/components/discussions/CollapsibleRecentDiscussions";
import { RecentActivitySkeleton } from "@/components/activity/CollapsibleRecentActivity";
import { ClubResourcesSkeleton } from "@/components/clubs/CollapsibleClubResources";
import { UpcomingDatesSkeleton } from "@/components/calendar/CollapsibleUpcomingDates";

function QuickLinkRowSkeleton() {
  return (
    <div className="flex items-center gap-3 p-3 rounded-lg bg-[var(--surface-1)]">
      <Skeleton className="w-9 h-9 rounded-lg flex-shrink-0" />
      <div className="flex-1 space-y-1">
        <Skeleton className="h-4 w-16" />
        <Skeleton className="h-3 w-40" />
      </div>
      <Skeleton className="w-4 h-4 flex-shrink-0" />
    </div>
  );
}

export default function ClubLoading() {
  return (
    <SkeletonRegion label="Loading club home">
      <div className="relative">
        <div className="relative z-10 max-w-7xl mx-auto px-4 lg:px-6 py-4 lg:py-6">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 lg:gap-6">
            {/* Left Sidebar — desktop only */}
            <aside className="hidden lg:block lg:col-span-3 space-y-4">
              <UnifiedClubCardSkeleton />
              <CollapsibleThemePoolSkeleton />
              <CollapsibleMoviePoolSkeleton />
            </aside>

            {/* Main Column */}
            <div className="lg:col-span-6 space-y-4 lg:space-y-6">
              {/* Mobile club header */}
              <UnifiedClubCardSkeleton collapsed className="lg:hidden" />

              {/* Festival hero — defaults to nomination phase, the most common active state */}
              <FestivalHeroCardSkeleton phase="nomination" />

              {/* Discussions */}
              <RecentDiscussionsSkeleton count={3} />

              {/* Mobile-only sections that live in the right sidebar on desktop */}
              <UpcomingDatesSkeleton className="lg:hidden" />
              <CollapsibleThemePoolSkeleton className="lg:hidden" />
              <CollapsibleMoviePoolSkeleton className="lg:hidden" />
              <RecentActivitySkeleton className="lg:hidden" />
              <ClubResourcesSkeleton className="lg:hidden" />

              {/* Quick Links: Settings + optional Manage (show 2 as common case) */}
              <section className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-4 mt-4">
                <QuickLinkRowSkeleton />
                <QuickLinkRowSkeleton />
              </section>
            </div>

            {/* Right Sidebar — desktop only */}
            <aside className="hidden lg:block lg:col-span-3 space-y-4">
              <UpcomingDatesSkeleton />
              <RecentActivitySkeleton />
              <ClubResourcesSkeleton />
            </aside>
          </div>
        </div>
      </div>
    </SkeletonRegion>
  );
}
