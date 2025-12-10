"use client";

import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { ClickableUserAvatar } from "@/components/ui/clickable-user-avatar";
import { userToAvatarData } from "@/lib/avatar-helpers";
import { Badge } from "@/components/ui/badge";
import { DateDisplay } from "@/components/ui/date-display";
import { PollDetailModal } from "./PollDetailModal";
import type { PollWithVotes } from "@/app/actions/clubs/polls";
import { ChartBar, Users, Clock, CheckCircle } from "@phosphor-icons/react";
import { cn } from "@/lib/utils";

interface PastPollsListProps {
  polls: PollWithVotes[];
  emptyMessage?: string;
  className?: string;
}

export function PastPollsList({
  polls,
  emptyMessage = "No past polls",
  className,
}: PastPollsListProps) {
  const [selectedPoll, setSelectedPoll] = useState<PollWithVotes | null>(null);

  if (polls.length === 0) {
    return (
      <Card className={cn("border-dashed", className)}>
        <CardContent className="p-8 text-center">
          <ChartBar className="h-10 w-10 mx-auto mb-3 text-[var(--text-muted)] opacity-50" />
          <p className="text-sm text-[var(--text-muted)]">{emptyMessage}</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <div className={cn("grid gap-3 md:grid-cols-2", className)}>
        {polls.map((poll) => {
          // Find winning option
          const winningOptionIndex = poll.votes.reduce(
            (maxIdx, vote, idx, arr) => (vote.count > arr[maxIdx].count ? idx : maxIdx),
            0
          );
          const winningOption = poll.options[winningOptionIndex];
          const winningVotes = poll.votes[winningOptionIndex]?.count || 0;

          return (
            <Card
              key={poll.id}
              variant="elevated"
              className="group cursor-pointer transition-all duration-200 hover:border-[var(--primary)]/30"
              onClick={() => setSelectedPoll(poll)}
            >
              <CardContent className="p-4">
                {/* Header */}
                <div className="flex items-start justify-between gap-3 mb-3">
                  <div className="flex-1 min-w-0">
                    <h4 className="font-semibold text-sm text-[var(--text-primary)] line-clamp-2 group-hover:text-[var(--primary)] transition-colors">
                      {poll.question}
                    </h4>
                  </div>
                  <Badge variant="outline" className="text-xs shrink-0 text-[var(--text-muted)]">
                    <Clock className="h-3 w-3 mr-1" />
                    Ended
                  </Badge>
                </div>

                {/* Winner */}
                {poll.total_votes > 0 && (
                  <div className="flex items-center gap-2 mb-3 p-2 rounded-lg bg-[var(--success)]/10 border border-[var(--success)]/20">
                    <CheckCircle className="h-4 w-4 text-[var(--success)] shrink-0" weight="fill" />
                    <span className="text-xs text-[var(--success)] truncate flex-1">
                      {winningOption}
                    </span>
                    <span className="text-xs text-[var(--success)]/70 shrink-0">
                      {winningVotes} vote{winningVotes !== 1 ? "s" : ""}
                    </span>
                  </div>
                )}

                {/* Footer */}
                <div className="flex items-center justify-between text-xs text-[var(--text-muted)]">
                  <div className="flex items-center gap-2">
                    {poll.user && (
                      <>
                        <ClickableUserAvatar
                          entity={userToAvatarData(poll.user)}
                          userId={poll.user_id}
                          size="tiny"
                        />
                        <span className="truncate max-w-[80px]">
                          {poll.user.display_name || "Member"}
                        </span>
                      </>
                    )}
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="flex items-center gap-1">
                      <Users className="h-3 w-3" />
                      {poll.total_votes}
                    </span>
                    {poll.expires_at && <DateDisplay date={poll.expires_at} format="relative" />}
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Detail Modal */}
      <PollDetailModal
        poll={selectedPoll}
        open={selectedPoll !== null}
        onOpenChange={(open) => !open && setSelectedPoll(null)}
      />
    </>
  );
}
