"use client";

import * as React from "react";
import { useState, useEffect } from "react";
import dynamic from "next/dynamic";
import {
  ArrowRight,
  CaretUp,
  ChatCircle,
  DotsThree,
  Plus,
  Trash,
  PencilSimple,
} from "@phosphor-icons/react/dist/ssr";
import Link from "next/link";
import { EntityAvatar } from "@/components/ui/entity-avatar";
import { userToAvatarData } from "@/lib/avatar-helpers";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import toast from "react-hot-toast";
import { toggleVote, createComment, updateComment, deleteComment } from "@/app/actions/discussions";
import { UserPopupModal } from "@/components/profile/UserPopupModal";
import type { DiscussionComment as CommentType } from "@/app/actions/discussions";
import { isContentEmpty, TEXT_LIMITS } from "@/lib/text/formatting";
import { THREAD_CONSTANTS } from "@/lib/constants/ui";

// Dynamic import for heavy rich text editor
const SimpleRichTextEditor = dynamic(
  () => import("@/components/movies/SimpleRichTextEditor").then((mod) => mod.SimpleRichTextEditor),
  {
    loading: () => (
      <div className="h-[80px] bg-[var(--surface-1)] rounded-lg border border-[var(--border)] animate-pulse" />
    ),
    ssr: false,
  }
);
const SimpleRichTextPreview = dynamic(
  () => import("@/components/movies/SimpleRichTextEditor").then((mod) => mod.SimpleRichTextPreview),
  { ssr: false }
);

// Narwhal-style thread colors - cycle every 6 levels
const THREAD_COLORS = [
  "var(--thread-color-0)", // Sage green (depth 0)
  "var(--thread-color-1)", // Blue (depth 1)
  "var(--thread-color-2)", // Accent blue (depth 2)
  "var(--thread-color-3)", // Teal (depth 3)
  "var(--thread-color-4)", // Amber (depth 4)
  "var(--thread-color-5)", // Purple (depth 5)
] as const;

function getThreadColor(depth: number): string {
  return THREAD_COLORS[depth % THREAD_COLORS.length];
}

// Count total replies recursively (for collapsed state)
function countTotalReplies(comment: CommentType): number {
  const replies = comment.replies || [];
  return replies.reduce((sum, reply) => sum + 1 + countTotalReplies(reply), 0);
}

interface DiscussionCommentProps {
  comment: CommentType;
  threadId: string;
  currentUserId: string;
  depth?: number;
  onReplyAdded?: (newReply?: CommentType) => void;
  clubSlug: string;
  threadSlug: string;
  discussionPreferences?: import("@/lib/discussion-preferences").DiscussionPreferences;
  isLocked?: boolean;
}

