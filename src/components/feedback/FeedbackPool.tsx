"use client";

import { useState, useEffect, useActionState, useRef } from "react";
import { Plus } from "@phosphor-icons/react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { FeedbackItem } from "./FeedbackItem";
import {
  addFeedbackItem,
  voteOnFeedback,
  deleteFeedbackItem,
  updateFeedbackStatus,
} from "@/app/actions/feedback";
import type {
  FeedbackItemWithUser,
  FeedbackType,
  FeedbackStatus,
} from "@/app/actions/feedback.types";
import toast from "react-hot-toast";

type SortOption = "new" | "top" | "old";

interface FeedbackPoolProps {
  items: FeedbackItemWithUser[];
  type: FeedbackType;
  userVotes: Set<string>;
  currentUserId: string | null;
  isAdmin: boolean;
}

export function FeedbackPool({
  items,
  type,
  userVotes,
  currentUserId,
  isAdmin,
}: FeedbackPoolProps) {
  const [sortBy, setSortBy] = useState<SortOption>("top");
  const [optimisticItems, setOptimisticItems] = useState<FeedbackItemWithUser[]>(items);
  const [optimisticVotes, setOptimisticVotes] = useState<Set<string>>(userVotes);
  const [votingItemId, setVotingItemId] = useState<string | null>(null);
  const [deletingItemId, setDeletingItemId] = useState<string | null>(null);
  const [isFormExpanded, setIsFormExpanded] = useState(false);
  const [state, formAction, isPending] = useActionState(addFeedbackItem, null);
  const formRef = useRef<HTMLFormElement>(null);
  const titleInputRef = useRef<HTMLInputElement>(null);

  // Sync with prop changes
  useEffect(() => {
    setOptimisticItems(items);
  }, [items]);

  useEffect(() => {
    setOptimisticVotes(userVotes);
  }, [userVotes]);

  // Sort items
  const sortedItems = [...optimisticItems].sort((a, b) => {
    if (sortBy === "new") {
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    } else if (sortBy === "old") {
      return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
    } else if (sortBy === "top") {
      if (b.vote_count !== a.vote_count) {
        return b.vote_count - a.vote_count;
      }
      // Tie-breaker: newer first
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    }
    return 0;
  });

  // Handle vote with optimistic update
  const handleVote = async (itemId: string) => {
    if (!currentUserId) {
      toast.error("You must be signed in to vote");
      return;
    }

    setVotingItemId(itemId);
    const isRemoving = optimisticVotes.has(itemId);

    // Optimistic update
    setOptimisticVotes((prev) => {
      const next = new Set(prev);
      if (isRemoving) {
        next.delete(itemId);
      } else {
        next.add(itemId);
      }
      return next;
    });

    setOptimisticItems((prev) =>
      prev.map((item) =>
        item.id === itemId ? { ...item, vote_count: item.vote_count + (isRemoving ? -1 : 1) } : item
      )
    );

    // Server call
    const result = await voteOnFeedback(itemId);

    if ("error" in result && result.error) {
      // Revert on error
      setOptimisticVotes((prev) => {
        const next = new Set(prev);
        if (isRemoving) {
          next.add(itemId);
        } else {
          next.delete(itemId);
        }
        return next;
      });

      setOptimisticItems((prev) =>
        prev.map((item) =>
          item.id === itemId
            ? { ...item, vote_count: item.vote_count + (isRemoving ? 1 : -1) }
            : item
        )
      );

      toast.error(result.error);
    }

    setVotingItemId(null);
  };

  // Handle delete
  const handleDelete = async (itemId: string) => {
    const itemToDelete = optimisticItems.find((item) => item.id === itemId);
    if (!itemToDelete) return;

    setDeletingItemId(itemId);

    // Optimistic removal
    setOptimisticItems((prev) => prev.filter((item) => item.id !== itemId));

    const result = await deleteFeedbackItem(itemId);

    if ("error" in result && result.error) {
      // Restore on error
      setOptimisticItems((prev) => [...prev, itemToDelete]);
      toast.error(result.error);
    } else {
      toast.success(`${type === "bug" ? "Bug report" : "Feature request"} deleted`);
    }

    setDeletingItemId(null);
  };

  // Handle status update (admin only)
  const handleStatusUpdate = async (
    itemId: string,
    status: FeedbackStatus,
    adminResponse?: string
  ) => {
    const result = await updateFeedbackStatus(itemId, status, adminResponse);

    if ("error" in result && result.error) {
      toast.error(result.error);
    } else {
      // Update optimistically
      setOptimisticItems((prev) =>
        prev.map((item) =>
          item.id === itemId
            ? { ...item, status, admin_response: adminResponse || item.admin_response }
            : item
        )
      );
      toast.success("Status updated");
    }
  };

  // Clear form on success
  useEffect(() => {
    if (state && "success" in state && state.success) {
      formRef.current?.reset();
      setIsFormExpanded(false);
      toast.success(`${type === "bug" ? "Bug report" : "Feature request"} submitted`);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- Depends on state?.success not the full state object; avoids re-running on unrelated state changes
  }, [state?.success, type]);

  const typeLabel = type === "bug" ? "bug report" : "feature request";

  return (
    <div
      className="overflow-hidden rounded-lg border"
      style={{ background: "var(--surface-1)", borderColor: "var(--border)" }}
    >
      {/* Header with count and sort */}
      <div
        className="flex items-center justify-between px-4 py-3 border-b"
        style={{ borderColor: "var(--border)" }}
      >
        <div className="flex items-center gap-2">
          <h3 className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>
            {type === "bug" ? "Bug Reports" : "Feature Requests"}
          </h3>
          <span
            className="text-xs px-1.5 py-0.5 rounded-full"
            style={{
              background: "var(--surface-2)",
              color: "var(--text-secondary)",
            }}
          >
            {optimisticItems.length}
          </span>
        </div>
        {optimisticItems.length > 0 && (
          <div
            className="flex items-center gap-0.5 rounded-md p-0.5"
            style={{ background: "var(--surface-2)" }}
          >
            {(["new", "top", "old"] as SortOption[]).map((sort) => (
              <button
                key={sort}
                onClick={() => setSortBy(sort)}
                className={cn(
                  "px-2 py-1 text-xs font-medium rounded transition-colors capitalize",
                  sortBy === sort
                    ? "bg-[var(--background)] text-[var(--text-primary)] shadow-sm"
                    : "text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
                )}
              >
                {sort}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Items list - scrollable */}
      <div
        className="overflow-y-auto max-h-[400px]"
        style={{
          scrollbarWidth: "thin",
          scrollbarColor: "var(--border) transparent",
        }}
      >
        {sortedItems.length === 0 ? (
          <div className="px-4 py-8 text-center">
            <p className="text-sm" style={{ color: "var(--text-secondary)" }}>
              No {type === "bug" ? "bug reports" : "feature requests"} yet
            </p>
            <p className="text-xs mt-1" style={{ color: "var(--text-muted)" }}>
              Be the first to submit one below!
            </p>
          </div>
        ) : (
          sortedItems.map((item) => (
            <FeedbackItem
              key={item.id}
              item={item}
              isVoted={optimisticVotes.has(item.id)}
              isOwner={item.user_id === currentUserId}
              isAdmin={isAdmin}
              onVote={() => handleVote(item.id)}
              onDelete={() => handleDelete(item.id)}
              onStatusUpdate={
                isAdmin
                  ? (status, adminResponse) => handleStatusUpdate(item.id, status, adminResponse)
                  : undefined
              }
              isVoting={votingItemId === item.id}
              isDeleting={deletingItemId === item.id}
            />
          ))
        )}
      </div>

      {/* Add feedback form */}
      <div className="border-t px-3 py-3" style={{ borderColor: "var(--border)" }}>
        {!isFormExpanded ? (
          <button
            onClick={() => {
              setIsFormExpanded(true);
            }}
            className="w-full flex items-center justify-center gap-2 py-2 rounded-md text-sm font-medium transition-colors hover:bg-[var(--surface-2)]"
            style={{ color: "var(--primary)" }}
          >
            <Plus className="w-4 h-4" />
            Add {typeLabel}
          </button>
        ) : (
          <form ref={formRef} action={formAction} className="space-y-3">
            <input type="hidden" name="type" value={type} />

            {/* Title input */}
            <div>
              <label
                htmlFor={`feedback-${type}-title`}
                className="text-xs font-medium text-[var(--text-secondary)] block mb-1"
              >
                Title <span className="text-[var(--error)]">*</span>
              </label>
              <input
                id={`feedback-${type}-title`}
                ref={titleInputRef}
                name="title"
                type="text"
                required
                disabled={isPending}
                maxLength={200}
                placeholder={
                  type === "bug" ? "Describe the bug briefly..." : "Describe the feature briefly..."
                }
                className="w-full text-sm rounded-md px-3 py-2 border transition-colors focus:outline-none focus:border-[var(--primary)]"
                style={{
                  borderColor: "var(--border)",
                  backgroundColor: "var(--surface-0)",
                  color: "var(--text-primary)",
                }}
              />
              <p className="text-xs mt-1 text-[var(--text-muted)]">Max 200 characters</p>
            </div>

            {/* Description textarea */}
            <div>
              <label
                htmlFor={`feedback-${type}-description`}
                className="text-xs font-medium text-[var(--text-secondary)] block mb-1"
              >
                Description (optional)
              </label>
              <textarea
                id={`feedback-${type}-description`}
                name="description"
                disabled={isPending}
                maxLength={1000}
                rows={3}
                placeholder={
                  type === "bug"
                    ? "Provide more details about the bug, steps to reproduce, etc..."
                    : "Provide more details about the feature, use cases, etc..."
                }
                className="w-full text-sm rounded-md px-3 py-2 border transition-colors resize-none focus:outline-none focus:border-[var(--primary)]"
                style={{
                  borderColor: "var(--border)",
                  backgroundColor: "var(--surface-0)",
                  color: "var(--text-primary)",
                }}
              />
              <p className="text-xs mt-1 text-[var(--text-muted)]">Max 1000 characters</p>
            </div>

            {/* Form actions */}
            <div className="flex items-center justify-end gap-2">
              <Button
                type="button"
                variant="secondary"
                size="sm"
                onClick={() => {
                  formRef.current?.reset();
                  setIsFormExpanded(false);
                }}
                disabled={isPending}
              >
                Cancel
              </Button>
              <Button type="submit" size="sm" disabled={isPending} isLoading={isPending}>
                Submit
              </Button>
            </div>

            {state && "error" in state && state.error && (
              <p className="text-xs" style={{ color: "var(--error)" }}>
                {state.error}
              </p>
            )}
          </form>
        )}
      </div>
    </div>
  );
}
