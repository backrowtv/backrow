"use client";

import * as React from "react";
import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import Image from "next/image";
import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import { EmptyState } from "@/components/shared/EmptyState";
import { CustomizeHint } from "@/components/ui/CustomizeHint";
import { useUserProfile } from "@/components/auth/UserProfileProvider";
import {
  ChatCircle,
  DotsThree,
  PushPin,
  Lock,
  FilmReel,
  User,
  CalendarBlank,
  Trash,
  CheckCircle,
  Warning,
  Eye,
} from "@phosphor-icons/react/dist/ssr";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { DiscussionComment } from "./DiscussionComment";
import { cn } from "@/lib/utils";

// Dynamic import for heavy rich text editor
const SimpleRichTextEditor = dynamic(
  () => import("@/components/movies/SimpleRichTextEditor").then((mod) => mod.SimpleRichTextEditor),
  {
    loading: () => (
      <div className="h-[100px] bg-[var(--surface-1)] rounded-lg border border-[var(--border)] animate-pulse" />
    ),
    ssr: false,
  }
);
const SimpleRichTextPreview = dynamic(
  () => import("@/components/movies/SimpleRichTextEditor").then((mod) => mod.SimpleRichTextPreview),
  { ssr: false }
);
import { getPersonUrl } from "@/lib/persons/slugs";
import {
  getCommentsByThread,
  createComment,
  updateThread,
  deleteThread,
  revealThreadSpoilers,
} from "@/app/actions/discussions";
import { markMovieWatched } from "@/app/actions/endless-festival/watch-history";
import type {
  DiscussionThread as ThreadType,
  DiscussionComment as CommentType,
  DiscussionThreadTag,
  SpoilerState,
} from "@/app/actions/discussions";
import { isContentEmpty, TEXT_LIMITS } from "@/lib/text/formatting";

interface DiscussionThreadProps {
  thread: ThreadType;
  spoilerState?: SpoilerState;
  currentUserId: string;
  isAdmin?: boolean;
  embedded?: boolean; // For embedding in movie/festival pages
  showFullContent?: boolean;
  clubSlug?: string; // For redirecting after deletion
  discussionPreferences?: import("@/lib/discussion-preferences").DiscussionPreferences;
}

// Get display info for a tag
function getTagDisplayInfo(tag: DiscussionThreadTag): {
  name: string;
  imageUrl?: string | null;
  href?: string;
} {
  if (tag.tag_type === "movie" && tag.movie) {
    return {
      name: `${tag.movie.title}${tag.movie.year ? ` (${tag.movie.year})` : ""}`,
      imageUrl: tag.movie.poster_url,
      href: `/movies/${tag.movie.tmdb_id}`,
    };
  }
  if (["actor", "director", "composer"].includes(tag.tag_type) && tag.person) {
    return {
      name: tag.person.name,
      imageUrl: tag.person.profile_url,
      href: getPersonUrl(tag.person.tmdb_id, tag.person.slug),
    };
  }
  if (tag.tag_type === "festival" && tag.festival) {
    return {
      name: tag.festival.theme,
      href: tag.festival.slug ? `/festival/${tag.festival.slug}` : undefined,
    };
  }
  return { name: "Unknown" };
}

