"use client";

import { useState, useEffect, useTransition } from "react";
import { Modal } from "@/components/ui/modal";
import { ClickableUserAvatar } from "@/components/ui/clickable-user-avatar";
import { userToAvatarData } from "@/lib/avatar-helpers";
import { Badge } from "@/components/ui/badge";
import { DateDisplay } from "@/components/ui/date-display";
import { Spinner } from "@/components/ui/spinner";
import { getPollVoters, type PollWithVotes, type PollVoter } from "@/app/actions/clubs/polls";
import {
  ChartBar,
  CheckCircle,
  Users,
  Clock,
  CaretDown,
  CaretUp,
  EyeSlash,
  CheckSquare,
} from "@phosphor-icons/react";
import { cn } from "@/lib/utils";

interface PollDetailModalProps {
  poll: PollWithVotes | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function PollDetailModal({ poll, open, onOpenChange }: PollDetailModalProps) {
  const [voters, setVoters] = useState<PollVoter[]>([]);
  const [isPending, startTransition] = useTransition();
  const [expandedOptions, setExpandedOptions] = useState<Set<number>>(new Set());
  const [isAnonymous, setIsAnonymous] = useState(false);

  useEffect(() => {
    if (open && poll) {
      startTransition(async () => {
        const result = await getPollVoters(poll.id);
        if (result.data) {
          setVoters(result.data);
        }
        setIsAnonymous(result.isAnonymous || false);
      });
    } else {
      setVoters([]);
      setExpandedOptions(new Set());
      setIsAnonymous(false);
    }
  }, [open, poll]);

  if (!poll) return null;

  const isExpired = poll.expires_at && new Date(poll.expires_at) < new Date();
  const winningOptionIndex = poll.votes.reduce(
    (maxIdx, vote, idx, arr) => (vote.count > arr[maxIdx].count ? idx : maxIdx),
    0
  );

  const toggleOption = (index: number) => {
    setExpandedOptions((prev) => {
      const next = new Set(prev);
      if (next.has(index)) {
        next.delete(index);
      } else {
        next.add(index);
      }
      return next;
    });
  };

  const getVotersForOption = (optionIndex: number) => {
    return voters.filter((v) => v.option_index === optionIndex);
  };

  return (
    <Modal
      open={open}
      onOpenChange={onOpenChange}
      title={poll.question}
      description={
        <div className="flex items-center gap-2 flex-wrap">
          {isExpired ? (
            <Badge variant="outline" className="text-[var(--text-muted)]">
              <Clock className="h-3 w-3 mr-1" />
              Ended <DateDisplay date={poll.expires_at!} format="relative" />
            </Badge>
          ) : poll.expires_at ? (
            <Badge variant="secondary">
              <Clock className="h-3 w-3 mr-1" />
              Ends <DateDisplay date={poll.expires_at} format="relative" />
            </Badge>
          ) : (
            <Badge variant="secondary">No expiration</Badge>
          )}
          {poll.allow_multiple && (
            <Badge variant="secondary">
              <CheckSquare className="h-3 w-3 mr-1" />
              Multi-select
            </Badge>
          )}
          {poll.is_anonymous && (
            <Badge variant="outline" className="text-[var(--text-muted)]">
              <EyeSlash className="h-3 w-3 mr-1" />
              Anonymous
            </Badge>
          )}
          <span className="text-sm text-[var(--text-muted)]">
            {poll.total_votes} vote{poll.total_votes !== 1 ? "s" : ""}
          </span>
        </div>
      }
      size="lg"
    >
      <div className="space-y-4">
        {/* Creator Info */}
        {poll.user && (
          <div className="flex items-center gap-2 pb-3 border-b border-[var(--border)]">
            <ClickableUserAvatar
              entity={userToAvatarData(poll.user)}
              userId={poll.user?.id}
              size="sm"
            />
            <div className="text-sm">
              <span className="text-[var(--text-muted)]">Created by </span>
              <span className="font-medium text-[var(--text-primary)]">
                {poll.user.display_name || "Member"}
              </span>
              <span className="text-[var(--text-muted)]"> • </span>
              <DateDisplay date={poll.created_at} format="relative" />
            </div>
          </div>
        )}

        {/* Results */}
        <div className="space-y-3">
          <div className="flex items-center gap-2 text-sm font-medium text-[var(--text-primary)]">
            <ChartBar className="h-4 w-4" />
            Results
          </div>

          {poll.options.map((option, index) => {
            const voteData = poll.votes.find((v) => v.option_index === index);
            const count = voteData?.count || 0;
            const percentage = poll.total_votes > 0 ? (count / poll.total_votes) * 100 : 0;
            const isWinner = isExpired && index === winningOptionIndex && poll.total_votes > 0;
            const isExpanded = expandedOptions.has(index);
            const optionVoters = getVotersForOption(index);

            return (
              <div key={index} className="space-y-2">
                <button
                  onClick={() => toggleOption(index)}
                  className={cn(
                    "w-full text-left p-3 rounded-lg border transition-all",
                    isWinner
                      ? "border-[var(--success)]/50 bg-[var(--success)]/10"
                      : "border-[var(--border)] hover:border-[var(--primary)]/30"
                  )}
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      {isWinner && (
                        <CheckCircle className="h-4 w-4 text-[var(--success)]" weight="fill" />
                      )}
                      <span
                        className={cn(
                          "text-sm font-medium",
                          isWinner ? "text-[var(--success)]" : "text-[var(--text-primary)]"
                        )}
                      >
                        {option}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-[var(--text-muted)]">
                        {count} ({Math.round(percentage)}%)
                      </span>
                      {optionVoters.length > 0 &&
                        (isExpanded ? (
                          <CaretUp className="h-4 w-4 text-[var(--text-muted)]" />
                        ) : (
                          <CaretDown className="h-4 w-4 text-[var(--text-muted)]" />
                        ))}
                    </div>
                  </div>

                  {/* Progress Bar */}
                  <div className="w-full h-2 bg-[var(--surface-2)] rounded-full overflow-hidden">
                    <div
                      className={cn(
                        "h-full transition-all duration-500",
                        isWinner ? "bg-[var(--success)]" : "bg-[var(--primary)]"
                      )}
                      style={{ width: `${percentage}%` }}
                    />
                  </div>
                </button>

                {/* Expanded Voter List */}
                {isExpanded && (
                  <div className="ml-4 pl-4 border-l-2 border-[var(--border)] space-y-2">
                    {isPending ? (
                      <div className="flex items-center justify-center py-3">
                        <Spinner size="sm" />
                      </div>
                    ) : isAnonymous ? (
                      <div className="flex items-center gap-2 py-2 text-sm text-[var(--text-muted)]">
                        <EyeSlash className="h-4 w-4" />
                        <span>Voter identities are hidden</span>
                      </div>
                    ) : optionVoters.length > 0 ? (
                      optionVoters.map((voter) => (
                        <div key={voter.user_id} className="flex items-center gap-2 py-1">
                          <ClickableUserAvatar
                            entity={userToAvatarData(voter.user)}
                            userId={voter.user_id}
                            size="tiny"
                          />
                          <span className="text-sm text-[var(--text-secondary)]">
                            {voter.user.display_name || voter.user.username || "Member"}
                          </span>
                        </div>
                      ))
                    ) : (
                      <p className="text-sm text-[var(--text-muted)] py-1">
                        No votes for this option
                      </p>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Total Voters Summary */}
        {poll.total_votes > 0 && (
          <div className="pt-3 border-t border-[var(--border)]">
            <div className="flex items-center gap-2 text-sm text-[var(--text-muted)]">
              <Users className="h-4 w-4" />
              <span>
                {poll.total_votes} member{poll.total_votes !== 1 ? "s" : ""} voted
              </span>
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
}
