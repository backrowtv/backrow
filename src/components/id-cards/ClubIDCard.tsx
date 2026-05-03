"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { Card } from "@/components/ui/card";
import { Text } from "@/components/ui/typography";
import { Avatar } from "@/components/ui/avatar";
import { EntityAvatar } from "@/components/ui/entity-avatar";
import { clubToAvatarData } from "@/lib/avatar-helpers";
import { DateDisplay } from "@/components/ui/date-display";
import { FavoriteButton } from "@/components/clubs/FavoriteButton";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { IDCardSection } from "./IDCardSection";
import { Users, FilmReel, Trophy, Target } from "@phosphor-icons/react";

interface ClubStats {
  memberCount: number;
  moviesWatched: number;
  festivalsCompleted: number;
}

interface RecentWinner {
  userName: string;
  avatarUrl: string | null;
}

interface FeaturedBadge {
  id: string;
  name: string;
  description: string;
  icon_url: string | null;
}

export interface ClubIDCardClub {
  id: string;
  name: string;
  slug: string;
  picture_url?: string | null;
  logo_url?: string | null;
  avatar_icon?: string | null;
  avatar_color_index?: number | null;
  avatar_border_color_index?: number | null;
  settings?: unknown;
  description?: string | null;
  privacy?: string;
  created_at?: string;
  theme_color?: string | null;
}

export interface ClubIDCardProps {
  club: ClubIDCardClub;
  stats?: ClubStats | null;
  recentWinners?: RecentWinner[] | null;
  featuredBadges?: FeaturedBadge[] | null;
  variant?: "full" | "compact" | "discover";
  showFavoriteButton?: boolean;
  isFavorite?: boolean;
  className?: string;
}

/**
 * ClubIDCard - A horizontal membership card displaying club identity and stats
 *
 * Variants:
 * - full: Used on club page sidebar, shows all sections
 * - compact: Condensed layout for smaller spaces
 * - discover: Optimized for browsing on discover page
 */