export function DiscussionThread({
  thread,
  spoilerState,
  currentUserId,
  isAdmin = false,
  embedded = false,
  showFullContent = true,
  clubSlug,
  discussionPreferences,
}: DiscussionThreadProps) {
  const router = useRouter();
  const { isHintDismissed } = useUserProfile();
  const [comments, setComments] = useState<CommentType[]>([]);
  const [isLoadingComments, setIsLoadingComments] = useState(false);
  const [showComments, setShowComments] = useState(showFullContent);
  const [isAddingComment, setIsAddingComment] = useState(false);
  const [visibleCommentCount, setVisibleCommentCount] = useState(20);
  const [newComment, setNewComment] = useState("");
  const [sortBy, setSortBy] = useState<"new" | "old" | "top">("top");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [spoilerDismissed, setSpoilerDismissed] = useState(false);
  const [spoilerAction, setSpoilerAction] = useState<string | null>(null);
  const isAuthor = thread.author_id === currentUserId;
  const canModerate = isAdmin || isAuthor;

  // Get tags - prefer new tags array, fall back to legacy fields
  const tags = thread.tags || [];
  const hasTags = tags.length > 0;

  // For single tag display
  const singleTag = tags.length === 1 ? tags[0] : null;
  const singleTagInfo = singleTag ? getTagDisplayInfo(singleTag) : null;

  // Fall back to legacy display for threads without tags
  const useLegacyDisplay = !hasTags && (thread.movie || thread.person);

  const loadComments = useCallback(async () => {
    setIsLoadingComments(true);
    const result = await getCommentsByThread(thread.id, { sortBy });
    if ("data" in result) {
      setComments(result.data);
    }
    setIsLoadingComments(false);
  }, [thread.id, sortBy]);

  useEffect(() => {
    if (showComments && showFullContent) {
      loadComments();
    }
  }, [showComments, showFullContent, loadComments]);

  const handleAddComment = async () => {
    if (isContentEmpty(newComment) || isSubmitting || thread.is_locked) return;

    setIsSubmitting(true);
    const formData = new FormData();
    formData.append("threadId", thread.id);
    formData.append("content", newComment);

    const result = await createComment(null, formData);

    if ("success" in result && result.success && result.comment) {
      // Add the new comment to the top of the list without re-fetching all comments
      const newCommentWithReplies = { ...result.comment, replies: [] };
      setComments((prev) => [newCommentWithReplies, ...prev]);
      setNewComment("");
      setIsAddingComment(false);
    }
    setIsSubmitting(false);
  };

  const handlePin = async () => {
    await updateThread(thread.id, { is_pinned: !thread.is_pinned });
    router.refresh();
  };

  const handleLock = async () => {
    await updateThread(thread.id, { is_locked: !thread.is_locked });
    router.refresh();
  };

  const handleDelete = async () => {
    const result = await deleteThread(thread.id);
    if ("success" in result && result.success && clubSlug) {
      router.push(`/club/${clubSlug}/discuss`);
      router.refresh();
    }
  };

  const timeAgo = getTimeAgo(new Date(thread.created_at));

  // Determine what icon/image to show
  const renderThreadIcon = () => {
    // Find the first movie tag (even if there are multiple tags)
    const movieTag = tags.find((t) => t.tag_type === "movie" && t.movie);
    const movieTagInfo = movieTag ? getTagDisplayInfo(movieTag) : null;

    // Movie tag present (regardless of other tags): show poster
    if (movieTag?.movie) {
      return (
        <Link href={movieTagInfo?.href || "#"} className="flex-shrink-0 group">
          <div className="relative w-12 h-[72px] sm:w-16 sm:h-24 rounded overflow-hidden bg-[var(--surface-2)] shadow-sm ring-1 ring-[var(--border)] group-hover:ring-[var(--club-accent,var(--primary))] transition-colors">
            {movieTag.movie.poster_url ? (
              <Image
                src={movieTag.movie.poster_url}
                alt={movieTag.movie.title}
                fill
                className="object-cover"
                sizes="64px"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center">
                <FilmReel className="w-5 h-5 sm:w-6 sm:h-6 text-[var(--text-muted)]" />
              </div>
            )}
          </div>
        </Link>
      );
    }

    // Single person tag: show profile pic
    if (
      singleTag &&
      ["actor", "director", "composer"].includes(singleTag.tag_type) &&
      singleTag.person
    ) {
      return (
        <Link href={singleTagInfo?.href || "#"} className="flex-shrink-0 group">
          <div className="relative w-12 h-12 sm:w-16 sm:h-16 rounded-full overflow-hidden bg-[var(--surface-2)] shadow-sm ring-1 ring-[var(--border)] group-hover:ring-[var(--club-accent,var(--primary))] transition-colors">
            {singleTag.person.profile_url ? (
              <Image
                src={singleTag.person.profile_url}
                alt={singleTag.person.name}
                fill
                className="object-cover"
                sizes="64px"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center">
                <User className="w-5 h-5 sm:w-6 sm:h-6 text-[var(--text-muted)]" />
              </div>
            )}
          </div>
        </Link>
      );
    }

    // Single festival tag: show calendar icon
    if (singleTag?.tag_type === "festival") {
      return (
        <div className="relative w-12 h-12 sm:w-16 sm:h-16 rounded-lg overflow-hidden bg-[var(--surface-2)] shadow-sm ring-1 ring-[var(--border)] flex items-center justify-center flex-shrink-0">
          <CalendarBlank className="w-6 h-6 sm:w-8 sm:h-8 text-[var(--text-muted)]" />
        </div>
      );
    }

    // Legacy display: movie poster
    if (useLegacyDisplay && thread.movie) {
      return (
        <Link href={`/movies/${thread.movie.tmdb_id}`} className="flex-shrink-0 group">
          <div className="relative w-12 h-[72px] sm:w-16 sm:h-24 rounded overflow-hidden bg-[var(--surface-2)] shadow-sm ring-1 ring-[var(--border)] group-hover:ring-[var(--club-accent,var(--primary))] transition-colors">
            {thread.movie.poster_url ? (
              <Image
                src={thread.movie.poster_url}
                alt={thread.movie.title}
                fill
                className="object-cover"
                sizes="64px"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center">
                <FilmReel className="w-5 h-5 sm:w-6 sm:h-6 text-[var(--text-muted)]" />
              </div>
            )}
          </div>
        </Link>
      );
    }

    // Legacy display: person profile
    if (useLegacyDisplay && thread.person) {
      return (
        <Link
          href={getPersonUrl(thread.person.tmdb_id, thread.person.slug)}
          className="flex-shrink-0 group"
        >
          <div className="relative w-12 h-12 sm:w-16 sm:h-16 rounded-full overflow-hidden bg-[var(--surface-2)] shadow-sm ring-1 ring-[var(--border)] group-hover:ring-[var(--club-accent,var(--primary))] transition-colors">
            {thread.person.profile_url ? (
              <Image
                src={thread.person.profile_url}
                alt={thread.person.name}
                fill
                className="object-cover"
                sizes="64px"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center">
                <User className="w-5 h-5 sm:w-6 sm:h-6 text-[var(--text-muted)]" />
              </div>
            )}
          </div>
        </Link>
      );
    }

    // No tags and no legacy: generic chat icon
    return null;
  };

  // Spoiler gate: block access to thread content if user hasn't watched the movie
  if (spoilerState?.isSpoilered && !spoilerDismissed) {
    return (
      <article
        className={cn(
          "rounded-lg border border-[var(--border)] bg-[var(--card)]",
          embedded && "border-0 bg-transparent"
        )}
      >
        <div className="p-6 sm:p-8 flex flex-col items-center text-center gap-3">
          <Warning className="w-8 h-8 text-amber-500" />
          <h2 className="text-base font-semibold text-[var(--text-primary)]">Spoiler Warning</h2>
          <p className="text-sm text-[var(--text-muted)] max-w-sm">
            You haven&apos;t watched{" "}
            <span className="font-medium text-[var(--text-secondary)]">
              {spoilerState.movieTitle || "this movie"}
            </span>{" "}
            yet. This discussion may contain spoilers.
          </p>
          <div className="flex items-center gap-2 mt-2">
            {spoilerState.movieTmdbId && (
              <Button
                size="sm"
                variant="club-accent"
                disabled={!!spoilerAction}
                onClick={async () => {
                  setSpoilerAction("watched");
                  await markMovieWatched(spoilerState.movieTmdbId!);
                  setSpoilerDismissed(true);
                  setSpoilerAction(null);
                  router.refresh();
                }}
              >
                <CheckCircle className="w-4 h-4 mr-1" />
                {spoilerAction === "watched" ? "Marking..." : "Mark as Watched"}
              </Button>
            )}
            <Button
              size="sm"
              variant="outline"
              disabled={!!spoilerAction}
              onClick={async () => {
                setSpoilerAction("override");
                await revealThreadSpoilers(thread.id);
                setSpoilerDismissed(true);
                setSpoilerAction(null);
              }}
            >
              <Eye className="w-4 h-4 mr-1" />
              {spoilerAction === "override" ? "Opening..." : "View Anyway"}
            </Button>
          </div>
        </div>
      </article>
    );
  }

  return (
    <article
      className={cn(
        "rounded-lg border border-[var(--border)] bg-[var(--card)]",
        embedded && "border-0 bg-transparent"
      )}
    >
      {/* Thread header */}
      <div className={cn("p-3 sm:p-4", embedded && "px-0")}>
        {/* Header row: Poster + Title + Menu */}
        <div className="flex gap-3">
          {/* Left side - Entity Icon */}
          {showFullContent && renderThreadIcon()}

          {/* Right side - Title, content, meta */}
          <div className="flex-1 min-w-0 flex flex-col">
            {/* Title + Menu */}
            <div className="flex items-start justify-between gap-2">
              <h2 className="text-base sm:text-lg font-semibold text-[var(--text-primary)] flex-1 min-w-0 break-words">
                {thread.title}
              </h2>

              {/* Menu - always accessible */}
              {canModerate && (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <button className="p-2 -mr-2 text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--surface-1)] rounded-md transition-colors flex-shrink-0">
                      <DotsThree className="w-5 h-5" weight="bold" />
                    </button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent
                    align="end"
                    className="min-w-[160px] max-w-[calc(100vw-2rem)]"
                  >
                    {isAdmin && (
                      <>
                        <DropdownMenuItem onClick={handlePin}>
                          <PushPin className="w-4 h-4 mr-2" />
                          {thread.is_pinned ? "Unpin" : "Pin"}
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={handleLock}>
                          <Lock className="w-4 h-4 mr-2" />
                          {thread.is_locked ? "Unlock" : "Lock"}
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                      </>
                    )}
                    <DropdownMenuItem onClick={handleDelete} className="text-[var(--error)]">
                      <Trash className="w-4 h-4 mr-2" />
                      Delete
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              )}
            </div>

            {/* Content */}
            {showFullContent && (
              <div className={cn("text-sm text-[var(--text-primary)] break-words flex-1 mt-1")}>
                <SimpleRichTextPreview content={thread.content} />
              </div>
            )}

            {/* Author, time, status badges - bottom right */}
            <div className="flex flex-wrap items-center justify-end gap-x-2 gap-y-1 mt-2">
              {thread.is_pinned && (
                <Badge variant="default" className="h-5 text-[10px] gap-1 px-1.5">
                  <PushPin className="w-3 h-3" />
                </Badge>
              )}
              {thread.is_locked && (
                <Badge variant="warning" className="h-5 text-[10px] gap-1 px-1.5">
                  <Lock className="w-3 h-3" />
                  Locked
                </Badge>
              )}
              <span className="text-xs text-[var(--text-secondary)] font-medium">
                {thread.author?.display_name || "Unknown"}
              </span>
              <span className="text-xs text-[var(--text-muted)]">•</span>
              <span className="text-xs text-[var(--text-secondary)]" suppressHydrationWarning>
                {timeAgo}
              </span>
            </div>
          </div>
        </div>

        {/* Comments count and reply button - separate row on mobile for better tap target */}
        <div className="mt-3 pt-3 border-t border-[var(--border)]">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setShowComments(!showComments)}
              className="flex items-center gap-1.5 text-sm text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors"
            >
              <ChatCircle className="w-4 h-4" />
              {thread.comment_count} {thread.comment_count === 1 ? "comment" : "comments"}
            </button>

            {/* Reply button - only show when thread not locked */}
            {!thread.is_locked && (
              <button
                onClick={() => {
                  setShowComments(true);
                  setIsAddingComment(!isAddingComment);
                }}
                className="flex items-center gap-1.5 text-sm text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors"
              >
                <ChatCircle className="w-4 h-4" />
                Reply
              </button>
            )}

            {/* Sort dropdown - right-aligned */}
            {showComments && comments.length > 0 && (
              <div className="flex items-center gap-2 ml-auto">
                <span className="text-xs text-[var(--text-muted)]">Sort:</span>
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value as "new" | "old" | "top")}
                  className="text-xs bg-transparent border border-[var(--border)] rounded px-2 py-1.5 text-[var(--text-primary)]"
                >
                  <option value="top">Top</option>
                  <option value="new">New</option>
                  <option value="old">Old</option>
                </select>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Comments section */}
      {showComments && showFullContent && (
        <div
          className={cn(
            "border-t border-[var(--border)] px-1.5 py-3 sm:p-4",
            embedded && "border-0 px-0"
          )}
        >
          {/* New comment form - shown only when isAddingComment is true */}
          {!thread.is_locked && isAddingComment && (
            <div className="mb-4">
              <SimpleRichTextEditor
                content={newComment}
                onChange={setNewComment}
                placeholder="What are your thoughts?"
                className="mb-2"
                maxLength={TEXT_LIMITS.COMMENT}
              />
              <div className="flex flex-wrap gap-2">
                <Button
                  size="sm"
                  variant="club-accent"
                  onClick={handleAddComment}
                  isLoading={isSubmitting}
                  disabled={isContentEmpty(newComment)}
                >
                  Comment
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => {
                    setIsAddingComment(false);
                    setNewComment("");
                  }}
                >
                  Cancel
                </Button>
              </div>
            </div>
          )}

          {/* Locked thread message */}
          {thread.is_locked && (
            <div className="mb-4 p-3 rounded-md bg-[var(--surface-2)] text-center">
              <Lock className="w-4 h-4 inline-block mr-1.5 text-[var(--text-muted)]" />
              <span className="text-sm text-[var(--text-muted)]">This thread is locked.</span>
            </div>
          )}

          {/* Comments list */}
          {isLoadingComments ? (
            <div className="space-y-4">
              {[1, 2, 3].map((i) => (
                <div key={i} className="animate-pulse">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="w-6 h-6 rounded-full bg-[var(--surface-3)]" />
                    <div className="w-20 h-3 rounded bg-[var(--surface-3)]" />
                  </div>
                  <div className="w-full h-12 rounded bg-[var(--surface-3)]" />
                </div>
              ))}
            </div>
          ) : comments.length === 0 ? (
            <EmptyState
              icon={ChatCircle}
              title="No comments yet"
              message="Be the first to share your thoughts!"
              variant="inline"
            />
          ) : (
            <div className="space-y-4">
              <CustomizeHint
                hintKey="discussion-customize-hint"
                initialDismissed={isHintDismissed("discussion-customize-hint")}
                href="/profile/settings/display"
                tipPrefix="Tip: You can"
                linkText="customize comment collapse & upvote behavior"
              />
              {comments.slice(0, visibleCommentCount).map((comment) => (
                <DiscussionComment
                  key={comment.id}
                  comment={comment}
                  threadId={thread.id}
                  currentUserId={currentUserId}
                  onReplyAdded={loadComments}
                  clubSlug={clubSlug || ""}
                  threadSlug={thread.slug || thread.id}
                  discussionPreferences={discussionPreferences}
                  isLocked={thread.is_locked || false}
                />
              ))}
              {comments.length > visibleCommentCount && (
                <button
                  className="w-full py-2 text-sm text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors"
                  onClick={() => setVisibleCommentCount((prev) => prev + 10)}
                >
                  Load more comments ({comments.length - visibleCommentCount} remaining)
                </button>
              )}
            </div>
          )}
        </div>
      )}
    </article>
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
