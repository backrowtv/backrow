"use client";

import { useState, useTransition, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { DateTimePicker } from "@/components/ui/date-time-picker";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { updatePoll, type UpdatePollData } from "@/app/actions/clubs/polls";
import { PencilSimple, CircleNotch, Warning } from "@phosphor-icons/react";

interface Poll {
  id: string;
  question: string;
  options: string[];
  expires_at: string | null;
  is_anonymous?: boolean;
  allow_multiple?: boolean;
}

interface EditPollModalProps {
  poll: Poll;
  hasVotes: boolean;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

// Convert ISO date to datetime-local format
function toDateTimeLocal(isoString: string | null): string {
  if (!isoString) return "";
  const date = new Date(isoString);
  if (isNaN(date.getTime())) return "";

  const pad = (n: number) => n.toString().padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

export function EditPollModal({ poll, hasVotes, open, onOpenChange }: EditPollModalProps) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  // Form state
  const [question, setQuestion] = useState(poll.question);
  const [expiresAt, setExpiresAt] = useState(toDateTimeLocal(poll.expires_at));
  const [isAnonymous, setIsAnonymous] = useState(poll.is_anonymous ?? false);
  const [allowMultiple, setAllowMultiple] = useState(poll.allow_multiple ?? false);

  // Reset form when poll changes or modal opens
  useEffect(() => {
    if (open) {
      setQuestion(poll.question);
      setExpiresAt(toDateTimeLocal(poll.expires_at));
      setIsAnonymous(poll.is_anonymous ?? false);
      setAllowMultiple(poll.allow_multiple ?? false);
      setError(null);
    }
  }, [open, poll]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!question.trim()) {
      setError("Question is required");
      return;
    }

    const updateData: UpdatePollData = {};

    if (question.trim() !== poll.question) {
      updateData.question = question.trim();
    }

    const newExpiresAt = expiresAt ? new Date(expiresAt).toISOString() : null;
    if (newExpiresAt !== poll.expires_at) {
      updateData.expires_at = newExpiresAt;
    }

    // Only include these if no votes exist (the server will reject anyway)
    if (!hasVotes) {
      if (isAnonymous !== (poll.is_anonymous ?? false)) {
        updateData.is_anonymous = isAnonymous;
      }
      if (allowMultiple !== (poll.allow_multiple ?? false)) {
        updateData.allow_multiple = allowMultiple;
      }
    }

    if (Object.keys(updateData).length === 0) {
      onOpenChange(false);
      return;
    }

    startTransition(async () => {
      const result = await updatePoll(poll.id, updateData);

      if ("error" in result && result.error) {
        setError(result.error);
      } else {
        onOpenChange(false);
        router.refresh();
      }
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[calc(100vw-2rem)] sm:max-w-[450px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <PencilSimple className="h-5 w-5" />
            Edit Poll
          </DialogTitle>
          <DialogDescription>Update the poll details.</DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Question */}
          <div className="space-y-2">
            <Label htmlFor="edit-question">Question *</Label>
            <Input
              id="edit-question"
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              placeholder="What do you want to ask?"
              required
            />
          </div>

          {/* Deadline */}
          <div className="space-y-2">
            <Label htmlFor="edit-expires">Deadline</Label>
            <DateTimePicker
              value={expiresAt}
              onChange={setExpiresAt}
              placeholder="No deadline (poll stays open)"
            />
          </div>

          {/* Settings that can only be changed if no votes */}
          <div className="space-y-3 pt-2 border-t border-[var(--border)]">
            {hasVotes && (
              <div className="flex items-start gap-2 text-xs text-[var(--warning)] bg-[var(--warning)]/10 p-3 rounded-lg">
                <Warning className="h-4 w-4 flex-shrink-0 mt-0.5" />
                <span>Some settings cannot be changed because votes have already been cast.</span>
              </div>
            )}

            <div className="flex items-center gap-2">
              <Checkbox
                id="edit-anonymous"
                checked={isAnonymous}
                onCheckedChange={(checked) => setIsAnonymous(checked === true)}
                disabled={hasVotes}
              />
              <Label
                htmlFor="edit-anonymous"
                className={
                  hasVotes ? "text-[var(--text-muted)] cursor-not-allowed" : "cursor-pointer"
                }
              >
                Anonymous voting
              </Label>
            </div>

            <div className="flex items-center gap-2">
              <Checkbox
                id="edit-multiple"
                checked={allowMultiple}
                onCheckedChange={(checked) => setAllowMultiple(checked === true)}
                disabled={hasVotes}
              />
              <Label
                htmlFor="edit-multiple"
                className={
                  hasVotes ? "text-[var(--text-muted)] cursor-not-allowed" : "cursor-pointer"
                }
              >
                Allow multiple selections
              </Label>
            </div>
          </div>

          {error && (
            <div className="text-sm text-[var(--error)] bg-[var(--error)]/10 p-3 rounded-lg">
              {error}
            </div>
          )}

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isPending}
            >
              Cancel
            </Button>
            <Button type="submit" variant="club-accent" disabled={isPending || !question.trim()}>
              {isPending ? (
                <>
                  <CircleNotch className="h-4 w-4 animate-spin mr-2" />
                  Saving...
                </>
              ) : (
                "Save Changes"
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
