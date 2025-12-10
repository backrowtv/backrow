"use client";

import { useState } from "react";
import Link from "next/link";
import { EntityAvatar } from "@/components/ui/entity-avatar";
import { userToAvatarData, clubToAvatarData } from "@/lib/avatar-helpers";
import { UserPopupModal } from "@/components/profile/UserPopupModal";
import { TimeAgo } from "./TimeAgo";
import { type GroupedActivity } from "@/lib/activity/club-activity-feed";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { formatRatingDisplay } from "@/lib/ratings/normalize";

// Check if this is a system/admin action (no user attribution needed)
const SYSTEM_ACTIONS = new Set([
  "festival_created",
  "festival_started",
  "festival_completed",
  "club_created",
  "settings_updated",
  "event_created",
  "theme_selected",
]);

const isSystemAction = (action: string | undefined): boolean => {
  if (!action) return false;
  return SYSTEM_ACTIONS.has(action);
};

interface ActivityRowClientProps {
  activity: GroupedActivity;
}

export function ActivityRowClient({ activity }: ActivityRowClientProps) {
  const [userModalOpen, setUserModalOpen] = useState(false);

  const clubSlug = activity.club?.slug || activity.club?.id || "";
  const clubName = activity.club?.name || "Unknown Club";
  const action = activity.action as string | undefined;
  const systemAction = isSystemAction(action);
  const count = activity.count;
  const theme = activity.festival?.theme;
  const movieTitle = activity.movie?.title;

  // Format user names naturally
  const formatUsers = () => {
    const first = activity.user?.display_name || "Someone";
    return first;
  };

  // Movie link info - use TMDB ID directly for reliable linking
  const movieLink = activity.movie?.tmdb_id ? `/movies/${activity.movie.tmdb_id}` : null;

  // Build the complete activity sentence
  const getActivitySentence = (): {
    prefix: string;
    action: string;
    movieName?: string;
    suffix: string;
  } => {
    if (systemAction) {
      // System actions - describe what happened to the club
      switch (action) {
        case "club_created":
          return { prefix: "", action: `${clubName} was created`, suffix: "" };
        case "festival_created":
          return theme
            ? { prefix: "", action: `New festival "${theme}"`, suffix: ` in ${clubName}` }
            : { prefix: "", action: "New festival started", suffix: ` in ${clubName}` };
        case "festival_started":
          return theme
            ? { prefix: "", action: `"${theme}" festival began`, suffix: ` in ${clubName}` }
            : { prefix: "", action: "Festival began", suffix: ` in ${clubName}` };
        case "festival_completed":
          return theme
            ? { prefix: "", action: `"${theme}" festival wrapped`, suffix: ` in ${clubName}` }
            : { prefix: "", action: "Festival completed", suffix: ` in ${clubName}` };
        case "theme_selected":
          return theme
            ? { prefix: "", action: `Theme "${theme}" chosen`, suffix: ` for ${clubName}` }
            : { prefix: "", action: "New theme chosen", suffix: ` for ${clubName}` };
        case "settings_updated":
          return { prefix: "", action: `${clubName} settings updated`, suffix: "" };
        case "event_created":
          return activity.event?.title
            ? {
                prefix: "",
                action: `"${activity.event.title}" scheduled`,
                suffix: ` in ${clubName}`,
              }
            : { prefix: "", action: "Event scheduled", suffix: ` in ${clubName}` };
        default:
          return { prefix: "", action: "Update", suffix: ` in ${clubName}` };
      }
    } else {
      // User actions
      const userName = formatUsers();

      switch (activity.type || activity.action) {
        case "rating":
          if (count > 1) {
            return { prefix: userName, action: ` rated ${count} films`, suffix: ` in ${clubName}` };
          }
          return movieTitle
            ? {
                prefix: userName,
                action: " rated ",
                movieName: movieTitle,
                suffix: ` in ${clubName}`,
              }
            : { prefix: userName, action: " rated a film", suffix: ` in ${clubName}` };
        case "nomination":
          if (count > 1) {
            return {
              prefix: userName,
              action: ` nominated ${count} films`,
              suffix: ` in ${clubName}`,
            };
          }
          return movieTitle
            ? {
                prefix: userName,
                action: " nominated ",
                movieName: movieTitle,
                suffix: ` in ${clubName}`,
              }
            : { prefix: userName, action: " nominated a film", suffix: ` in ${clubName}` };
        case "discussion":
          if (activity.discussion?.title) {
            return {
              prefix: userName,
              action: ` posted "${activity.discussion.title}"`,
              suffix: ` in ${clubName}`,
            };
          }
          return count > 1
            ? {
                prefix: userName,
                action: ` started ${count} discussions`,
                suffix: ` in ${clubName}`,
              }
            : { prefix: userName, action: " started a discussion", suffix: ` in ${clubName}` };
        case "event":
          if (activity.event?.title) {
            return {
              prefix: userName,
              action: ` scheduled "${activity.event.title}"`,
              suffix: ` in ${clubName}`,
            };
          }
          return { prefix: userName, action: " scheduled an event", suffix: ` in ${clubName}` };
        case "member_joined":
          return { prefix: userName, action: " joined", suffix: ` ${clubName}` };
        default:
          return { prefix: userName, action: " was active", suffix: ` in ${clubName}` };
      }
    }
  };

  // Build detailed tooltip description with full context
  const getDetailedDescription = () => {
    const lines: string[] = [];
    const userName = activity.user?.display_name || "Someone";
    const movieYear = activity.movie?.year;

    if (systemAction) {
      switch (action) {
        case "club_created":
          lines.push(`🎬 ${clubName} was created!`);
          lines.push("");
          lines.push(
            "The club is now ready for members to join and start watching movies together."
          );
          break;
        case "festival_created":
          lines.push(`🎪 New Festival in ${clubName}`);
          if (theme) {
            lines.push("");
            lines.push(`Theme: "${theme}"`);
          }
          lines.push("");
          lines.push("Get ready to nominate films! The nomination phase will begin soon.");
          break;
        case "festival_started":
          lines.push(`🎬 Festival Started in ${clubName}!`);
          if (theme) {
            lines.push("");
            lines.push(`Theme: "${theme}"`);
          }
          lines.push("");
          lines.push("Nominations are now open. Submit your film picks!");
          break;
        case "festival_completed":
          lines.push(`🏆 Festival Complete in ${clubName}`);
          if (theme) {
            lines.push("");
            lines.push(`Theme: "${theme}"`);
          }
          lines.push("");
          lines.push(
            "The festival has wrapped! Check out the final results and see which films won."
          );
          break;
        case "theme_selected":
          lines.push(`🎯 New Theme Selected for ${clubName}`);
          if (theme) {
            lines.push("");
            lines.push(`Theme: "${theme}"`);
            lines.push("");
            lines.push("Start thinking about what films fit this theme!");
          }
          break;
        case "event_created":
          lines.push(`📅 Event Scheduled in ${clubName}`);
          if (activity.event?.title) {
            lines.push("");
            lines.push(`Event: "${activity.event.title}"`);
          }
          lines.push("");
          lines.push("Mark your calendar!");
          break;
        case "settings_updated":
          lines.push(`⚙️ Settings Updated`);
          lines.push("");
          lines.push(`${clubName}'s settings were updated.`);
          break;
        default:
          lines.push(`Activity in ${clubName}`);
      }
    } else {
      // User actions - always show who did it
      switch (activity.type || activity.action) {
        case "rating":
          lines.push(`⭐ ${userName} Rated Films`);
          lines.push("");
          if (count > 1) {
            lines.push(`Rated ${count} films in ${clubName}`);
            if (activity.avgRating) {
              lines.push(`Average score: ${formatRatingDisplay(activity.avgRating)}/10`);
            }
          } else if (movieTitle) {
            lines.push(`Film: "${movieTitle}"${movieYear ? ` (${movieYear})` : ""}`);
            const rating = activity.ratings?.[0];
            if (rating) lines.push(`Score: ${rating}/10`);
          }
          if (theme) {
            lines.push("");
            lines.push(`Festival: "${theme}"`);
          }
          break;
        case "nomination":
          lines.push(`🎬 ${userName} Nominated a Film`);
          lines.push("");
          if (count > 1) {
            lines.push(`Submitted ${count} nominations in ${clubName}`);
          } else if (movieTitle) {
            lines.push(`Film: "${movieTitle}"${movieYear ? ` (${movieYear})` : ""}`);
          }
          if (theme) {
            lines.push("");
            lines.push(`Festival theme: "${theme}"`);
          }
          lines.push("");
          lines.push(`Club: ${clubName}`);
          break;
        case "discussion":
          lines.push(`💬 ${userName} Started a Discussion`);
          lines.push("");
          if (activity.discussion?.title) {
            lines.push(`Topic: "${activity.discussion.title}"`);
          } else {
            lines.push(`${count > 1 ? `${count} discussions` : "A discussion"} in ${clubName}`);
          }
          if (theme) {
            lines.push("");
            lines.push(`Related to festival: "${theme}"`);
          }
          break;
        case "event":
          lines.push(`📅 ${userName} Scheduled an Event`);
          lines.push("");
          if (activity.event?.title) {
            lines.push(`Event: "${activity.event.title}"`);
          }
          lines.push(`Club: ${clubName}`);
          break;
        case "member_joined":
          if (activity.users && activity.users.length > 1) {
            lines.push(`👋 New Members Joined ${clubName}!`);
            lines.push("");
            const allNames = activity.users.map((u) => u.display_name || "Someone");
            lines.push(
              `Members: ${allNames.slice(0, 5).join(", ")}${allNames.length > 5 ? ` +${allNames.length - 5} more` : ""}`
            );
          } else {
            lines.push(`👋 ${userName} Joined ${clubName}`);
            lines.push("");
            lines.push("Welcome to the club!");
          }
          break;
        default:
          lines.push(`Activity by ${userName}`);
          lines.push("");
          lines.push(`Club: ${clubName}`);
      }
    }

    return lines.join("\n");
  };

  const _userInitial = (activity.user?.display_name || "U")[0].toUpperCase();

  const handleUserClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setUserModalOpen(true);
  };

  const sentence = getActivitySentence();

  const rowContent = systemAction ? (
    // System/admin action - show club avatar
    <div className="flex items-center gap-2 py-1.5 px-1 -mx-1 rounded hover:bg-[var(--surface-1)]/50 transition-colors cursor-default">
      {/* Club avatar */}
      <EntityAvatar entity={clubToAvatarData(activity.club)} emojiSet="club" size="tiny" />

      {/* Content */}
      <p className="flex-1 min-w-0 text-xs leading-tight">
        <span className="text-[var(--text-primary)]">{sentence.action}</span>
        {sentence.suffix && (
          <>
            <span className="text-[var(--text-muted)]">
              {sentence.suffix.replace(clubName, "")}
            </span>
            {sentence.suffix.includes(clubName) && (
              <Link
                href={`/club/${clubSlug}`}
                className="text-[var(--accent)]"
                onClick={(e) => e.stopPropagation()}
              >
                {clubName}
              </Link>
            )}
          </>
        )}
      </p>

      {/* Time */}
      <TimeAgo
        date={activity.timestamp}
        className="text-[10px] text-[var(--text-muted)] flex-shrink-0"
      />
    </div>
  ) : (
    // User action
    <div className="flex items-center gap-2 py-1.5 px-1 -mx-1 rounded hover:bg-[var(--surface-1)]/50 transition-colors cursor-default">
      {/* User avatar */}
      <button
        onClick={handleUserClick}
        className="flex-shrink-0 hover:opacity-80 transition-opacity"
      >
        <EntityAvatar entity={userToAvatarData(activity.user)} emojiSet="user" size="tiny" />
      </button>

      {/* Content */}
      <p className="flex-1 min-w-0 text-xs leading-tight">
        <button onClick={handleUserClick} className="font-medium text-[var(--text-primary)]">
          {sentence.prefix}
        </button>
        <span className="text-[var(--text-muted)]">{sentence.action}</span>
        {sentence.movieName &&
          (movieLink ? (
            <Link
              href={movieLink}
              className="text-[var(--primary)]"
              onClick={(e) => e.stopPropagation()}
            >
              &quot;{sentence.movieName}&quot;
            </Link>
          ) : (
            <span className="text-[var(--text-primary)]">&quot;{sentence.movieName}&quot;</span>
          ))}
        {sentence.suffix && (
          <>
            <span className="text-[var(--text-muted)]">
              {sentence.suffix.replace(clubName, "")}
            </span>
            {sentence.suffix.includes(clubName) && (
              <Link
                href={`/club/${clubSlug}`}
                className="text-[var(--accent)]"
                onClick={(e) => e.stopPropagation()}
              >
                {clubName}
              </Link>
            )}
          </>
        )}
      </p>

      {/* Time */}
      <TimeAgo
        date={activity.timestamp}
        className="text-[10px] text-[var(--text-muted)] flex-shrink-0"
      />
    </div>
  );

  return (
    <>
      <TooltipProvider delayDuration={400}>
        <Tooltip>
          <TooltipTrigger asChild>{rowContent}</TooltipTrigger>
          <TooltipContent side="top" className="max-w-xs text-xs whitespace-pre-line">
            {getDetailedDescription()}
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>

      {/* User Modal */}
      {!systemAction && activity.user && (
        <UserPopupModal
          userId={activity.user.id}
          open={userModalOpen}
          onOpenChange={setUserModalOpen}
        />
      )}
    </>
  );
}
