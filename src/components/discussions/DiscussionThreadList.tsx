"use client";

import * as React from "react";
import Link from "next/link";
import { EmptyState } from "@/components/shared/EmptyState";
import Image from "next/image";
import { useRouter } from "next/navigation";
import {
  ChatCircle,
  PushPin,
  Lock,
  Warning,
  Plus,
  FilmReel,
  User,
  CalendarBlank,
  MusicNote,
  Megaphone,
  Funnel,
  Eye,
  CheckCircle,
  CaretRight,
} from "@phosphor-icons/react/dist/ssr";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type {
  DiscussionThread,
  DiscussionTagType,
  DiscussionThreadTag,
  SpoilerState,
} from "@/app/actions/discussions";
import { revealThreadSpoilers } from "@/app/actions/discussions";
import { markMovieWatched } from "@/app/actions/endless-festival/watch-history";
import { stripHtml } from "@/lib/text/formatting";

// Tag type config for display - using design system colors
const TAG_TYPE_CONFIG: Record<
  DiscussionTagType,
  { label: string; icon: React.ReactNode; color: string }
> = {
  movie: {
    label: "Movies",
    icon: <FilmReel className="w-3 h-3" />,
    color: "bg-[var(--info)] text-white border-[var(--info)]",
  },
  actor: {
    label: "Actors",
    icon: <User className="w-3 h-3" />,
    color: "bg-[var(--accent)] text-white border-[var(--accent)]",
  },
  director: {
    label: "Directors",
    icon: <Megaphone className="w-3 h-3" />,
    color: "bg-[var(--warning)] text-white border-[var(--warning)]",
  },
  composer: {
    label: "Composers",
    icon: <MusicNote className="w-3 h-3" />,
    color: "bg-[var(--success)] text-white border-[var(--success)]",
  },
  festival: {
    label: "Festivals",
    icon: <CalendarBlank className="w-3 h-3" />,
    color: "bg-[var(--primary)] text-[var(--primary-foreground)] border-[var(--primary)]",
  },
};

// All filter options including 'all'
const FILTER_OPTIONS: Array<{
  value: DiscussionTagType | "all";
  label: string;
  icon: React.ReactNode;
}> = [
  { value: "all", label: "All", icon: <Funnel className="w-3 h-3" /> },
  { value: "movie", label: "Movies", icon: <FilmReel className="w-3 h-3" /> },
  { value: "actor", label: "Actors", icon: <User className="w-3 h-3" /> },
  { value: "director", label: "Directors", icon: <Megaphone className="w-3 h-3" /> },
  { value: "composer", label: "Composers", icon: <MusicNote className="w-3 h-3" /> },
  { value: "festival", label: "Festivals", icon: <CalendarBlank className="w-3 h-3" /> },
];

interface DiscussionThreadListProps {
  threads: DiscussionThread[];
  spoilerStates?: Record<string, SpoilerState>;
  clubSlug: string;
  currentUserId: string;
  onCreateThread?: () => void;
  emptyMessage?: string;
  // Filter props
  activeFilter?: DiscussionTagType | "all";
  onFilterChange?: (filter: DiscussionTagType | "all") => void;
  showFilterBar?: boolean;
  isEndlessFestival?: boolean;
}

