import { PushPin, Plus, ChatCircle, CaretRight } from "@phosphor-icons/react/dist/ssr";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/shared/EmptyState";
import { DiscussionAvatar, type DiscussionAvatarType } from "./DiscussionAvatar";

interface Discussion {
  id: string;
  slug: string | null;
  title: string;
  content: string | null;
  thread_type: string | null;
  is_pinned: boolean | null;
  is_locked: boolean | null;
  is_spoiler: boolean | null;
  comment_count: number | null;
  created_at: string;
  updated_at: string;
  author: {
    id: string;
    display_name: string | null;
    avatar_url: string | null;
  } | null;
  // Avatar data
  avatar_type?: DiscussionAvatarType;
  avatar_url?: string | null;
  avatar_text?: string | null;
}

interface CollapsibleRecentDiscussionsProps {
  discussions: Discussion[];
  clubSlug: string;
  /** @deprecated No longer used - sections are always expanded */
  defaultExpanded?: boolean;
}

export function CollapsibleRecentDiscussions({
  discussions,
  clubSlug,
}: CollapsibleRecentDiscussionsProps) {
  // Show max 3 discussions: prioritize pinned, then fill with recent
  const pinnedDiscussions = discussions.filter((d) => d.is_pinned);
  const nonPinnedDiscussions = discussions.filter((d) => !d.is_pinned);

  // Take up to 3 pinned, then fill remaining slots with non-pinned
  const pinnedToShow = pinnedDiscussions.slice(0, 3);
  const remainingSlots = 3 - pinnedToShow.length;
  const recentToShow = remainingSlots > 0 ? nonPinnedDiscussions.slice(0, remainingSlots) : [];

  const displayDiscussions = [...pinnedToShow, ...recentToShow];

  return (
    <div>
      <div className="flex items-center justify-between py-2 gap-2">
        <h3 className="text-sm font-semibold text-[var(--club-accent,var(--text-primary))] uppercase tracking-wide whitespace-nowrap">
          Discussions
        </h3>
        <Link
          href={`/club/${clubSlug}/discuss`}
          className="text-sm text-[var(--club-accent,var(--primary))] transition-colors hover:underline flex items-center gap-0.5"
        >
          All
          <CaretRight className="w-3 h-3" />
        </Link>
      </div>

      {displayDiscussions.length > 0 ? (
        <div className="pt-1 space-y-1">
          {displayDiscussions.map((thread) => (
            <Link
              key={thread.id}
              href={`/club/${clubSlug}/discuss/${thread.slug || thread.id}`}
              className="flex items-start gap-2.5 py-2 px-1 rounded-lg transition-colors hover:bg-[var(--surface-1)]/50 group"
            >
              {/* Avatar */}
              <DiscussionAvatar
                type={thread.avatar_type || "generic"}
                imageUrl={thread.avatar_url}
                themeText={thread.avatar_text}
                alt={thread.title}
              />

              {/* Content */}
              <div className="flex-1 min-w-0">
                {/* Title row with pin */}
                <div className="flex items-center gap-1.5">
                  {thread.is_pinned && (
                    <PushPin
                      className="w-3 h-3 shrink-0 text-[var(--club-accent,var(--primary))]"
                      weight="fill"
                    />
                  )}
                  <span className="text-sm font-medium text-[var(--text-primary)] truncate group-hover:text-[var(--accent)] transition-colors">
                    {thread.title}
                  </span>
                </div>

                {/* Meta row - author and comments */}
                <div className="flex items-center gap-2 mt-0.5">
                  <span className="text-xs text-[var(--text-muted)] truncate">
                    {thread.author?.display_name || "Unknown"}
                  </span>
                  {(thread.comment_count ?? 0) > 0 && (
                    <>
                      <span className="text-[var(--text-muted)]">·</span>
                      <span className="text-xs text-[var(--text-muted)] flex items-center gap-0.5">
                        <ChatCircle className="w-3 h-3" />
                        {thread.comment_count}
                      </span>
                    </>
                  )}
                </div>
              </div>
            </Link>
          ))}
        </div>
      ) : (
        <EmptyState
          icon={ChatCircle}
          title="No discussions yet"
          variant="inline"
          action={
            <Button asChild size="sm" variant="outline">
              <Link href={`/club/${clubSlug}/discuss`}>
                <Plus className="w-4 h-4 mr-1" />
                Start a Discussion
              </Link>
            </Button>
          }
        />
      )}
    </div>
  );
}
