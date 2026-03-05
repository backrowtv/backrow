"use client";

import { useState, useTransition } from "react";
import toast from "react-hot-toast";
import { NewActivityItem } from "./NewActivityItem";
import { ConfirmationDialog } from "@/components/ui/confirmation-dialog";
import { hideActivity } from "@/app/actions/activity";
import type { GroupedActivity } from "@/lib/activity/club-activity-feed";

interface ActivityFeedClientProps {
  activities: GroupedActivity[];
  currentUserId: string;
}

export function ActivityFeedClient({ activities, currentUserId }: ActivityFeedClientProps) {
  const [hiddenIds, setHiddenIds] = useState<Set<string>>(new Set());
  const [pendingHideId, setPendingHideId] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const visibleActivities = activities.filter((a) => !hiddenIds.has(a.id));

  const handleHideRequest = (activityId: string) => {
    setPendingHideId(activityId);
  };

  const handleConfirmHide = () => {
    if (!pendingHideId) return;

    const activityId = pendingHideId;
    setPendingHideId(null);

    // Optimistically hide
    setHiddenIds((prev) => new Set(prev).add(activityId));

    startTransition(async () => {
      const result = await hideActivity(activityId);

      if ("error" in result) {
        // Revert on failure
        setHiddenIds((prev) => {
          const next = new Set(prev);
          next.delete(activityId);
          return next;
        });
        toast.error(result.error);
        return;
      }

      toast("Removed from feed", {
        style: {
          background: "var(--surface-2)",
          color: "var(--text-primary)",
          border: "1px solid var(--border)",
        },
      });
    });
  };

  return (
    <>
      {visibleActivities.length === 0 && activities.length > 0 ? (
        <div className="text-center py-12">
          <p className="text-[var(--text-muted)]">All activity items on this page are hidden.</p>
        </div>
      ) : (
        visibleActivities.map((activity) => (
          <NewActivityItem
            key={activity.id}
            activity={activity}
            showClubLink={true}
            currentUserId={currentUserId}
            onHide={handleHideRequest}
          />
        ))
      )}

      <ConfirmationDialog
        open={pendingHideId !== null}
        onOpenChange={(open) => {
          if (!open) setPendingHideId(null);
        }}
        title="Remove from feed?"
        description="This will permanently remove this item from your activity feed. This cannot be undone."
        confirmText="Remove"
        variant="danger"
        isLoading={isPending}
        onConfirm={handleConfirmHide}
      />
    </>
  );
}
