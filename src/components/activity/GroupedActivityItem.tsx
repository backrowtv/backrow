"use client";

import { useRouter } from "next/navigation";
import Image from "next/image";
import { cn } from "@/lib/utils";
import { GroupedActivity } from "@/lib/activity/activity-feed";
import { EntityAvatar } from "@/components/ui/entity-avatar";
import { ClickableUserAvatar } from "@/components/ui/clickable-user-avatar";
import { userToAvatarData } from "@/lib/avatar-helpers";
import { DateDisplay } from "@/components/ui/date-display";
import { FilmSlate } from "@phosphor-icons/react/dist/ssr";
import { shouldShowActivity, shouldShowRatingScore } from "@/lib/activity/mode-filtering";
import { Database } from "@/types/database";
import {
  formatActivityVerbiage,
  getActionPhraseWordCount,
  HIDDEN_ACTIVITY_TYPES,
  renderWithBoldQuotes,
  type ActivityDetails,
} from "@/lib/activity/activity-verbiage";
import { BrandText } from "@/components/ui/brand-text";
import { getActivityDisplayType, getMoviePosterUrl } from "@/lib/activity/activity-display";
import { getActivityNavigationUrl } from "@/lib/activity/activity-navigation";
import { RatingDisplay } from "@/components/ratings/RatingDisplay";

type Club = Database["public"]["Tables"]["clubs"]["Row"];

interface GroupedActivityItemProps {
  activity: GroupedActivity;
  club?: Club | null;
  currentUserId?: string;
  userHasRated?: boolean;
  /** @deprecated No longer used - kept for API compatibility */
  index?: number;
}