export function DiscussionComment({
  comment,
  threadId,
  currentUserId,
  depth = 0,
  onReplyAdded,
  clubSlug,
  threadSlug,
  discussionPreferences,
  isLocked = false,
}: DiscussionCommentProps) {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isReplying, setIsReplying] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [replyContent, setReplyContent] = useState("");
  const [editContent, setEditContent] = useState(comment.content);
  const [localUpvotes, setLocalUpvotes] = useState(comment.upvotes);
  const [hasUpvoted, setHasUpvoted] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [localReplies, setLocalReplies] = useState<CommentType[]>([]);
  const [visibleReplyCount, setVisibleReplyCount] = useState(3);
  const [isMobile, setIsMobile] = useState(false);
  const [popupUserId, setPopupUserId] = useState<string | null>(null);

  useEffect(() => {
    const mq = window.matchMedia("(max-width: 640px)");
    setIsMobile(mq.matches);
    const handler = (e: MediaQueryListEvent) => setIsMobile(e.matches);
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, []);

  const isAuthor = comment.author_id === currentUserId;
  const collapseOnTap = discussionPreferences?.collapseOnTap ?? true;
  // Merge server replies with locally added replies
  const replies = [...(comment.replies || []), ...localReplies];

  // Responsive depth limits — shallower on mobile to prevent overflow
  const maxVisualDepth = isMobile ? 5 : THREAD_CONSTANTS.MAX_VISUAL_DEPTH;
  const continueThreadDepth = isMobile ? 5 : THREAD_CONSTANTS.CONTINUE_THREAD_DEPTH;

  // Visual depth capping - indent capped at maxVisualDepth but replies allowed at any depth
  const threadColor = getThreadColor(depth);
  const _isDeepNested = depth >= maxVisualDepth;

  // Each level adds its own single indent (parent already provides its indent)
  const nestingMargin = depth > 0 && depth <= maxVisualDepth ? (isMobile ? 6 : 8) : 0;

  const handleVote = async () => {
    if (hasUpvoted) {
      setLocalUpvotes((prev) => prev - 1);
      setHasUpvoted(false);
    } else {
      setLocalUpvotes((prev) => prev + 1);
      setHasUpvoted(true);
    }

    await toggleVote(null, comment.id);
  };

  const handleReply = async () => {
    if (isContentEmpty(replyContent) || isSubmitting) return;

    setIsSubmitting(true);
    const formData = new FormData();
    formData.append("threadId", threadId);
    formData.append("content", replyContent);
    formData.append("parentId", comment.id);

    const result = await createComment(null, formData);

    if ("success" in result && result.success && result.comment) {
      const newReplyWithReplies = { ...result.comment, replies: [] };
      setLocalReplies((prev) => [...prev, newReplyWithReplies]);
      setVisibleReplyCount((prev) => Math.max(prev, replies.length + localReplies.length + 1));
      setReplyContent("");
      setIsReplying(false);
    } else if ("error" in result) {
      toast.error(result.error || "Failed to post reply");
    }
    setIsSubmitting(false);
  };

  const handleEdit = async () => {
    if (isContentEmpty(editContent) || isSubmitting) return;

    setIsSubmitting(true);
    const result = await updateComment(comment.id, editContent);

    if ("success" in result && result.success) {
      setIsEditing(false);
    }
    setIsSubmitting(false);
  };

  const handleDelete = async () => {
    if (isSubmitting) return;
    setIsSubmitting(true);
    await deleteComment(comment.id);
    setIsSubmitting(false);
  };

  const timeAgo = getTimeAgo(new Date(comment.created_at));

  // Total nested replies count for collapsed state
  const totalReplies = countTotalReplies(comment);

  // --- Collapsed state ---
  if (isCollapsed) {
    return (
      <div className="relative flex items-center" style={{ marginLeft: nestingMargin }}>
        {/* Thread bar for nested collapsed comments */}
        {depth > 0 && (
          <button
            onClick={() => setIsCollapsed(false)}
            className="absolute left-0 top-0 bottom-0 w-3 cursor-pointer group"
            aria-label={`Expand comment by ${comment.author?.display_name}`}
          >
            <div
              className="absolute left-0 top-0 bottom-0 w-0.5 rounded-full transition-opacity group-hover:opacity-70"
              style={{ backgroundColor: threadColor }}
            />
          </button>
        )}
        <div
          className={cn(
            "flex items-center gap-1.5 py-1 w-full cursor-pointer rounded hover:bg-[var(--hover)] transition-colors",
            depth > 0 ? "pl-2.5" : "pl-0"
          )}
          onClick={() => setIsCollapsed(false)}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => e.key === "Enter" && setIsCollapsed(false)}
          aria-label={`Expand comment by ${comment.author?.display_name}. ${totalReplies} replies hidden.`}
        >
          <Plus className="w-3 h-3 text-[var(--text-muted)] flex-shrink-0" />
          <EntityAvatar entity={userToAvatarData(comment.author)} emojiSet="user" size="tiny" />
          <span className="text-xs text-[var(--text-muted)] truncate">
            {comment.author?.display_name}
          </span>
          <span
            className="text-xs text-[var(--text-muted)] ml-auto flex-shrink-0 flex items-center gap-1.5"
            suppressHydrationWarning
          >
            {timeAgo}
            <span className="tabular-nums">
              <CaretUp className="w-3 h-3 inline -mt-px" weight={hasUpvoted ? "fill" : "regular"} />
              {localUpvotes}
            </span>
            <span className="opacity-60">[{totalReplies > 0 ? `${totalReplies + 1}` : "1"}]</span>
          </span>
        </div>
      </div>
    );
  }

  // --- Expanded state ---
  return (
    <div className="relative" style={{ marginLeft: nestingMargin }}>
      {/* Thread bar for nested comments — spans full height */}
      {depth > 0 && (
        <button
          onClick={() => setIsCollapsed(true)}
          className="absolute left-0 top-0 bottom-0 w-3 cursor-pointer group z-10"
          aria-label={`Collapse comment by ${comment.author?.display_name}`}
        >
          <div
            className="absolute left-0 top-0 bottom-0 w-0.5 rounded-full transition-opacity group-hover:opacity-70"
            style={{ backgroundColor: threadColor }}
          />
        </button>
      )}

      {/* Comment body — padded to clear thread bar */}
      <div className={depth > 0 ? "pl-2.5" : undefined}>
        {/* Collapsible area: header + body */}
        <div
          role={collapseOnTap ? "button" : undefined}
          tabIndex={collapseOnTap ? 0 : undefined}
          onClick={collapseOnTap ? () => !isEditing && setIsCollapsed(true) : undefined}
          onKeyDown={
            collapseOnTap
              ? (e) => e.key === "Enter" && !isEditing && setIsCollapsed(true)
              : undefined
          }
          className={cn(collapseOnTap && "cursor-pointer", isEditing && "cursor-default")}
          aria-label={
            collapseOnTap ? `Collapse comment by ${comment.author?.display_name}` : undefined
          }
        >
          {/* Comment header — single row with right-aligned meta */}
          <div className="flex items-center gap-1.5 mb-0.5">
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                if (comment.author?.id) setPopupUserId(comment.author.id);
              }}
              className="flex-shrink-0 cursor-pointer"
              aria-label={`View ${comment.author?.display_name || "user"}'s profile`}
            >
              <EntityAvatar entity={userToAvatarData(comment.author)} emojiSet="user" size="tiny" />
            </button>
            <span className="text-xs font-medium text-[var(--text-primary)] truncate max-w-[120px] sm:max-w-none">
              {comment.author?.display_name || "Unknown"}
            </span>
            {comment.is_edited && (
              <span className="text-[10px] text-[var(--text-muted)] italic">edited</span>
            )}

            {/* Right-aligned: dots menu + timestamp + upvote */}
            <div
              className="ml-auto flex items-center gap-1 flex-shrink-0"
              onClickCapture={(e) => e.stopPropagation()}
            >
              {/* Author actions menu */}
              {isAuthor && (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <button
                      className="flex items-center justify-center w-6 h-6 rounded text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--hover)] transition-colors focus:outline-none focus:ring-2 focus:ring-[var(--primary)]"
                      aria-label="More actions"
                    >
                      <DotsThree className="w-3.5 h-3.5" weight="bold" />
                    </button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent
                    align="end"
                    className="min-w-[140px] max-w-[calc(100vw-2rem)]"
                  >
                    {!isLocked && (
                      <DropdownMenuItem onClick={() => setIsEditing(true)}>
                        <PencilSimple className="w-4 h-4 mr-2" />
                        Edit
                      </DropdownMenuItem>
                    )}
                    <DropdownMenuItem onClick={handleDelete} className="text-[var(--error)]">
                      <Trash className="w-4 h-4 mr-2" />
                      Delete
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              )}

              <span className="text-xs text-[var(--text-muted)]" suppressHydrationWarning>
                {timeAgo}
              </span>

              {/* Inline upvote — larger tap target */}
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleVote();
                }}
                className={cn(
                  "flex flex-col items-center justify-center tabular-nums rounded min-w-[28px] px-1 py-0.5 -my-0.5 transition-colors",
                  "focus:outline-none focus:ring-2 focus:ring-[var(--primary)]",
                  hasUpvoted
                    ? "text-[var(--primary)]"
                    : "text-[var(--text-muted)] hover:text-[var(--text-secondary)]"
                )}
                aria-label={hasUpvoted ? "Remove vote" : "Upvote"}
                aria-pressed={hasUpvoted}
              >
                <CaretUp className="w-4 h-4" weight={hasUpvoted ? "fill" : "regular"} />
                <span className="text-xs font-semibold leading-none -mt-0.5">{localUpvotes}</span>
              </button>
            </div>
          </div>

          {/* Comment content */}
          {isEditing ? (
            <div className="mb-1.5" onClickCapture={(e) => e.stopPropagation()}>
              <SimpleRichTextEditor
                content={editContent}
                onChange={setEditContent}
                placeholder="Edit your comment..."
                className="mb-2"
                maxLength={TEXT_LIMITS.COMMENT}
              />
              <div className="flex flex-wrap gap-2">
                <Button
                  size="sm"
                  variant="club-accent"
                  onClick={handleEdit}
                  isLoading={isSubmitting}
                  disabled={isContentEmpty(editContent)}
                >
                  Save
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => {
                    setIsEditing(false);
                    setEditContent(comment.content);
                  }}
                >
                  Cancel
                </Button>
              </div>
            </div>
          ) : (
            <div
              className={cn(
                "text-xs sm:text-sm text-[var(--text-primary)] mb-1 break-words",
                comment.is_spoiler && "blur-sm hover:blur-none transition-all cursor-pointer"
              )}
            >
              <SimpleRichTextPreview content={comment.content} />
            </div>
          )}
        </div>

        {/* Comment actions — compact row */}
        <div className="flex items-center gap-0.5 mb-1">
          {!isLocked && (
            <button
              onClick={() => setIsReplying(!isReplying)}
              className="flex items-center gap-1 px-1.5 py-0.5 rounded text-xs text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--hover)] transition-colors focus:outline-none focus:ring-2 focus:ring-[var(--primary)]"
              aria-label="Reply to comment"
              aria-expanded={isReplying}
            >
              <ChatCircle className="w-3 h-3" />
              <span>Reply</span>
            </button>
          )}
        </div>

        {/* Reply form */}
        {isReplying && (
          <div className="mt-2 mb-1.5">
            <SimpleRichTextEditor
              content={replyContent}
              onChange={setReplyContent}
              placeholder="Write a reply..."
              className="mb-2"
              maxLength={TEXT_LIMITS.COMMENT}
            />
            <div className="flex flex-wrap gap-2">
              <Button
                size="sm"
                variant="club-accent"
                onClick={handleReply}
                isLoading={isSubmitting}
                disabled={isContentEmpty(replyContent)}
              >
                Reply
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => {
                  setIsReplying(false);
                  setReplyContent("");
                }}
              >
                Cancel
              </Button>
            </div>
          </div>
        )}

        {/* Nested replies */}
        {replies.length > 0 &&
          (depth >= continueThreadDepth ? (
            <div className="mt-2 pl-2.5">
              <Link
                href={`/club/${clubSlug}/discuss/${threadSlug}/comment/${comment.id}`}
                className="inline-flex items-center gap-1.5 text-sm text-[var(--club-accent,var(--primary))] hover:underline transition-colors"
              >
                Continue thread ({countTotalReplies(comment)} more)
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          ) : (
            <div className="mt-1 space-y-1">
              {replies.slice(0, visibleReplyCount).map((reply) => (
                <DiscussionComment
                  key={reply.id}
                  comment={reply}
                  threadId={threadId}
                  currentUserId={currentUserId}
                  depth={depth + 1}
                  onReplyAdded={onReplyAdded}
                  clubSlug={clubSlug}
                  threadSlug={threadSlug}
                  discussionPreferences={discussionPreferences}
                  isLocked={isLocked}
                />
              ))}
              {replies.length > visibleReplyCount && (
                <button
                  onClick={() => setVisibleReplyCount((prev) => prev + 10)}
                  className="ml-2.5 mt-1 text-xs text-[var(--club-accent,var(--primary))] hover:underline transition-colors"
                >
                  Load more replies ({replies.length - visibleReplyCount} remaining)
                </button>
              )}
            </div>
          ))}
      </div>

      {/* User ID card popup */}
      {popupUserId && (
        <UserPopupModal
          userId={popupUserId}
          open={!!popupUserId}
          onOpenChange={(open) => {
            if (!open) setPopupUserId(null);
          }}
        />
      )}
    </div>
  );
}

function getTimeAgo(date: Date): string {
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffSecs = Math.floor(diffMs / 1000);
  const diffMins = Math.floor(diffSecs / 60);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);
  const diffMonths = Math.floor(diffDays / 30);
  const diffYears = Math.floor(diffDays / 365);

  if (diffYears > 0) return `${diffYears}y ago`;
  if (diffMonths > 0) return `${diffMonths}mo ago`;
  if (diffDays > 0) return `${diffDays}d ago`;
  if (diffHours > 0) return `${diffHours}h ago`;
  if (diffMins > 0) return `${diffMins}m ago`;
  return "just now";
}