export function DiscussionThreadList({
  threads,
  spoilerStates,
  clubSlug,

  currentUserId: _currentUserId,
  onCreateThread,
  emptyMessage = "No discussions yet. Start one!",
  activeFilter = "all",
  onFilterChange,
  showFilterBar = true,
  isEndlessFestival = false,
}: DiscussionThreadListProps) {
  // Filters are collapsed by default
  const [filtersExpanded, setFiltersExpanded] = React.useState(false);

  // Sort threads: pinned first, then by newest
  const sortedThreads = React.useMemo(() => {
    const sorted = [...threads];

    // Always show pinned threads first, then sort by most recent activity
    sorted.sort((a, b) => {
      if (a.is_pinned && !b.is_pinned) return -1;
      if (!a.is_pinned && b.is_pinned) return 1;
      return new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime();
    });

    return sorted;
  }, [threads]);

  return (
    <div className="space-y-3">
      {/* Header with filter bar and create button */}
      <div className="flex flex-col gap-2 mb-4">
        <div className="flex items-center justify-between gap-2">
          {/* Filter Toggle Button */}
          {showFilterBar && onFilterChange && (
            <button
              onClick={() => setFiltersExpanded(!filtersExpanded)}
              className={cn(
                "flex items-center gap-1.5 py-1.5 px-3 text-xs font-medium rounded-full border transition-colors",
                filtersExpanded || activeFilter !== "all"
                  ? "bg-[var(--surface-3)] text-[var(--text-primary)] font-semibold border-[var(--active-border)]"
                  : "bg-transparent text-[var(--text-secondary)] border-[var(--border)] hover:bg-[var(--surface-1)] hover:border-[var(--border-strong)]"
              )}
            >
              <Funnel className="w-3 h-3" />
              {activeFilter !== "all"
                ? FILTER_OPTIONS.find((o) => o.value === activeFilter)?.label || "Filter"
                : "Filter"}
              <CaretRight
                className={cn("w-3 h-3 transition-transform", filtersExpanded && "rotate-90")}
              />
            </button>
          )}

          {/* Create Button - Icon on mobile, full on desktop */}
          {onCreateThread && (
            <>
              {/* Mobile: Icon-only button - matches events/polls pages */}
              <Button
                size="icon"
                variant="club-accent"
                onClick={onCreateThread}
                className="h-7 w-7 rounded-full md:hidden"
              >
                <Plus className="h-3.5 w-3.5" />
              </Button>
              {/* Desktop: Full button with text */}
              <Button
                size="sm"
                variant="club-accent"
                onClick={onCreateThread}
                className="flex-shrink-0 hidden md:flex"
              >
                <Plus className="w-4 h-4 mr-1" />
                Create Post
              </Button>
            </>
          )}
        </div>

        {/* Collapsible Filter Options */}
        {showFilterBar && onFilterChange && filtersExpanded && (
          <div className="flex flex-wrap gap-1.5">
            {FILTER_OPTIONS.map((option) => (
              <button
                key={option.value}
                onClick={() => onFilterChange(option.value)}
                className={cn(
                  "flex items-center gap-1.5 py-1.5 px-3 text-xs font-medium rounded-full border transition-colors",
                  activeFilter === option.value
                    ? "bg-[var(--club-accent,var(--primary))] text-white border-[var(--club-accent,var(--primary))]"
                    : "bg-transparent text-[var(--text-secondary)] border-[var(--border)] hover:bg-[var(--surface-1)] hover:border-[var(--border-strong)]"
                )}
              >
                {option.icon}
                {option.label}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Thread list */}
      {sortedThreads.length === 0 ? (
        <EmptyState
          icon={ChatCircle}
          title={
            activeFilter !== "all"
              ? `No discussions tagged with ${FILTER_OPTIONS.find((o) => o.value === activeFilter)?.label.toLowerCase() || activeFilter}.`
              : emptyMessage || "No discussions yet"
          }
          variant="inline"
          action={
            onCreateThread ? (
              <Button size="sm" variant="club-accent" onClick={onCreateThread}>
                <Plus className="w-4 h-4 mr-1" />
                Start a Discussion
              </Button>
            ) : undefined
          }
        />
      ) : (
        <div className="space-y-3">
          {sortedThreads.map((thread) => (
            <ThreadListItem
              key={thread.id}
              thread={thread}
              clubSlug={clubSlug}
              spoilerState={spoilerStates?.[thread.id]}
              isEndlessFestival={isEndlessFestival}
            />
          ))}
        </div>
      )}
    </div>
  );
}

interface ThreadListItemProps {
  thread: DiscussionThread;
  clubSlug: string;
  spoilerState?: SpoilerState;
  isEndlessFestival?: boolean;
}

// Get display info for a tag
function getTagDisplayInfo(tag: DiscussionThreadTag): { name: string; imageUrl?: string | null } {
  if (tag.tag_type === "movie" && tag.movie) {
    return {
      name: `${tag.movie.title}${tag.movie.year ? ` (${tag.movie.year})` : ""}`,
      imageUrl: tag.movie.poster_url,
    };
  }
  if (["actor", "director", "composer"].includes(tag.tag_type) && tag.person) {
    return {
      name: tag.person.name,
      imageUrl: tag.person.profile_url,
    };
  }
  if (tag.tag_type === "festival" && tag.festival) {
    return { name: tag.festival.theme };
  }
  return { name: "Unknown" };
}

function ThreadListItem({ thread, clubSlug, spoilerState, isEndlessFestival }: ThreadListItemProps) {
  const router = useRouter();
  const [showGate, setShowGate] = React.useState(false);
  const [actionInProgress, setActionInProgress] = React.useState<string | null>(null);
  const timeAgo = getTimeAgo(new Date(thread.created_at));

  // Watch-gate: thread is gated if spoilerState says so (movie-tagged + unwatched)
  const isGated = spoilerState?.isSpoilered ?? false;
  const threadUrl = `/club/${clubSlug}/discuss/${thread.slug || thread.id}`;

  // Get tags - prefer new tags array, fall back to legacy fields
  const tags = thread.tags || [];
  const hasTags = tags.length > 0;
  const singleTag = tags.length === 1 ? tags[0] : null;

  // Find the movie tag if any (takes priority for thumbnail display)
  const movieTag = tags.find((t) => t.tag_type === "movie" && t.movie);

  // Legacy display
  const useLegacyDisplay = !hasTags;
  const hasLegacyMovie = useLegacyDisplay && thread.thread_type === "movie" && thread.movie;
  const hasLegacyPerson = useLegacyDisplay && thread.thread_type === "person" && thread.person;

  const handleClick = (e: React.MouseEvent) => {
    if (isGated && !showGate) {
      e.preventDefault();
      setShowGate(true);
    }
  };

  const handleMarkWatched = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!spoilerState?.movieTmdbId || actionInProgress) return;
    setActionInProgress("watched");
    await markMovieWatched(spoilerState.movieTmdbId);
    setShowGate(false);
    setActionInProgress(null);
    router.push(threadUrl);
    router.refresh();
  };

  const handleOverride = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (actionInProgress) return;
    setActionInProgress("override");
    await revealThreadSpoilers(thread.id);
    setShowGate(false);
    setActionInProgress(null);
    router.push(threadUrl);
  };

  // Determine thumbnail to show — movie posters take priority and span full card height
  const hasMoviePoster =
    !!movieTag?.movie?.poster_url || !!(hasLegacyMovie && thread.movie?.poster_url);

  const renderThumbnail = () => {
    // Movie tag takes priority (even with multiple tags)
    if (movieTag?.movie) {
      return movieTag.movie.poster_url ? (
        <Image
          src={movieTag.movie.poster_url}
          alt={movieTag.movie.title}
          fill
          className="object-cover"
          sizes="60px"
        />
      ) : (
        <div className="w-full h-full flex items-center justify-center bg-[var(--surface-2)]">
          <FilmReel className="w-5 h-5 text-[var(--text-muted)]" />
        </div>
      );
    }

    // Legacy movie
    if (hasLegacyMovie && thread.movie) {
      return thread.movie.poster_url ? (
        <Image
          src={thread.movie.poster_url}
          alt={thread.movie.title}
          fill
          className="object-cover"
          sizes="60px"
        />
      ) : (
        <div className="w-full h-full flex items-center justify-center bg-[var(--surface-2)]">
          <FilmReel className="w-5 h-5 text-[var(--text-muted)]" />
        </div>
      );
    }

    // Single person tag
    if (
      singleTag &&
      ["actor", "director", "composer"].includes(singleTag.tag_type) &&
      singleTag.person
    ) {
      return (
        <div className="relative w-12 h-12 rounded-full overflow-hidden bg-[var(--surface-2)]">
          {singleTag.person.profile_url ? (
            <Image
              src={singleTag.person.profile_url}
              alt={singleTag.person.name}
              fill
              className="object-cover"
              sizes="48px"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <User className="w-5 h-5 text-[var(--text-muted)]" />
            </div>
          )}
        </div>
      );
    }

    // Single festival tag
    if (singleTag?.tag_type === "festival") {
      return (
        <div className="relative w-12 h-12 rounded-lg overflow-hidden bg-[var(--surface-2)] flex items-center justify-center">
          <CalendarBlank className="w-6 h-6 text-[var(--text-muted)]" />
        </div>
      );
    }

    // Legacy person
    if (hasLegacyPerson && thread.person) {
      return (
        <div className="relative w-12 h-12 rounded-full overflow-hidden bg-[var(--surface-2)]">
          {thread.person?.profile_url ? (
            <Image
              src={thread.person.profile_url}
              alt={thread.person.name}
              fill
              className="object-cover"
              sizes="48px"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <User className="w-5 h-5 text-[var(--text-muted)]" />
            </div>
          )}
        </div>
      );
    }

    return null;
  };

  const showThumbnail = hasTags || hasLegacyMovie || hasLegacyPerson;

  // Strip legacy "Discussion" / "Festival Discussion:" prefix from auto-created titles
  const displayTitle = thread.title.replace(/^(Festival Discussion:\s*|Discussion[:\s]+)/i, "").trim();

  // Filter out movie tags from badge display when poster is shown
  let displayTags = hasMoviePoster ? tags.filter((t) => t.tag_type !== "movie") : [...tags];
  if (isEndlessFestival) {
    displayTags = displayTags.filter((t) => t.tag_type !== "festival");
  }

  return (
    <div className="relative rounded-lg border border-[var(--border)] bg-transparent hover:bg-[var(--hover)] hover:border-[var(--border-strong)] transition-colors shadow-[0_1px_0_var(--border)] p-2">
      <Link href={threadUrl} onClick={handleClick} className="block">
        <div className="flex gap-3 min-h-[84px]">
          {/* Movie poster — fixed 2:3 aspect ratio */}
          {hasMoviePoster && (
            <div className="relative w-[56px] aspect-[2/3] flex-shrink-0 rounded overflow-hidden bg-[var(--surface-2)]">
              {renderThumbnail()}
            </div>
          )}

          {/* Non-movie thumbnail */}
          {showThumbnail && !hasMoviePoster && (
            <div className="flex-shrink-0">{renderThumbnail()}</div>
          )}

          {/* Content */}
          <div className="flex-1 min-w-0 flex flex-col py-0.5 pr-1">
            {/* Top row: title + status badges */}
            <div className="flex items-start gap-1.5 mb-1">
              <h3 className="text-sm font-medium text-[var(--text-primary)] line-clamp-2 flex-1">
                {displayTitle}
              </h3>
              {/* Status Badges */}
              <div className="flex items-center gap-1 flex-shrink-0">
                {thread.is_pinned && (
                  <Badge variant="default" className="h-4 text-[10px] gap-0.5 px-1">
                    <PushPin className="w-2.5 h-2.5" />
                  </Badge>
                )}
                {thread.is_locked && (
                  <Badge variant="warning" className="h-4 text-[10px] gap-0.5 px-1">
                    <Lock className="w-2.5 h-2.5" />
                    Locked
                  </Badge>
                )}
                {isGated && !showGate && (
                  <Badge variant="spoiler" className="h-4 text-[10px] gap-0.5 px-1">
                    <Warning className="w-2.5 h-2.5" />
                    Unwatched
                  </Badge>
                )}
              </div>
            </div>

            {/* Preview */}
            <p className="text-xs text-[var(--text-muted)] line-clamp-1 mb-2">
              {stripHtml(thread.content)}
            </p>

            {/* Footer: comments + tags left, author right */}
            <div className="flex items-end justify-between gap-2 mt-auto">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="flex items-center gap-1 text-xs text-[var(--text-muted)]">
                  <ChatCircle className="w-3.5 h-3.5" />
                  {thread.comment_count} comments
                </span>

                {/* Tags display (movie tag hidden when poster is shown) */}
                {displayTags.length > 0 ? (
                  <div className="flex flex-wrap gap-1">
                    {displayTags.slice(0, 3).map((tag, index) => {
                      const config = TAG_TYPE_CONFIG[tag.tag_type];
                      const info = getTagDisplayInfo(tag);
                      return (
                        <Badge
                          key={`${tag.tag_type}-${tag.tmdb_id || tag.person_tmdb_id || tag.festival_id}-${index}`}
                          variant="outline"
                          className={`${config.color} h-4 text-[10px] gap-0.5 px-1.5`}
                        >
                          {config.icon}
                          <span className="max-w-[80px] truncate">{info.name}</span>
                        </Badge>
                      );
                    })}
                    {displayTags.length > 3 && (
                      <Badge variant="outline" className="h-4 text-[10px] px-1.5">
                        +{displayTags.length - 3} more
                      </Badge>
                    )}
                  </div>
                ) : !hasTags ? (
                  // Legacy badge (no tags at all)
                  <Badge variant="outline" className="h-4 text-[10px] capitalize px-1.5">
                    {thread.thread_type === "person" && thread.person_type
                      ? thread.person_type
                      : thread.thread_type}
                  </Badge>
                ) : null}
              </div>

              {/* Author + time — bottom right */}
              <span className="text-[11px] text-[var(--text-muted)] flex-shrink-0 whitespace-nowrap">
                {thread.author?.display_name || "Unknown"} · {timeAgo}
              </span>
            </div>
          </div>
        </div>
      </Link>

      {/* Spoiler gate overlay — fits within the card */}
      {showGate && (
        <div className="absolute inset-0 z-10 rounded-lg bg-[var(--card)]/95 backdrop-blur-sm flex items-center justify-center p-3">
          <div className="flex items-center gap-3 text-center">
            <Warning className="w-4 h-4 text-amber-500 flex-shrink-0" />
            <p className="text-xs text-[var(--text-primary)]">
              Contains spoilers for{" "}
              <span className="font-medium">{spoilerState?.movieTitle || "this movie"}</span>
            </p>
            <div className="flex items-center gap-1.5 flex-shrink-0">
              {spoilerState?.movieTmdbId && (
                <button
                  onClick={handleMarkWatched}
                  disabled={!!actionInProgress}
                  className="inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-medium rounded-md bg-[var(--club-accent,var(--primary))] text-white hover:opacity-90 transition-colors disabled:opacity-50"
                >
                  <CheckCircle className="w-3 h-3" />
                  {actionInProgress === "watched" ? "..." : "Watched"}
                </button>
              )}
              <button
                onClick={handleOverride}
                disabled={!!actionInProgress}
                className="inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-medium rounded-md border border-[var(--border)] text-[var(--text-secondary)] hover:bg-[var(--surface-1)] transition-colors disabled:opacity-50"
              >
                <Eye className="w-3 h-3" />
                {actionInProgress === "override" ? "..." : "View"}
              </button>
              <button
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  setShowGate(false);
                }}
                className="text-[var(--text-muted)] hover:text-[var(--text-secondary)] p-1"
              >
                ✕
              </button>
            </div>
          </div>
        </div>
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