export function GroupedActivityItem({
  activity,
  club,
  currentUserId,
  userHasRated = false,
}: GroupedActivityItemProps) {
  const router = useRouter();

  // Apply mode-specific filtering
  if (club && activity.activities.length > 0) {
    const firstActivity = activity.activities[0];
    const hasRated = userHasRated ?? false;
    const shouldShow = shouldShowActivity(firstActivity, club, hasRated);
    if (!shouldShow) return null;
  }

  const isGroup = activity.type === "group" && activity.users.length > 1;
  const isCombined = activity.type === "combined";
  const clubName = activity.club_name || "";
  const clubSlug =
    ("club_slug" in activity ? activity.club_slug : undefined) || activity.club_id || "";

  // Get primary user info
  const primaryUser = activity.users[0];
  const userName = primaryUser?.display_name || "Someone";
  const userId = primaryUser?.id;

  // Extract details for display
  const actionType = Array.isArray(activity.action_type)
    ? activity.action_type[0]
    : activity.action_type;

  // Filter out hidden activity types
  if (HIDDEN_ACTIVITY_TYPES.includes(actionType as (typeof HIDDEN_ACTIVITY_TYPES)[number])) {
    return null;
  }

  const movieName = activity.target_name || "";

  // Extract tmdb_id from the first activity's details
  const firstActivityDetails = activity.activities[0]?.details as Record<string, unknown> | null;
  const tmdbId = firstActivityDetails?.tmdb_id as number | undefined;
  const posterUrl = firstActivityDetails?.poster_url as string | undefined;
  const posterPath = firstActivityDetails?.poster_path as string | undefined;

  const details: ActivityDetails = {
    movie_title: movieName,
    tmdb_id: tmdbId,
    poster_url: posterUrl,
    poster_path: posterPath,
    club_slug: clubSlug,
  };

  // Get display type and poster URL
  const displayType = getActivityDisplayType(actionType, false);
  const moviePosterUrl = displayType === "movie_poster" ? getMoviePosterUrl(details) : null;

  // Determine if this is a grouped activity
  const isGrouped = isGroup || isCombined;

  // Determine primary link for whole-card tap
  const primaryLink = getActivityNavigationUrl(actionType, details, clubSlug, false, isGrouped);

  // Handle card click - navigate to primary link
  const handleCardClick = () => {
    if (primaryLink && primaryLink !== "#") {
      router.push(primaryLink);
    }
  };

  // Format action text
  const formatActionText = () => {
    if (isCombined && activity.combinedActions) {
      const rating = activity.combinedActions.rating;
      const firstActivity = activity.activities[0];
      const shouldShowScore = club
        ? shouldShowRatingScore(firstActivity, club, userHasRated)
        : true;

      if (activity.combinedActions.watched && activity.combinedActions.rated) {
        return {
          action: `watched and rated "${movieName}"`,
          ratingValue: rating !== undefined && shouldShowScore ? rating : undefined,
          ratingClass: shouldShowScore ? "text-[var(--primary)]" : "text-[var(--text-muted)]",
        };
      } else if (activity.combinedActions.watched) {
        return { action: `watched "${movieName}"`, ratingValue: undefined, ratingClass: "" };
      } else if (activity.combinedActions.rated) {
        return {
          action: `rated "${movieName}"`,
          ratingValue: rating !== undefined && shouldShowScore ? rating : undefined,
          ratingClass: shouldShowScore ? "text-[var(--primary)]" : "text-[var(--text-muted)]",
        };
      }
    }

    if (isGroup) {
      const actionText = formatActivityVerbiage(actionType, details, activity.users.length, false);
      return {
        action: `${activity.users.length} members ${actionText}`,
        ratingValue: undefined,
        ratingClass: "",
      };
    }

    // Single activity - use shared verbiage
    const actionText = formatActivityVerbiage(actionType, details, 1, false);
    return {
      action: actionText,
      ratingValue: undefined,
      ratingClass: "",
    };
  };

  const actionResult = formatActionText();
  const actionWordCount = getActionPhraseWordCount(actionType);

  return (
    <div
      className="flex items-center gap-2.5 py-2 px-2 transition-colors h-[52px] overflow-hidden cursor-pointer hover:bg-[var(--hover)] active:bg-[var(--surface-1)]"
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
      {/* Display Image - Movie Poster or Avatar(s) - Fixed width container for alignment, self-center ensures vertical centering */}
      <div className="w-7 flex-shrink-0 flex items-center justify-center self-center">
        {displayType === "movie_poster" ? (
          moviePosterUrl ? (
            <div className="w-[19px] h-7 rounded-sm overflow-hidden bg-[var(--surface-1)] shadow-[0_1px_3px_rgba(0,0,0,0.3),inset_0_1px_0_rgba(255,255,255,0.1)] ring-1 ring-black/20">
              <Image
                src={moviePosterUrl}
                alt={movieName || "Movie poster"}
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
        ) : isGroup ? (
          <div className="flex -space-x-1.5">
            {activity.users.slice(0, 2).map((user, idx) => (
              <EntityAvatar
                key={idx}
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
          <ClickableUserAvatar
            entity={userToAvatarData(primaryUser)}
            userId={primaryUser?.id}
            size="xs"
          />
        )}
      </div>

      {/* Content */}
      <p className="flex-1 min-w-0 text-xs truncate">
        {!isGroup && displayType !== "movie_poster" && (
          <span className="text-[var(--text-muted)]">
            {currentUserId && userId === currentUserId ? "You" : userName}
          </span>
        )}
        {!isGroup && displayType !== "movie_poster" && " "}
        {(() => {
          // Extract action phrase (may be multiple words) and emphasize it
          const action = actionResult.action;
          const words = action.split(" ");
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
        {actionResult.ratingValue !== undefined && (
          <span className={cn("ml-1", actionResult.ratingClass || "text-[var(--text-primary)]")}>
            <RatingDisplay rating={actionResult.ratingValue} showMax />
          </span>
        )}
        {/* Only show club context if club name isn't already in the action text */}
        {clubName && !actionResult.action.includes(clubName) && (
          <span className="text-[var(--text-muted)]">
            {" "}
            in <BrandText>{clubName}</BrandText>
          </span>
        )}
      </p>

      {/* Time */}
      <DateDisplay
        date={activity.created_at}
        format="relative"
        className="text-[10px] text-[var(--text-muted)] flex-shrink-0"
      />
    </div>
  );
}
