"use client";

import { voteOnPoll, deletePoll, closePoll } from "@/app/actions/clubs";
import { useTransition, useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent } from "@/components/ui/card";
import { ClickableUserAvatar } from "@/components/ui/clickable-user-avatar";
import { userToAvatarData } from "@/lib/avatar-helpers";
import { DateDisplay } from "@/components/ui/date-display";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ConfirmationDialog } from "@/components/ui/confirmation-dialog";
import { EditPollModal } from "./EditPollModal";
import { Trash, CheckSquare, EyeSlash, Check, PencilSimple, Stop } from "@phosphor-icons/react";
import { createClient as createClientBrowser } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";

interface Poll {
  id: string;
  question: string;
  options: string[];
  created_at: string;
  expires_at: string | null;
  is_anonymous?: boolean;
  allow_multiple?: boolean;
  user: {
    id: string;
    display_name: string | null;
    avatar_url: string | null;
  } | null;
}

interface PollsListProps {
  clubId: string;
  polls: Poll[];
  isAdmin?: boolean;
}

export function PollsList({ clubId: _clubId, polls, isAdmin = false }: PollsListProps) {
  const [isPending, startTransition] = useTransition();
  // Changed from Record<string, number> to Record<string, Set<number>> for multi-select support
  const [userVotes, setUserVotes] = useState<Record<string, Set<number>>>({});
  const [voteCounts, setVoteCounts] = useState<Record<string, Record<number, number>>>({});
  const [pollToDelete, setPollToDelete] = useState<Poll | null>(null);
  const [pollToEdit, setPollToEdit] = useState<Poll | null>(null);
  const [pollToClose, setPollToClose] = useState<Poll | null>(null);
  const router = useRouter();

  useEffect(() => {
    async function fetchVotes() {
      const supabase = createClientBrowser();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;

      // Fetch user's votes
      const pollIds = polls.map((p) => p.id);
      if (pollIds.length === 0) return;

      const { data: votes } = await supabase
        .from("club_poll_votes")
        .select("poll_id, option_index")
        .in("poll_id", pollIds)
        .eq("user_id", user.id);

      // Group votes by poll_id as a Set of option indices (supports multi-select)
      const votesMap: Record<string, Set<number>> = {};
      votes?.forEach((vote) => {
        if (!votesMap[vote.poll_id]) {
          votesMap[vote.poll_id] = new Set();
        }
        votesMap[vote.poll_id].add(vote.option_index);
      });
      setUserVotes(votesMap);

      // Fetch vote counts for each poll
      const { data: allVotes } = await supabase
        .from("club_poll_votes")
        .select("poll_id, option_index")
        .in("poll_id", pollIds);

      const counts: Record<string, Record<number, number>> = {};
      allVotes?.forEach((vote) => {
        if (!counts[vote.poll_id]) {
          counts[vote.poll_id] = {};
        }
        counts[vote.poll_id][vote.option_index] =
          (counts[vote.poll_id][vote.option_index] || 0) + 1;
      });
      setVoteCounts(counts);
    }

    fetchVotes();
  }, [polls]);

  async function handleVote(pollId: string, optionIndex: number) {
    const poll = polls.find((p) => p.id === pollId);
    if (!poll) return;

    const isMultiSelect = poll.allow_multiple ?? false;

    // Save previous state for rollback on error
    const prevUserVotes = { ...userVotes };
    const prevVoteCounts = { ...voteCounts };
    const previousPollVotes = userVotes[pollId] || new Set<number>();

    // OPTIMISTIC UPDATE 1: Update user's vote selection immediately
    setUserVotes((prev) => {
      const newVotes = { ...prev };
      const pollVotes = new Set(prev[pollId] || []);

      if (isMultiSelect) {
        // Multi-select: toggle the option
        if (pollVotes.has(optionIndex)) {
          pollVotes.delete(optionIndex);
        } else {
          pollVotes.add(optionIndex);
        }
      } else {
        // Single-select: replace with new selection
        pollVotes.clear();
        pollVotes.add(optionIndex);
      }

      newVotes[pollId] = pollVotes;
      return newVotes;
    });

    // OPTIMISTIC UPDATE 2: Update vote counts immediately
    setVoteCounts((prev) => {
      const newCounts = { ...prev };
      const pollCounts = { ...(prev[pollId] || {}) };

      if (isMultiSelect) {
        // Toggle: either add or remove one vote from this option
        if (previousPollVotes.has(optionIndex)) {
          pollCounts[optionIndex] = Math.max(0, (pollCounts[optionIndex] || 0) - 1);
        } else {
          pollCounts[optionIndex] = (pollCounts[optionIndex] || 0) + 1;
        }
      } else {
        // Single-select: decrement old vote, increment new vote
        previousPollVotes.forEach((idx) => {
          pollCounts[idx] = Math.max(0, (pollCounts[idx] || 0) - 1);
        });
        pollCounts[optionIndex] = (pollCounts[optionIndex] || 0) + 1;
      }

      newCounts[pollId] = pollCounts;
      return newCounts;
    });

    // Call server action in background
    const result = await voteOnPoll(pollId, optionIndex);

    // ROLLBACK on error
    if (result?.error) {
      setUserVotes(prevUserVotes);
      setVoteCounts(prevVoteCounts);
    }
  }

  async function handleConfirmDelete() {
    if (!pollToDelete) return;

    startTransition(async () => {
      await deletePoll(pollToDelete.id);
      router.refresh();
      setPollToDelete(null);
    });
  }

  async function handleConfirmClose() {
    if (!pollToClose) return;

    startTransition(async () => {
      await closePoll(pollToClose.id);
      router.refresh();
      setPollToClose(null);
    });
  }

  // Helper to check if poll is active (not expired)
  function isPollActive(poll: Poll): boolean {
    if (!poll.expires_at) return true;
    return new Date(poll.expires_at) > new Date();
  }

  if (polls.length === 0) {
    return (
      <Card>
        <CardContent className="p-6">
          <p className="text-sm text-[var(--text-muted)]">No polls yet.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <div className="space-y-4">
        {polls.map((poll) => {
          const pollVotes = userVotes[poll.id] || new Set<number>();
          const counts = voteCounts[poll.id] || {};
          const totalVotes = Object.values(counts).reduce((sum, count) => sum + count, 0);

          return (
            <Card key={poll.id} variant="elevated">
              <CardContent className="p-6">
                <div className="flex items-start justify-between gap-4 mb-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      {(() => {
                        // Handle user relation - can be array or object
                        const userRelation = Array.isArray(poll.user) ? poll.user[0] : poll.user;
                        return (
                          userRelation && (
                            <ClickableUserAvatar
                              entity={userToAvatarData(userRelation)}
                              userId={userRelation.id}
                              size="sm"
                            />
                          )
                        );
                      })()}
                      <div>
                        <h3 className="font-semibold">{poll.question}</h3>
                        <div className="flex items-center gap-2 flex-wrap mt-1">
                          <p className="text-xs text-[var(--text-muted)]">
                            <DateDisplay date={poll.created_at} format="datetime" />
                            {poll.expires_at && (
                              <>
                                {" "}
                                • Expires <DateDisplay date={poll.expires_at} format="datetime" />
                              </>
                            )}
                            {totalVotes > 0 && (
                              <>
                                {" "}
                                • {totalVotes} vote{totalVotes !== 1 ? "s" : ""}
                              </>
                            )}
                          </p>
                          {poll.allow_multiple && (
                            <Badge variant="secondary" className="text-[10px] h-5">
                              <CheckSquare className="h-3 w-3 mr-1" />
                              Multi-select
                            </Badge>
                          )}
                          {poll.is_anonymous && (
                            <Badge variant="secondary" className="text-[10px] h-5">
                              <EyeSlash className="h-3 w-3 mr-1" />
                              Anonymous
                            </Badge>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                  {isAdmin && (
                    <div className="flex items-center gap-1">
                      {isPollActive(poll) && (
                        <>
                          <Button
                            variant="outline"
                            size="icon"
                            onClick={() => setPollToEdit(poll)}
                            disabled={isPending}
                            aria-label={`Edit poll: ${poll.question}`}
                          >
                            <PencilSimple className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="outline"
                            size="icon"
                            onClick={() => setPollToClose(poll)}
                            disabled={isPending}
                            aria-label={`End poll: ${poll.question}`}
                            className="text-[var(--warning)] hover:text-[var(--warning)]"
                          >
                            <Stop className="h-4 w-4" />
                          </Button>
                        </>
                      )}
                      <Button
                        variant="outline"
                        size="icon"
                        onClick={() => setPollToDelete(poll)}
                        disabled={isPending}
                        aria-label={`Delete poll: ${poll.question}`}
                        className="text-[var(--error)] hover:text-[var(--error)]"
                      >
                        <Trash className="h-4 w-4" />
                      </Button>
                    </div>
                  )}
                </div>

                <div className="space-y-2">
                  {poll.options.map((option, index) => {
                    const count = counts[index] || 0;
                    const percentage = totalVotes > 0 ? (count / totalVotes) * 100 : 0;
                    const isSelected = pollVotes.has(index);

                    return (
                      <button
                        key={index}
                        onClick={() => handleVote(poll.id, index)}
                        disabled={isPending}
                        className={cn(
                          "w-full text-left p-3 rounded-lg border transition-colors",
                          isSelected
                            ? "border-[var(--primary)] bg-[var(--surface-3)]"
                            : "border-[var(--border)] hover:border-[var(--primary)]/50"
                        )}
                      >
                        <div className="flex items-center gap-3 mb-1">
                          {/* Visual indicator: checkbox for multi-select, radio for single */}
                          {poll.allow_multiple ? (
                            <div
                              className={cn(
                                "h-4 w-4 rounded border-2 flex items-center justify-center flex-shrink-0",
                                isSelected
                                  ? "bg-[var(--primary)] border-[var(--primary)]"
                                  : "border-[var(--text-muted)]"
                              )}
                            >
                              {isSelected && <Check className="h-3 w-3 text-white" weight="bold" />}
                            </div>
                          ) : (
                            <div
                              className={cn(
                                "h-4 w-4 rounded-full border-2 flex items-center justify-center flex-shrink-0",
                                isSelected
                                  ? "border-[var(--primary)]"
                                  : "border-[var(--text-muted)]"
                              )}
                            >
                              {isSelected && (
                                <div className="h-2 w-2 rounded-full bg-[var(--primary)]" />
                              )}
                            </div>
                          )}
                          <span className="text-sm font-medium flex-1">{option}</span>
                          {totalVotes > 0 && (
                            <span className="text-xs text-[var(--text-muted)]">
                              {count} ({Math.round(percentage)}%)
                            </span>
                          )}
                        </div>
                        <div className={cn("pl-7", count === 0 && "invisible")}>
                          <div className="w-full h-2 bg-[var(--surface-2)] rounded-full overflow-hidden">
                            <div
                              className="h-full bg-[var(--primary)] transition-all"
                              style={{ width: `${percentage}%` }}
                            />
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Delete Confirmation Dialog */}
      <ConfirmationDialog
        open={pollToDelete !== null}
        onOpenChange={(open) => !open && setPollToDelete(null)}
        title="Delete Poll?"
        description={
          <span>
            Are you sure you want to delete the poll{" "}
            <strong>&quot;{pollToDelete?.question}&quot;</strong>? All votes will be lost. This
            action cannot be undone.
          </span>
        }
        confirmText="Delete Poll"
        onConfirm={handleConfirmDelete}
        variant="danger"
        isLoading={isPending}
      />

      {/* Close Poll Confirmation Dialog */}
      <ConfirmationDialog
        open={pollToClose !== null}
        onOpenChange={(open) => !open && setPollToClose(null)}
        title="End Poll Early?"
        description={
          <span>
            Are you sure you want to end the poll{" "}
            <strong>&quot;{pollToClose?.question}&quot;</strong>? Members will no longer be able to
            vote.
          </span>
        }
        confirmText="End Poll"
        onConfirm={handleConfirmClose}
        variant="warning"
        isLoading={isPending}
      />

      {/* Edit Poll Modal */}
      {pollToEdit && (
        <EditPollModal
          poll={pollToEdit}
          hasVotes={
            (voteCounts[pollToEdit.id] &&
              Object.values(voteCounts[pollToEdit.id]).some((c) => c > 0)) ??
            false
          }
          open={pollToEdit !== null}
          onOpenChange={(open) => !open && setPollToEdit(null)}
        />
      )}
    </>
  );
}
