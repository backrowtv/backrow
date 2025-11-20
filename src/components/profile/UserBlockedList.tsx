"use client";

import { useState, useEffect, useTransition } from "react";
import { Avatar } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Text } from "@/components/ui/typography";
import { getBlockedUsers, unblockUser, type BlockedUser } from "@/app/actions/profile";
import { UserMinus, CircleNotch } from "@phosphor-icons/react";
import toast from "react-hot-toast";

export function UserBlockedList() {
  const [blockedUsers, setBlockedUsers] = useState<BlockedUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [isPending, startTransition] = useTransition();
  const [unblockingId, setUnblockingId] = useState<string | null>(null);

  useEffect(() => {
    loadBlockedUsers();
  }, []);

  const loadBlockedUsers = async () => {
    setLoading(true);
    const result = await getBlockedUsers();
    if (result.data) {
      setBlockedUsers(result.data);
    } else if ("error" in result && result.error) {
      toast.error(result.error);
    }
    setLoading(false);
  };

  const handleUnblock = (userId: string) => {
    setUnblockingId(userId);
    startTransition(async () => {
      const result = await unblockUser(userId);
      if (result.success) {
        toast.success("User unblocked");
        setBlockedUsers((prev) => prev.filter((u) => u.blocked_id !== userId));
      } else if ("error" in result && result.error) {
        toast.error(result.error);
      }
      setUnblockingId(null);
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <CircleNotch className="h-5 w-5 animate-spin text-[var(--text-muted)]" />
      </div>
    );
  }

  if (blockedUsers.length === 0) {
    return (
      <div className="text-center py-8">
        <div className="w-12 h-12 rounded-full bg-[var(--surface-2)] flex items-center justify-center mx-auto mb-3">
          <UserMinus className="h-6 w-6 text-[var(--text-muted)]" />
        </div>
        <Text size="sm" muted>
          You haven&apos;t blocked anyone
        </Text>
        <Text size="tiny" muted className="mt-1">
          Blocked users won&apos;t be able to see your profile or interact with you
        </Text>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <Text size="sm" className="font-medium text-[var(--text-primary)]">
        Blocked Users ({blockedUsers.length})
      </Text>
      <div className="space-y-2">
        {blockedUsers.map((block) => {
          const user = block.user;
          if (!user) return null;

          return (
            <div
              key={block.id}
              className="flex items-center justify-between p-3 rounded-lg bg-[var(--surface-1)] border border-[var(--border)]"
            >
              <div className="flex items-center gap-3">
                <Avatar
                  src={user.avatar_url || undefined}
                  alt={user.display_name}
                  fallback={user.display_name?.[0] || "U"}
                  size="sm"
                />
                <div>
                  <Text size="sm" className="font-medium">
                    {user.display_name}
                  </Text>
                  <Text size="tiny" muted>
                    @{user.username}
                  </Text>
                </div>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleUnblock(block.blocked_id)}
                disabled={isPending && unblockingId === block.blocked_id}
              >
                {isPending && unblockingId === block.blocked_id ? (
                  <CircleNotch className="h-3 w-3 animate-spin" />
                ) : (
                  "Unblock"
                )}
              </Button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
