"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { motion, AnimatePresence } from "framer-motion";
import { CaretDown, CaretUp } from "@phosphor-icons/react/dist/ssr";
import { FilmSlate } from "@phosphor-icons/react/dist/ssr";
import { EntityAvatar } from "@/components/ui/entity-avatar";
import { userToAvatarData, clubToAvatarData } from "@/lib/avatar-helpers";
import { DateDisplay } from "@/components/ui/date-display";
import {
  formatActivityVerbiage,
  buildLinkOptions,
  renderActivityTextWithLinks,
  type ActivityDetails,
} from "@/lib/activity/activity-verbiage";
import {
  getActivityDisplayType,
  getMoviePosterUrl,
  shouldShowAsClubActivity,
} from "@/lib/activity/activity-display";

interface Activity {
  id: string;
  action: string | null;
  created_at: string;
  details: unknown;
  user_id?: string | null;
  user?: {
    display_name: string | null;
    avatar_url: string | null;
    social_links?: {
      avatar_icon?: string;
      avatar_color_index?: number;
      [key: string]: unknown;
    } | null;
  } | null;
}

interface RecentActivityListProps {
  activities: Activity[];
  clubSlug: string;
  /** Club ID (UUID) for the activity filter link */
  clubId: string;
  clubName?: string;
  clubPictureUrl?: string | null;
  clubAvatarIcon?: string | null;
  clubAvatarColorIndex?: number | null;
  clubAvatarBorderColorIndex?: number | null;
  currentUserId?: string;
}

export function RecentActivityList({
  activities,
  clubSlug,
  clubId,
  clubName,
  clubPictureUrl,
  clubAvatarIcon,
  clubAvatarColorIndex,
  clubAvatarBorderColorIndex,
  currentUserId,
}: RecentActivityListProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  const visibleCount = isExpanded ? 10 : 5;
  const visibleActivities = activities.slice(0, visibleCount);
  const hasMore = activities.length > visibleCount;
  const canExpand = activities.length > 5;

  if (!activities || activities.length === 0) {
    return <p className="text-xs text-[var(--text-muted)] text-center py-4">No recent activity</p>;
  }

  return (
    <div className="divide-y divide-[var(--border)]">
      <AnimatePresence initial={false}>
        {visibleActivities.map((activity, index) => {
          const action = activity.action || "";
          const details = activity.details as ActivityDetails | null;
          const isClubActivity = shouldShowAsClubActivity(action, !!activity.user_id);
          const displayType = getActivityDisplayType(action, isClubActivity);
          const moviePosterUrl = displayType === "movie_poster" ? getMoviePosterUrl(details) : null;

          // Get verbiage using shared utility
          const verbiage = formatActivityVerbiage(action, details, 1, isClubActivity);
          const linkOptions = buildLinkOptions(details, clubSlug, null);

          return (
            <motion.div
              key={activity.id}
              initial={index >= 5 ? { opacity: 0, height: 0 } : false}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.2, delay: index >= 5 ? (index - 5) * 0.05 : 0 }}
              className="flex items-center gap-2.5 py-2 px-2 transition-colors hover:bg-[var(--hover)]"
            >
              {/* Display Image - Fixed width container for alignment, self-center ensures vertical centering */}
              <div className="w-7 flex-shrink-0 flex items-center justify-center self-center">
                {displayType === "movie_poster" ? (
                  moviePosterUrl ? (
                    <Link href={linkOptions.movieLink || "#"} className="block">
                      <div className="w-[19px] h-7 rounded-sm overflow-hidden bg-[var(--surface-1)] shadow-[0_1px_3px_rgba(0,0,0,0.3),inset_0_1px_0_rgba(255,255,255,0.1)] ring-1 ring-black/20">
                        <Image
                          src={moviePosterUrl}
                          alt={details?.movie_title || "Movie poster"}
                          width={19}
                          height={28}
                          className="w-full h-full object-cover"
                        />
                      </div>
                    </Link>
                  ) : (
                    <div className="w-[19px] h-7 rounded-sm bg-[var(--surface-1)] flex items-center justify-center shadow-[0_1px_3px_rgba(0,0,0,0.3),inset_0_1px_0_rgba(255,255,255,0.1)] ring-1 ring-black/20">
                      <FilmSlate className="w-3 h-3 text-[var(--text-muted)]" weight="fill" />
                    </div>
                  )
                ) : isClubActivity ? (
                  <Link href={`/club/${clubSlug}`} className="block">
                    <EntityAvatar
                      entity={clubToAvatarData({
                        name: clubName || "Club",
                        slug: clubSlug,
                        picture_url: clubPictureUrl,
                        avatar_icon: clubAvatarIcon,
                        avatar_color_index: clubAvatarColorIndex,
                        avatar_border_color_index: clubAvatarBorderColorIndex,
                      })}
                      emojiSet="club"
                      size="xs"
                    />
                  </Link>
                ) : (
                  <EntityAvatar
                    entity={userToAvatarData(activity.user)}
                    emojiSet="user"
                    size="xs"
                  />
                )}
              </div>

              <div className="flex-1 min-w-0">
                <p className="text-xs truncate">
                  {/* For member activities, show user name - "You" for current user */}
                  {!isClubActivity && (activity.user?.display_name || activity.user_id) && (
                    <span className="font-medium">
                      {currentUserId && activity.user_id === currentUserId
                        ? "You"
                        : activity.user?.display_name || "Someone"}{" "}
                    </span>
                  )}
                  {renderActivityTextWithLinks(verbiage, linkOptions)}
                </p>
              </div>
              <span className="text-[10px] text-[var(--text-muted)] flex-shrink-0">
                <DateDisplay date={activity.created_at} format="relative" />
              </span>
            </motion.div>
          );
        })}
      </AnimatePresence>

      {/* Expand/Collapse and See More */}
      <div className="flex items-center justify-between pt-2">
        {canExpand && (
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="flex items-center gap-1 text-[10px] text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors"
          >
            {isExpanded ? (
              <>
                <CaretUp className="h-3 w-3" />
                Show Less
              </>
            ) : (
              <>
                <CaretDown className="h-3 w-3" />
                Show More
              </>
            )}
          </button>
        )}
        {(hasMore || activities.length > 5) && (
          <Link
            href={`/activity?clubs=${clubId}`}
            className="text-sm text-[var(--primary)] transition-colors"
          >
            All
          </Link>
        )}
      </div>
    </div>
  );
}
