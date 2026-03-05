"use client";

import { useState } from "react";
import { Trash, CaretDown, CaretRight } from "@phosphor-icons/react";
import { cn } from "@/lib/utils";
import { ClickableUserAvatar } from "@/components/ui/clickable-user-avatar";
import { userToAvatarData } from "@/lib/avatar-helpers";
import { UpvoteButton } from "@/components/ui/upvote-button";
import { FeedbackAdminControls } from "./FeedbackAdminControls";
import type { FeedbackItemWithUser, FeedbackStatus } from "@/app/actions/feedback.types";

function formatRelativeTime(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffSecs = Math.floor(diffMs / 1000);
  const diffMins = Math.floor(diffSecs / 60);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);
  const diffWeeks = Math.floor(diffDays / 7);
  const diffMonths = Math.floor(diffDays / 30);

  if (diffSecs < 60) return "just now";
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  if (diffWeeks < 4) return `${diffWeeks}w ago`;
  return `${diffMonths}mo ago`;
}

const STATUS_CONFIG: Record<FeedbackStatus, { label: string; color: string; bg: string }> = {
  open: { label: "Open", color: "var(--text-secondary)", bg: "var(--surface-2)" },
  in_progress: { label: "In Progress", color: "var(--info)", bg: "rgba(59, 130, 246, 0.1)" },
  resolved: { label: "Resolved", color: "var(--success)", bg: "rgba(34, 197, 94, 0.1)" },
  closed: { label: "Closed", color: "var(--text-muted)", bg: "var(--surface-1)" },
  wont_fix: { label: "Won't Fix", color: "var(--warning)", bg: "rgba(245, 158, 11, 0.1)" },
};

interface FeedbackItemProps {
  item: FeedbackItemWithUser;
  isVoted: boolean;
  isOwner: boolean;
  isAdmin: boolean;
  onVote: () => void;
  onDelete: () => void;
  onStatusUpdate?: (status: FeedbackStatus, adminResponse?: string) => void;
  isVoting?: boolean;
  isDeleting?: boolean;
}

export function FeedbackItem({
  item,
  isVoted,
  isOwner,
  isAdmin,
  onVote,
  onDelete,
  onStatusUpdate,
  isVoting = false,
  isDeleting = false,
}: FeedbackItemProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [isHovered, setIsHovered] = useState(false);

  const hasDescription = item.description && item.description.trim().length > 0;
  const shouldTruncate = hasDescription && item.description!.length > 100;
  const displayDescription =
    shouldTruncate && !isExpanded ? item.description!.slice(0, 100) + "..." : item.description;

  const statusConfig = STATUS_CONFIG[item.status];

  return (
    <div
      className={cn(
        "px-3 py-3 transition-colors border-b",
        isHovered && "bg-[var(--surface-1)]/50"
      )}
      style={{ borderColor: "var(--border)" }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <div className="flex items-start gap-3">
        {/* Upvote button */}
        <UpvoteButton
          count={item.vote_count}
          isVoted={isVoted}
          onVote={onVote}
          disabled={isVoting}
        />

        {/* Content */}
        <div className="flex-1 min-w-0">
          {/* Title row */}
          <div className="flex items-start justify-between gap-2">
            <h3 className="text-sm font-medium text-[var(--text-primary)] leading-snug">
              {item.title}
            </h3>
            <div className="flex items-center gap-2 shrink-0">
              {/* Status badge */}
              <span
                className="text-xs px-2 py-0.5 rounded-full font-medium"
                style={{
                  color: statusConfig.color,
                  backgroundColor: statusConfig.bg,
                }}
              >
                {statusConfig.label}
              </span>
            </div>
          </div>

          {/* Description */}
          {hasDescription && (
            <div className="mt-1.5">
              <p className="text-sm text-[var(--text-muted)] leading-relaxed">
                {displayDescription}
              </p>
              {shouldTruncate && (
                <button
                  onClick={() => setIsExpanded(!isExpanded)}
                  className="text-xs text-[var(--primary)] hover:underline mt-1 flex items-center gap-0.5 focus:outline-none focus:ring-2 focus:ring-[var(--primary)] rounded"
                  aria-expanded={isExpanded}
                >
                  {isExpanded ? (
                    <>
                      <CaretDown className="w-3 h-3" />
                      Show less
                    </>
                  ) : (
                    <>
                      <CaretRight className="w-3 h-3" />
                      Show more
                    </>
                  )}
                </button>
              )}
            </div>
          )}

          {/* Admin response */}
          {item.admin_response && (
            <div
              className="mt-2 p-2 rounded-md text-sm"
              style={{ backgroundColor: "var(--surface-1)" }}
            >
              <span className="text-xs font-medium text-[var(--text-muted)] block mb-1">
                Admin Response:
              </span>
              <p className="text-[var(--text-secondary)] leading-relaxed">{item.admin_response}</p>
            </div>
          )}

          {/* Meta row */}
          <div className="flex items-center gap-2 mt-2">
            {item.user && (
              <div className="flex items-center gap-1.5">
                <ClickableUserAvatar
                  entity={userToAvatarData({
                    display_name: item.user.display_name,
                    avatar_url: item.user.avatar_url,
                  })}
                  userId={item.user.id}
                  size="xs"
                />
                <span className="text-xs text-[var(--text-muted)]">
                  {item.user.display_name || item.user.username || "Unknown"}
                </span>
              </div>
            )}
            <span className="text-xs text-[var(--text-muted)]">·</span>
            <span className="text-xs text-[var(--text-muted)]" suppressHydrationWarning>
              {formatRelativeTime(item.created_at)}
            </span>

            {/* Actions */}
            <div
              className={cn(
                "ml-auto flex items-center gap-1 transition-opacity",
                isHovered || isOwner ? "opacity-100" : "opacity-0"
              )}
            >
              {/* Delete button (owner only) */}
              {isOwner && (
                <button
                  onClick={onDelete}
                  disabled={isDeleting}
                  className="p-1.5 rounded hover:bg-[var(--error)]/10 transition-colors disabled:opacity-50 focus:outline-none focus:ring-2 focus:ring-[var(--error)]/50"
                  style={{ color: "var(--error)" }}
                  aria-label="Delete feedback"
                >
                  <Trash className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>

          {/* Admin controls */}
          {isAdmin && onStatusUpdate && (
            <FeedbackAdminControls
              currentStatus={item.status}
              currentResponse={item.admin_response}
              onUpdate={onStatusUpdate}
            />
          )}
        </div>
      </div>
    </div>
  );
}
