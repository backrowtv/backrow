"use client";

import React, { memo } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { Database } from "@/types/database";
import { ClickableUserAvatar } from "@/components/ui/clickable-user-avatar";
import { userToAvatarData, type AvatarData } from "@/lib/avatar-helpers";
import { DateDisplay } from "@/components/ui/date-display";
import { FilmSlate } from "@phosphor-icons/react/dist/ssr";
import {
  formatActivityVerbiage,
  getActionPhraseWordCount,
  HIDDEN_ACTIVITY_TYPES,
  renderWithBoldQuotes,
  type ActivityDetails,
} from "@/lib/activity/activity-verbiage";
import {
  getActivityDisplayType,
  getMoviePosterUrl,
  shouldShowAsClubActivity,
} from "@/lib/activity/activity-display";
import { getActivityNavigationUrl } from "@/lib/activity/activity-navigation";

type ActivityLog = Database["public"]["Tables"]["activity_log"]["Row"];
type User = Database["public"]["Tables"]["users"]["Row"];

interface ActivityItemProps {
  activity: ActivityLog & {
    users: User | null;
  };
  currentUserId?: string;
}

/**
 * ActivityItem - Memoized for performance in long activity feeds.
 * Only re-renders when activity data or currentUserId changes.
 */
export const ActivityItem = memo(function ActivityItem({
  activity,
  currentUserId,
}: ActivityItemProps) {
  const router = useRouter();
  const user = activity.users;
  const isCurrentUser = currentUserId && activity.user_id === currentUserId;
  const userName = isCurrentUser ? "You" : user?.display_name || user?.email || "Unknown User";

  const action = activity.action || "";

  // Filter out hidden activity types
  if (HIDDEN_ACTIVITY_TYPES.includes(action as (typeof HIDDEN_ACTIVITY_TYPES)[number])) {
    return null;
  }

  const details = (activity.details as ActivityDetails) || null;
  const isClubActivity = shouldShowAsClubActivity(action, !!activity.user_id);
  const displayType = getActivityDisplayType(action, isClubActivity);
  const moviePosterUrl = displayType === "movie_poster" ? getMoviePosterUrl(details) : null;

  // Get verbiage using shared utility
  const verbiage = formatActivityVerbiage(action, details, 1, isClubActivity);
  const actionWordCount = getActionPhraseWordCount(action);

  // Determine primary link for whole-card tap
  const clubSlug = details?.club_slug as string | undefined;
  const primaryLink = getActivityNavigationUrl(action, details, clubSlug, isClubActivity, false);

  // Handle card click - navigate to primary link
  const handleCardClick = () => {
    if (primaryLink && primaryLink !== "#") {
      router.push(primaryLink);
    }
  };

  return (
    <div
      className="flex items-center gap-2.5 py-1.5 px-1 -mx-1 rounded transition-colors cursor-pointer hover:bg-[var(--surface-1)]/50 active:bg-[var(--surface-1)] min-h-[44px]"
      onClick={handleCardClick}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          handleCardClick();
        }
      }}
    >
      {/* Display Image - Fixed width container for alignment */}
      <div className="w-7 h-7 flex-shrink-0 flex items-center justify-center">
        {displayType === "movie_poster" ? (
          moviePosterUrl ? (
            <div className="w-[19px] h-7 rounded-sm overflow-hidden bg-[var(--surface-1)] shadow-[0_1px_3px_rgba(0,0,0,0.3),inset_0_1px_0_rgba(255,255,255,0.1)] ring-1 ring-black/20">
              <Image
                src={moviePosterUrl}
                alt={details?.movie_title || "Movie poster"}
                width={19}
                height={28}
                className="w-full h-full object-cover"
              />
            </div>
          ) : (
            <div className="w-[19px] h-7 rounded-sm bg-[var(--surface-1)] flex items-center justify-center shadow-[0_1px_3px_rgba(0,0,0,0.3),inset_0_1px_0_rgba(255,255,255,0.1)] ring-1 ring-black/20">
              <FilmSlate className="w-3 h-3 text-[var(--text-muted)]" weight="fill" />
            </div>
          )
        ) : (
          <ClickableUserAvatar
            entity={userToAvatarData(user as AvatarData | null)}
            userId={activity.user_id}
            size="xs"
          />
        )}
      </div>

      {/* Content */}
      <p className="flex-1 min-w-0 text-xs truncate">
        {displayType !== "movie_poster" && (
          <>
            <span className="text-[var(--text-muted)]">{userName}</span>{" "}
          </>
        )}
        {(() => {
          // Extract action phrase (may be multiple words) and emphasize it
          const words = verbiage.split(" ");
          const actionPhrase = words.slice(0, actionWordCount).join(" ");
          const rest = words.slice(actionWordCount).join(" ");
          return (
            <>
              <span className="text-[var(--text-primary)]">{actionPhrase}</span>
              {rest && (
                <span className="text-[var(--text-muted)]"> {renderWithBoldQuotes(rest)}</span>
              )}
            </>
          );
        })()}
      </p>

      {/* Time */}
      {activity.created_at && (
        <DateDisplay
          date={activity.created_at}
          format="relative"
          className="text-[10px] text-[var(--text-muted)] flex-shrink-0"
        />
      )}
    </div>
  );
});
