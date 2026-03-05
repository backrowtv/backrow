"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { EntityAvatar } from "@/components/ui/entity-avatar";
import { ClickableUserAvatar } from "@/components/ui/clickable-user-avatar";
import { userToAvatarData, clubToAvatarData } from "@/lib/avatar-helpers";
import { BrandText } from "@/components/ui/brand-text";
import { TimeAgo } from "../home/TimeAgo";
import { FilmSlate, X } from "@phosphor-icons/react/dist/ssr";
import type { GroupedActivity } from "@/lib/activity/club-activity-feed";
import {
  formatActivityVerbiage,
  getActionPhraseWordCount,
  HIDDEN_ACTIVITY_TYPES,
  renderWithBoldQuotes,
  type ActivityDetails,
} from "@/lib/activity/activity-verbiage";
import { getActivityDisplayType, getMoviePosterUrl } from "@/lib/activity/activity-display";
import { getActivityNavigationUrl } from "@/lib/activity/activity-navigation";

// ============================================
// COMPONENT
// ============================================

interface NewActivityItemProps {
  activity: GroupedActivity;
  showClubLink?: boolean;
  currentUserId?: string;
  /** When true, prefer movie poster over club avatar for activities that reference a movie */
  preferMoviePoster?: boolean;
  /** Callback to hide this activity item. When provided, renders a dismiss button. */
  onHide?: (activityId: string) => void;
  /** When false, card height is content-driven instead of fixed. Default true (fixed height for dedicated activity page). */
  fixedHeight?: boolean;
  /** @deprecated No longer used - kept for API compatibility */
  index?: number;
}

