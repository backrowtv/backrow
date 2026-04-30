"use client";

import { useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { ClickableUserAvatar } from "@/components/ui/clickable-user-avatar";
import { userToAvatarData } from "@/lib/avatar-helpers";
import { Eye, Users, CaretLeft, CaretRight } from "@phosphor-icons/react";

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
}

const PAGE_SIZE = 5;

/**
 * Shows each other club member's watched-count for this festival.
 * Counts only — never reveals which specific movies a member has watched.
 */
export function MemberWatchProgress({
  members,
  totalMovies,
  excludeUserId,
}: MemberWatchProgressProps) {
  const [currentPage, setCurrentPage] = useState(1);

  const sorted = useMemo(() => {
    const filtered = excludeUserId ? members.filter((m) => m.userId !== excludeUserId) : members;
    return filtered.slice().sort((a, b) => {
      if (b.watchedCount !== a.watchedCount) return b.watchedCount - a.watchedCount;
      return a.displayName.localeCompare(b.displayName);
    });
  }, [members, excludeUserId]);

  if (totalMovies === 0 || sorted.length === 0) return null;

  const totalPages = Math.max(1, Math.ceil(sorted.length / PAGE_SIZE));
  const safePage = Math.min(currentPage, totalPages);
  const visible = sorted.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);

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
        {totalPages > 1 && (
          <div className="flex items-center justify-between gap-2 pt-1">
            <button
              type="button"
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              disabled={safePage === 1}
              className="inline-flex items-center gap-1 text-xs font-medium px-2.5 py-1.5 rounded-md bg-[var(--surface-1)] border border-[var(--border)] text-[var(--text-secondary)] hover:border-[var(--primary)]/30 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
              aria-label="Previous page"
            >
              <CaretLeft className="w-3 h-3" weight="bold" />
              Prev
            </button>
            <span className="text-xs text-[var(--text-muted)] tabular-nums">
              Page {safePage} of {totalPages}
            </span>
            <button
              type="button"
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              disabled={safePage === totalPages}
              className="inline-flex items-center gap-1 text-xs font-medium px-2.5 py-1.5 rounded-md bg-[var(--surface-1)] border border-[var(--border)] text-[var(--text-secondary)] hover:border-[var(--primary)]/30 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
              aria-label="Next page"
            >
              Next
              <CaretRight className="w-3 h-3" weight="bold" />
            </button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
