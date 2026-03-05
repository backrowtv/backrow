import Link from "next/link";
import { CaretRight } from "@phosphor-icons/react/dist/ssr";
import type { GroupedActivity } from "@/lib/activity/club-activity-feed";
import { NewActivityItem } from "./NewActivityItem";

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