export function ClubIDCard({
  club,
  stats,
  recentWinners,
  featuredBadges,
  variant = "full",
  showFavoriteButton = false,
  isFavorite = false,
  className,
}: ClubIDCardProps) {
  const isCompact = variant === "compact";
  const isDiscover = variant === "discover";
  const [descriptionExpanded, setDescriptionExpanded] = useState(false);
  const [needsTruncation, setNeedsTruncation] = useState(false);
  const [isCardCollapsed, setIsCardCollapsed] = useState(false);
  const descriptionRef = useRef<HTMLParagraphElement>(null);

  useEffect(() => {
    const el = descriptionRef.current;
    if (!el || descriptionExpanded) return;

    const check = () => setNeedsTruncation(el.scrollHeight > el.clientHeight + 1);

    // Check immediately and also observe resize (handles font loading, layout shifts)
    check();
    const observer = new ResizeObserver(check);
    observer.observe(el);
    return () => observer.disconnect();
  }, [club.description, descriptionExpanded]);

  // Apply theme color if available
  const themeStyle = club.theme_color
    ? ({ "--club-accent": club.theme_color } as React.CSSProperties)
    : undefined;

  const cardContent = (
    <Card
      variant="elevated"
      hover={isDiscover}
      interactive={isDiscover}
      className={cn("overflow-hidden relative", isCompact ? "p-3" : "p-5", className)}
      style={themeStyle}
    >
      {/* Favorite Button - top right for compact/discover variants */}
      {showFavoriteButton && (isCompact || isDiscover) && (
        <div className={cn("absolute z-10", isCompact ? "top-2 right-2" : "top-3 right-3")}>
          <FavoriteButton clubId={club.id} isFavorite={isFavorite} size="sm" />
        </div>
      )}

      {/* Header: Avatar + Name + Description */}
      {isCompact || isDiscover ? (
        <div className={cn("flex", isCompact ? "gap-2.5" : "gap-4")}>
          <EntityAvatar
            entity={clubToAvatarData(club)}
            emojiSet="club"
            size={isCompact ? "md" : "xl"}
            className="flex-shrink-0"
          />
          <div className={cn("flex-1 min-w-0", isCompact ? "pr-6" : "pr-8")}>
            <p
              className={cn(
                "font-semibold line-clamp-2",
                isCompact ? "text-sm leading-tight" : "text-lg"
              )}
              style={{ color: "var(--club-accent, var(--text-primary))" }}
            >
              {club.name}
            </p>
            {club.description &&
              (isCompact ? (
                <div
                  role={descriptionExpanded || needsTruncation ? "button" : undefined}
                  tabIndex={descriptionExpanded || needsTruncation ? 0 : undefined}
                  onClick={() =>
                    (descriptionExpanded || needsTruncation) &&
                    setDescriptionExpanded((prev) => !prev)
                  }
                  onKeyDown={(e) => {
                    if (
                      (descriptionExpanded || needsTruncation) &&
                      (e.key === "Enter" || e.key === " ")
                    ) {
                      e.preventDefault();
                      setDescriptionExpanded((prev) => !prev);
                    }
                  }}
                  className={cn(
                    "relative mt-0.5",
                    (descriptionExpanded || needsTruncation) && "cursor-pointer"
                  )}
                >
                  <Text ref={descriptionRef} size="tiny" muted>
                    {club.description}
                  </Text>
                  {needsTruncation && !descriptionExpanded && (
                    <div
                      className="absolute bottom-0 left-0 right-0 h-6 pointer-events-none"
                      style={{ background: "linear-gradient(to top, var(--card), transparent)" }}
                    />
                  )}
                </div>
              ) : (
                <Text size="sm" muted className="mt-1">
                  {club.description}
                </Text>
              ))}
          </div>
        </div>
      ) : (
        <div className="flex flex-col items-center text-center">
          {/* Avatar — tap to collapse/expand card */}
          <button
            onClick={() => setIsCardCollapsed((prev) => !prev)}
            className="cursor-pointer focus:outline-none focus:ring-2 focus:ring-[var(--primary)] rounded-full transition-transform active:scale-95"
            aria-label={isCardCollapsed ? "Expand club card" : "Collapse club card"}
          >
            <EntityAvatar
              entity={clubToAvatarData(club)}
              emojiSet="club"
              size="xxl"
              className="flex-shrink-0"
            />
          </button>
          <div className="flex items-center gap-2 mt-3 px-2">
            <p
              className="font-semibold text-lg"
              style={{ color: "var(--club-accent, var(--text-primary))" }}
            >
              {club.name}
            </p>
            {showFavoriteButton && (
              <FavoriteButton clubId={club.id} isFavorite={isFavorite} size="sm" />
            )}
          </div>
          {!isCardCollapsed && club.description && (
            <div
              role={descriptionExpanded || needsTruncation ? "button" : undefined}
              tabIndex={descriptionExpanded || needsTruncation ? 0 : undefined}
              onClick={() =>
                (descriptionExpanded || needsTruncation) && setDescriptionExpanded((prev) => !prev)
              }
              onKeyDown={(e) => {
                if (
                  (descriptionExpanded || needsTruncation) &&
                  (e.key === "Enter" || e.key === " ")
                ) {
                  e.preventDefault();
                  setDescriptionExpanded((prev) => !prev);
                }
              }}
              className={cn(
                "relative mt-1 px-2 w-full text-center",
                (descriptionExpanded || needsTruncation) && "cursor-pointer"
              )}
            >
              <Text ref={descriptionRef} size="sm" muted>
                {club.description}
              </Text>
              {needsTruncation && !descriptionExpanded && (
                <div
                  className="absolute bottom-0 left-0 right-0 h-6 pointer-events-none"
                  style={{ background: "linear-gradient(to top, var(--surface-1), transparent)" }}
                />
              )}
            </div>
          )}
        </div>
      )}

      {/* Hall of Fame Section — hidden when card is collapsed */}
      {!isCardCollapsed && recentWinners && recentWinners.length > 0 && (
        <div
          className={cn(
            "border-t border-[var(--border)]",
            isCompact ? "mt-2.5 pt-2.5" : "mt-4 pt-4"
          )}
        >
          <IDCardSection
            title="Hall of Fame"
            className={!isCompact && !isDiscover ? "text-center" : undefined}
          >
            <div
              className={cn("flex flex-wrap gap-2", !isCompact && !isDiscover && "justify-center")}
            >
              {recentWinners.slice(0, 5).map((winner, index) => (
                <div key={index} className="relative" title={winner.userName}>
                  <Avatar
                    src={winner.avatarUrl ?? undefined}
                    alt={winner.userName}
                    size={isCompact ? "sm" : "md"}
                  />
                  <div className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-[var(--warning)] flex items-center justify-center">
                    <Trophy className="w-2.5 h-2.5 text-white" weight="fill" />
                  </div>
                </div>
              ))}
            </div>
          </IDCardSection>
        </div>
      )}

      {/* Featured Badges Section — hidden when card is collapsed */}
      {!isCardCollapsed && featuredBadges && featuredBadges.length > 0 && (
        <div
          className={cn(
            "border-t border-[var(--border)]",
            isCompact ? "pt-2.5" : "pt-4",
            recentWinners?.length ? (isCompact ? "mt-2" : "mt-3") : isCompact ? "mt-2.5" : "mt-4"
          )}
        >
          <IDCardSection
            title="Challenges"
            className={!isCompact && !isDiscover ? "text-center" : undefined}
          >
            <TooltipProvider delayDuration={300}>
              <div
                className={cn(
                  "flex flex-wrap gap-2",
                  !isCompact && !isDiscover && "justify-center"
                )}
              >
                {featuredBadges.slice(0, 4).map((badge) => (
                  <Tooltip key={badge.id}>
                    <TooltipTrigger asChild>
                      <div
                        className={cn(
                          "rounded-full flex items-center justify-center",
                          "bg-gradient-to-br from-amber-500 to-amber-700",
                          "border-2 border-[var(--club-accent,var(--accent))]",
                          isCompact ? "w-8 h-8" : "w-10 h-10"
                        )}
                      >
                        <Target
                          className={cn("text-white", isCompact ? "w-4 h-4" : "w-5 h-5")}
                          weight="fill"
                        />
                      </div>
                    </TooltipTrigger>
                    <TooltipContent side="top">
                      <p className="font-medium">{badge.name}</p>
                      <p className="text-xs text-[var(--text-muted)]">{badge.description}</p>
                    </TooltipContent>
                  </Tooltip>
                ))}
              </div>
            </TooltipProvider>
          </IDCardSection>
        </div>
      )}

      {/* Stats & Established Date - Combined footer */}
      {(stats || (!isCompact && !isDiscover && club.created_at)) && (
        <TooltipProvider delayDuration={300}>
          <div
            className={cn(
              "flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-[var(--text-muted)]",
              !isCompact && !isDiscover && "justify-center",
              recentWinners?.length || featuredBadges?.length
                ? isCompact
                  ? "mt-2 pt-2 border-t border-[var(--border)]"
                  : "mt-3 pt-3 border-t border-[var(--border)]"
                : isCompact
                  ? "mt-2.5 pt-2.5 border-t border-[var(--border)]"
                  : "mt-3 pt-3 border-t border-[var(--border)]"
            )}
          >
            {stats && (
              <>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Link
                      href={`/club/${club.slug}/members`}
                      className="flex items-center gap-1 hover:text-[var(--text-primary)] transition-colors"
                    >
                      <Users weight="fill" className="w-3 h-3" />
                      {stats.memberCount}
                    </Link>
                  </TooltipTrigger>
                  <TooltipContent side="top">
                    <p>{stats.memberCount === 1 ? "1 Member" : `${stats.memberCount} Members`}</p>
                  </TooltipContent>
                </Tooltip>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Link
                      href={`/club/${club.slug}/history?tab=movies`}
                      className="flex items-center gap-1 hover:text-[var(--text-primary)] transition-colors"
                    >
                      <FilmReel weight="fill" className="w-3 h-3" />
                      {stats.moviesWatched}
                    </Link>
                  </TooltipTrigger>
                  <TooltipContent side="top">
                    <p>
                      {stats.moviesWatched === 1
                        ? "1 Movie Watched"
                        : `${stats.moviesWatched} Movies Watched`}
                    </p>
                  </TooltipContent>
                </Tooltip>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Link
                      href={`/club/${club.slug}/display-case`}
                      className="flex items-center gap-1 hover:text-[var(--text-primary)] transition-colors"
                    >
                      <Trophy weight="fill" className="w-3 h-3" />
                      {stats.festivalsCompleted}
                    </Link>
                  </TooltipTrigger>
                  <TooltipContent side="top">
                    <p>
                      {stats.festivalsCompleted === 1
                        ? "1 Festival Completed"
                        : `${stats.festivalsCompleted} Festivals Completed`}
                    </p>
                  </TooltipContent>
                </Tooltip>
              </>
            )}
            {!isCompact && !isDiscover && club.created_at && (
              <>
                {stats && <span className="text-[var(--border)]">·</span>}
                <span className="uppercase tracking-wider" style={{ fontSize: "10px" }}>
                  Est. <DateDisplay date={club.created_at} format="date" />
                </span>
              </>
            )}
          </div>
        </TooltipProvider>
      )}
    </Card>
  );

  // Wrap in Link for discover variant
  if (isDiscover) {
    return (
      <Link href={`/club/${club.slug}`} className="block">
        {cardContent}
      </Link>
    );
  }

  return cardContent;
}
