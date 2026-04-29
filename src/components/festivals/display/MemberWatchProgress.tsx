"use client";

import { useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { ClickableUserAvatar } from "@/components/ui/clickable-user-avatar";
import { userToAvatarData } from "@/lib/avatar-helpers";
import { Eye, Users } from "@phosphor-icons/react";

export interface MemberWatchProgressEntry {
  userId: string;
  displayName: string;
  avatarUrl: string | null;
  avatarIcon: string | null;
  avatarColorIndex: number | null;
  avatarBorderColorIndex: number | null;
  watchedCount: number;
}

interface MemberWatchProgressProps {
  members: MemberWatchProgressEntry[];
  totalMovies: number;
  /** Hide this user from the list (typically the viewer themselves). */
  excludeUserId?: string | null;
  initialVisible?: number;
}

const DEFAULT_VISIBLE = 5;

/**
 * Shows each other club member's watched-count for this festival.
 * Counts only — never reveals which specific movies a member has watched.
 */
export function MemberWatchProgress({
  members,
  totalMovies,
  excludeUserId,
  initialVisible = DEFAULT_VISIBLE,
}: MemberWatchProgressProps) {
  const [showAll, setShowAll] = useState(false);

  const sorted = useMemo(() => {
    const filtered = excludeUserId ? members.filter((m) => m.userId !== excludeUserId) : members;
    return filtered.slice().sort((a, b) => {
      if (b.watchedCount !== a.watchedCount) return b.watchedCount - a.watchedCount;
      return a.displayName.localeCompare(b.displayName);
    });
  }, [members, excludeUserId]);

  if (totalMovies === 0 || sorted.length === 0) return null;

  const visible = showAll ? sorted : sorted.slice(0, initialVisible);
  const hasMore = sorted.length > initialVisible;

  return (
    <Card variant="default">
      <CardHeader className="pb-2 pt-3 px-3">
        <CardTitle className="text-sm flex items-center gap-2">
          <Users className="w-4 h-4" style={{ color: "var(--primary)" }} />
          Member Watch Progress
        </CardTitle>
      </CardHeader>
      <CardContent className="px-3 pb-3 space-y-2">
        <div className="border border-[var(--border)] rounded-lg overflow-hidden bg-[var(--surface-0)]">
          {visible.map((member) => {
            const percent = totalMovies > 0 ? (member.watchedCount / totalMovies) * 100 : 0;
            return (
              <div
                key={member.userId}
                className="flex items-center gap-3 px-3 py-2 border-b border-[var(--border)] last:border-b-0"
              >
                <ClickableUserAvatar
                  entity={userToAvatarData({
                    display_name: member.displayName,
                    avatar_url: member.avatarUrl,
                    avatar_icon: member.avatarIcon,
                    avatar_color_index: member.avatarColorIndex,
                    avatar_border_color_index: member.avatarBorderColorIndex,
                  })}
                  userId={member.userId}
                  size="sm"
                />
                <span className="flex-1 text-xs font-medium text-[var(--text-primary)] truncate">
                  {member.displayName}
                </span>
                <div className="flex items-center gap-2 min-w-[120px]">
                  <Progress value={percent} className="h-1.5 flex-1" />
                  <span className="text-xs text-[var(--text-muted)] flex items-center gap-1 tabular-nums">
                    <Eye className="w-3 h-3" />
                    {member.watchedCount}/{totalMovies}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
        {hasMore && (
          <button
            type="button"
            onClick={() => setShowAll((prev) => !prev)}
            className="w-full text-center text-xs font-medium py-2 px-4 rounded-md bg-[var(--surface-1)] border border-[var(--border)] hover:border-[var(--primary)]/30 transition-colors text-[var(--text-secondary)]"
          >
            {showAll
              ? "Show fewer"
              : `Show all ${sorted.length} members (${sorted.length - initialVisible} more)`}
          </button>
        )}
      </CardContent>
    </Card>
  );
}