export function NewActivityItem({
  activity,
  showClubLink = true,
  currentUserId,
  preferMoviePoster = false,
  onHide,
  fixedHeight = true,
}: NewActivityItemProps) {
  const router = useRouter();

  // Filter out hidden activity types
  if (HIDDEN_ACTIVITY_TYPES.includes(activity.action as (typeof HIDDEN_ACTIVITY_TYPES)[number])) {
    return null;
  }

  const isClubActivity = activity.category === "club";
  const baseDetails = (activity.items[0]?.details || null) as ActivityDetails | null;
  // For combined watch+rate, merge the rating into details
  const details: ActivityDetails | null =
    activity.combinedWatchRate?.rating !== undefined
      ? { ...baseDetails, rating: activity.combinedWatchRate.rating }
      : baseDetails;
  const count = activity.count;

  // Check if this is a multi-user group (e.g., "3 people rated Inception")
  const hasMultipleUsers = (activity.users?.length ?? 0) > 1;

  // Extract data from details
  const clubSlug = (details?.club_slug as string) || activity.club?.slug || activity.club?.id;
  const clubName = (details?.club_name as string) || activity.club?.name;

  // Determine display type
  let displayType = getActivityDisplayType(activity.action, isClubActivity);

  // In club context, prefer movie poster if activity has any movie reference
  if (preferMoviePoster && displayType === "club_avatar") {
    const hasMovie =
      activity.movie?.poster_url ||
      activity.movie?.tmdb_id ||
      getMoviePosterUrl(details) ||
      details?.tmdb_id;
    if (hasMovie) {
      displayType = "movie_poster";
    }
  }

  // Get verbiage using shared utility
  const verbiage = formatActivityVerbiage(activity.action, details, count, isClubActivity);
  const actionWordCount = getActionPhraseWordCount(activity.action);

  // Get movie poster URL if applicable
  // Check activity.movie.poster_url first (enriched), then fall back to details
  const moviePosterUrl =
    displayType === "movie_poster"
      ? activity.movie?.poster_url || getMoviePosterUrl(details)
      : null;

  // Determine if this is a grouped activity (multiple items or multiple users)
  const isGrouped = count > 1 || hasMultipleUsers;

  // Determine primary link for whole-card tap
  // Use smart navigation that routes grouped activities to filtered activity feed
  const primaryLink = getActivityNavigationUrl(
    activity.action,
    details,
    clubSlug,
    isClubActivity,
    isGrouped
  );

  // Handle card click - navigate to primary link
  const handleCardClick = () => {
    if (primaryLink && primaryLink !== "#") {
      router.push(primaryLink);
    }
  };

  return (
    <div
      className={`group/activity flex items-center gap-2.5 py-2.5 px-2 transition-colors cursor-pointer hover:bg-[var(--hover)] active:bg-[var(--surface-1)]${fixedHeight ? " h-[68px] overflow-hidden" : ""}`}
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
      {/* Display Image - Fixed width container for alignment, self-center ensures vertical centering */}
      <div className="w-7 flex-shrink-0 flex items-center justify-center self-center">
        {displayType === "movie_poster" ? (
          // Movie poster for movie-related actions
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
            // Fallback film icon if no poster available
            <div className="w-[19px] h-7 rounded-sm bg-[var(--surface-1)] flex items-center justify-center shadow-[0_1px_3px_rgba(0,0,0,0.3),inset_0_1px_0_rgba(255,255,255,0.1)] ring-1 ring-black/20">
              <FilmSlate className="w-3 h-3 text-[var(--text-muted)]" weight="fill" />
            </div>
          )
        ) : displayType === "club_avatar" && activity.club ? (
          // Club avatar for club activities
          <EntityAvatar entity={clubToAvatarData(activity.club)} emojiSet="club" size="xs" />
        ) : hasMultipleUsers && activity.users ? (
          // Multiple user avatars stacked for multi-user groups
          <div className="flex -space-x-1.5">
            {activity.users.slice(0, 2).map((user, idx) => (
              <EntityAvatar
                key={user.id || idx}
                entity={userToAvatarData(user)}
                emojiSet="user"
                size="xs"
                className="border-2 border-[var(--background)]"
              />
            ))}
            {activity.users.length > 2 && (
              <div className="w-7 h-7 rounded-full bg-[var(--surface-2)] flex items-center justify-center text-[9px] font-medium border-2 border-[var(--background)] z-10">
                +{activity.users.length - 2}
              </div>
            )}
          </div>
        ) : (
          // Single user avatar for member activities
          <ClickableUserAvatar
            entity={userToAvatarData(activity.user)}
            userId={activity.user?.id}
            size="xs"
          />
        )}
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <p className="text-xs text-[var(--text-primary)] leading-snug line-clamp-3">
          {/* Show username for single-user member activities (not for multi-user groups) - "You" for current user */}
          {!isClubActivity && displayType !== "club_avatar" && !hasMultipleUsers && (
            <>
              <span className="text-[var(--text-muted)]">
                {currentUserId && activity.user?.id === currentUserId
                  ? "You"
                  : activity.user?.display_name || "Someone"}
              </span>{" "}
            </>
          )}
          {(() => {
            // If verbiage starts with a quoted title, render entire string through
            // renderWithBoldQuotes to avoid splitting the quoted string across words
            if (verbiage.startsWith('"')) {
              return (
                <span className="text-[var(--text-muted)]">{renderWithBoldQuotes(verbiage)}</span>
              );
            }
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

        {/* Club context - show which club the activity occurred in, but skip for club creation/deletion/archive actions where club is already in the verbiage */}
        {clubName &&
          showClubLink &&
          ![
            "user_created_club",
            "user_deleted_club",
            "user_archived_club",
            "club_deleted",
            "club_archived",
          ].includes(activity.action) && (
            <p className="text-[10px] text-[var(--text-muted)]">
              in <BrandText>{clubName}</BrandText>
            </p>
          )}
      </div>

      {/* Hide button */}
      {onHide && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            onHide(activity.id);
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              e.stopPropagation();
            }
          }}
          className="flex-shrink-0 p-1 rounded-sm text-[var(--text-muted)] opacity-40 md:opacity-0 md:group-hover/activity:opacity-100 focus:opacity-100 hover:text-[var(--text-primary)] hover:bg-[var(--surface-1)] transition-all"
          aria-label="Remove from feed"
        >
          <X className="w-3 h-3" />
        </button>
      )}

      {/* Time */}
      <TimeAgo
        date={activity.timestamp}
        className="text-[10px] text-[var(--text-muted)] flex-shrink-0"
      />
    </div>
  );
}
