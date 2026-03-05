import { Skeleton } from "@/components/ui/skeleton";
import {
  getCombinedActivityFeed,
  groupActivities,
  enrichWithMoviePosters,
} from "@/lib/activity/club-activity-feed";
import { cn } from "@/lib/utils";
import { NewActivityItem } from "@/components/activity/NewActivityItem";

// ============================================
// SKELETON
// ============================================

function ActivitySkeleton() {
  return (
    <div className="flex items-start gap-2.5 py-2 px-2 -mx-2">
      <Skeleton className="w-8 h-8 rounded-full flex-shrink-0" />
      <div className="flex-1 space-y-1.5">
        <Skeleton className="h-3.5 w-full" />
        <Skeleton className="h-2.5 w-1/3" />
      </div>
      <Skeleton className="w-8 h-12 rounded flex-shrink-0" />
    </div>
  );
}

// ============================================
// EMPTY STATE
// ============================================

function EmptyFeed() {
  return <p className="text-sm text-[var(--text-muted)] text-center py-4">No recent activity</p>;
}

// ============================================
// MAIN COMPONENT
// ============================================

interface ClubActivityFeedProps {
  userId: string;
  limit?: number;
  className?: string;
  clubId?: string;
}

export async function ClubActivityFeed({
  userId,
  limit = 10,
  className,
  clubId,
}: ClubActivityFeedProps) {
  // Fetch combined activities (both club and member)
  const activities = await getCombinedActivityFeed(userId, {
    limit: limit * 5, // Fetch extra for grouping (5x to ensure enough items after consolidation)
    clubId,
  });

  // Group activities for display
  const grouped = groupActivities(activities);

  // Enrich with movie posters from the database
  const groupedActivities = await enrichWithMoviePosters(grouped);

  if (groupedActivities.length === 0) {
    return <EmptyFeed />;
  }

  // Show limited items (default 10 for home page)
  const displayItems = groupedActivities.slice(0, limit);

  return (
    <div className={cn("divide-y divide-[var(--border)]", className)}>
      {displayItems.map((activity, index) => (
        <NewActivityItem
          key={activity.id}
          activity={activity}
          showClubLink={!clubId} // Hide club link if we're already on a club page
          currentUserId={userId}
          fixedHeight={false}
          index={index}
        />
      ))}
    </div>
  );
}

// ============================================
// SKELETON FOR SUSPENSE
// ============================================

export function ClubActivityFeedSkeleton() {
  return (
    <div className="space-y-0">
      {[1, 2, 3, 4, 5, 6].map((i) => (
        <ActivitySkeleton key={i} />
      ))}
    </div>
  );
}
