import {
  getCombinedActivityFeed,
  groupActivities,
  enrichWithMoviePosters,
} from "@/lib/activity/club-activity-feed";
import { NewActivityItem } from "@/components/activity/NewActivityItem";
import { EmptyState } from "@/components/shared/EmptyState";
import { Clock } from "@phosphor-icons/react/dist/ssr";
import { Skeleton } from "@/components/ui/skeleton";

interface ProfileActivityFeedProps {
  userId: string;
  limit?: number;
  currentUserId?: string;
}

export async function ProfileActivityFeed({
  userId,
  limit = 5,
  currentUserId,
}: ProfileActivityFeedProps) {
  // Fetch combined activities using the same system as home page
  const activities = await getCombinedActivityFeed(userId, {
    limit: limit * 2, // Fetch extra for grouping
  });

  if (activities.length === 0) {
    return (
      <EmptyState
        icon={Clock}
        title="No activity yet"
        message="Join a club to get started!"
        variant="inline"
      />
    );
  }

  // Group activities for display
  const grouped = groupActivities(activities);

  // Enrich with movie posters from the database
  const groupedActivities = await enrichWithMoviePosters(grouped);

  // Limit to requested number
  const displayItems = groupedActivities.slice(0, limit);

  return (
    <div className="divide-y divide-[var(--border)]">
      {displayItems.map((activity, index) => (
        <NewActivityItem
          key={activity.id}
          activity={activity}
          showClubLink={true} // Always show club link on profile
          currentUserId={currentUserId}
          fixedHeight={false}
          index={index}
        />
      ))}
    </div>
  );
}

export function ProfileActivityFeedSkeleton({
  limit = 5,
  className,
}: {
  limit?: number;
  className?: string;
}) {
  return (
    <div className={`space-y-1 ${className ?? ""}`} aria-hidden="true">
      {Array.from({ length: limit }).map((_, i) => (
        <div key={i} className="flex items-center gap-2 py-1.5">
          <Skeleton className="w-6 h-6 rounded-full flex-shrink-0" />
          <Skeleton className="h-3 flex-1" />
          <Skeleton className="h-2.5 w-12 flex-shrink-0" />
        </div>
      ))}
    </div>
  );
}
