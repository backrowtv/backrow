import { ActivityItem } from "./ActivityItem";
import { Database } from "@/types/database";
import { EmptyState } from "@/components/shared/EmptyState";
import { Clock } from "@phosphor-icons/react";

type ActivityLog = Database["public"]["Tables"]["activity_log"]["Row"];
type User = Database["public"]["Tables"]["users"]["Row"];

interface ActivityFeedProps {
  activities: (ActivityLog & {
    users: User | null;
  })[];
  currentUserId?: string;
}

export function ActivityFeed({ activities, currentUserId }: ActivityFeedProps) {
  if (activities.length === 0) {
    return (
      <EmptyState
        icon={Clock}
        title="No activity yet"
        message="Activity from your club will appear here."
        variant="inline"
      />
    );
  }

  return (
    <div className="divide-y divide-[var(--border)]">
      {activities.map((activity) => (
        <ActivityItem key={activity.id} activity={activity} currentUserId={currentUserId} />
      ))}
    </div>
  );
}
