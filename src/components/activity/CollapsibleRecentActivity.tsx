import Link from "next/link";
import { CaretRight } from "@phosphor-icons/react/dist/ssr";
import type { GroupedActivity } from "@/lib/activity/club-activity-feed";
import { NewActivityItem } from "./NewActivityItem";
import { Skeleton } from "@/components/ui/skeleton";

interface CollapsibleRecentActivityProps {
  activities: GroupedActivity[];
  clubSlug: string;
  /** Club ID (UUID) for the activity filter link */
  clubId: string;
  clubName?: string;
  /** @deprecated No longer used - sections are always expanded */
  defaultExpanded?: boolean;
  /** Maximum number of items to show */
  limit?: number;
  currentUserId?: string;
}

export function CollapsibleRecentActivity({
  activities,
  clubSlug: _clubSlug,
  clubId,
  limit = 5,
  currentUserId,
}: CollapsibleRecentActivityProps) {
  const displayActivities = activities.slice(0, limit);

  return (
    <div>
      <div className="flex items-center justify-between py-2 gap-2">
        <h3 className="text-sm font-semibold text-[var(--club-accent,var(--text-primary))] uppercase tracking-wide">
          Activity
        </h3>
        <Link
          href={`/activity?clubs=${clubId}`}
          className="text-sm text-[var(--club-accent,var(--primary))] transition-colors hover:underline flex items-center gap-0.5"
        >
          All
          <CaretRight className="w-3 h-3" />
        </Link>
      </div>

      {displayActivities.length > 0 ? (
        <div className="divide-y divide-[var(--border)] pt-1">
          {displayActivities.map((activity, index) => (
            <NewActivityItem
              key={activity.id}
              activity={activity}
              showClubLink={false}
              preferMoviePoster={true}
              currentUserId={currentUserId}
              fixedHeight={false}
              index={index}
            />
          ))}
        </div>
      ) : (
        <p className="text-sm text-[var(--text-muted)] text-center py-4">No recent activity</p>
      )}
    </div>
  );
}

export function RecentActivitySkeleton({
  limit = 5,
  className,
}: {
  limit?: number;
  className?: string;
}) {
  return (
    <div className={className} aria-hidden="true">
      <div className="flex items-center justify-between py-2 gap-2">
        <Skeleton className="h-4 w-16" />
        <Skeleton className="h-4 w-8" />
      </div>
      <div className="pt-1 space-y-2">
        {Array.from({ length: limit }).map((_, i) => (
          <div key={i} className="flex items-center gap-2.5 py-2 px-2">
            <div className="w-7 flex-shrink-0 flex items-center justify-center">
              <Skeleton className="w-[19px] h-7 rounded-sm" />
            </div>
            <div className="flex-1 min-w-0 space-y-1">
              <Skeleton className="h-3 w-full" />
              <Skeleton className="h-2.5 w-20" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
