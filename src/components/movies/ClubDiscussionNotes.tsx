"use client";

import { ChatCircle } from "@phosphor-icons/react";
import Link from "next/link";
import { EmptyState } from "@/components/shared/EmptyState";
import { EntityAvatar } from "@/components/ui/entity-avatar";
import { clubToAvatarData } from "@/lib/avatar-helpers";
import { DateDisplay } from "@/components/ui/date-display";

interface ClubDiscussion {
  id: string;
  title: string;
  slug: string | null;
  club_id: string;
  club_name: string;
  club_slug: string | null;
  club_avatar_url?: string | null;
  club_avatar_icon?: string | null;
  club_avatar_color_index?: number | null;
  club_avatar_border_color_index?: number | null;
  comment_count: number;
  created_at?: string;
  author?: {
    display_name: string;
    avatar_url?: string | null;
  } | null;
}

interface ClubDiscussionNotesProps {
  tmdbId: number;
  discussions: ClubDiscussion[];
  userClubs: Array<{ id: string; name: string }>;
  currentUserId?: string;
}

export function ClubDiscussionNotes({ discussions, userClubs }: ClubDiscussionNotesProps) {
  // If user isn't in any clubs, don't show this section
  if (userClubs.length === 0) {
    return null;
  }

  // No discussions to show
  if (discussions.length === 0) {
    return (
      <div className="space-y-3">
        <h2 className="text-sm font-semibold text-[var(--text-primary)] uppercase tracking-wide">
          Club Discussions
        </h2>
        <EmptyState icon={ChatCircle} title="No discussions in your clubs yet" variant="compact" />
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <h2 className="text-sm font-semibold text-[var(--text-primary)] uppercase tracking-wide">
        Club Discussions
      </h2>

      <div className="space-y-2">
        {discussions.map((discussion) => {
          // Build the link to the discussion thread
          const threadIdentifier = discussion.slug || discussion.id;
          const threadUrl = discussion.club_slug
            ? `/club/${discussion.club_slug}/discuss/${threadIdentifier}`
            : "#";

          return (
            <Link
              key={discussion.id}
              href={threadUrl}
              className="block px-3 pt-1.5 pb-2.5 rounded-lg border border-[var(--border)] bg-transparent hover:bg-[var(--hover)] hover:border-[var(--border-strong)] transition-colors"
            >
              <div className="flex gap-3">
                {/* Club Avatar */}
                <div className="flex-shrink-0">
                  <EntityAvatar
                    entity={clubToAvatarData({
                      name: discussion.club_name,
                      picture_url: discussion.club_avatar_url,
                      avatar_icon: discussion.club_avatar_icon,
                      avatar_color_index: discussion.club_avatar_color_index,
                      avatar_border_color_index: discussion.club_avatar_border_color_index,
                    })}
                    emojiSet="club"
                    size="sm"
                  />
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  {/* Club name */}
                  <span className="text-xs font-medium text-[var(--text-secondary)]">
                    {discussion.club_name}
                  </span>

                  {/* Title */}
                  <h3 className="text-sm font-medium text-[var(--text-primary)] mt-0.5 mb-1.5 line-clamp-2">
                    {discussion.title}
                  </h3>

                  {/* Footer: comments left, author/date right */}
                  <div className="flex items-center justify-between">
                    <span className="flex items-center gap-1 text-xs text-[var(--text-muted)]">
                      <ChatCircle className="w-3.5 h-3.5" />
                      {discussion.comment_count}{" "}
                      {discussion.comment_count === 1 ? "comment" : "comments"}
                    </span>
                    {(discussion.author || discussion.created_at) && (
                      <span className="flex items-center gap-1 text-xs text-[var(--text-muted)]">
                        {discussion.author && <span>{discussion.author.display_name}</span>}
                        {discussion.author && discussion.created_at && <span>·</span>}
                        {discussion.created_at && (
                          <DateDisplay date={discussion.created_at} format="relative" />
                        )}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
