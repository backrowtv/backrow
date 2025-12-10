"use client";

import { useState } from "react";
import Link from "next/link";
import { EntityAvatar } from "@/components/ui/entity-avatar";
import { clubToAvatarData } from "@/lib/avatar-helpers";
import { cn } from "@/lib/utils";
import { Users, FilmReel, FilmStrip, Lock, Globe, CheckCircle } from "@phosphor-icons/react";
import { getClubThemeColor } from "@/lib/clubs/theme-colors";
import { GenreIcon } from "@/components/genres/GenreIcon";
import { getGenreBySlug } from "@/lib/genres/constants";
import { FavoriteButton } from "@/components/clubs/FavoriteButton";
import { CategoryBadge } from "@/components/id-cards/CategoryBadge";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { updateMemberPreference } from "@/app/actions/clubs/membership";
import type { FeaturedBadge } from "@/types/id-card";

interface UnifiedClubCardProps {
  club: {
    id: string;
    slug: string;
    name: string;
    description?: string | null;
    picture_url?: string | null;
    member_count?: number;
    festival_count?: number;
    movies_watched?: number;
    is_member?: boolean;
    is_favorite?: boolean;
    user_role?: string;
    privacy?: string | null;
    theme_color?: string | null;
    settings?: unknown;
    avatar_icon?: string | null;
    avatar_color_index?: number | null;
    avatar_border_color_index?: number | null;
    genres?: string[] | null;
  };
  showFavorite?: boolean;
  featuredBadges?: FeaturedBadge[];
  /** When true, the card is not wrapped in a Link (use on the club's own page) */
  disableLink?: boolean;
  /** Initial collapsed state from server (persisted in club_members.preferences) */
  initialCollapsed?: boolean;
  className?: string;
}

export function UnifiedClubCard({
  club,
  showFavorite = false,
  featuredBadges = [],
  disableLink = false,
  initialCollapsed = false,
  className,
}: UnifiedClubCardProps) {
  const [isCollapsed, setIsCollapsed] = useState(initialCollapsed);
  const isModerated = club.privacy === "public_moderated";
  const themeColor = club.theme_color ? getClubThemeColor(club.theme_color) : null;
  const accentColor = themeColor || "var(--primary)";

  const Wrapper = disableLink ? "div" : Link;
  const wrapperProps = disableLink
    ? { className: cn("block", className) }
    : { href: `/club/${club.slug}`, className: cn("block group", className) };

  return (
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- conditional Link/div wrapper
    <Wrapper {...(wrapperProps as any)}>
      <div
        className="relative overflow-hidden rounded-xl border border-[var(--border)] bg-[var(--card)] shadow-[var(--shadow-lg)] h-full flex flex-col"
        style={
          {
            "--card-accent": accentColor,
          } as React.CSSProperties
        }
      >
        {/* Theme color header gradient — small light halo behind avatar, dark outer */}
        <div
          className="h-16 w-full relative"
          style={{
            background: themeColor
              ? `color-mix(in srgb, ${themeColor} 80%, white)`
              : "color-mix(in srgb, var(--primary) 80%, white)",
          }}
        >
        </div>

        {/* Avatar overlapping header — tap to collapse/expand only on club dashboard */}
        <div className="flex justify-center -mt-7 relative z-10">
          {disableLink ? (
            <button
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                const next = !isCollapsed;
                setIsCollapsed(next);
                // Fire-and-forget preference save — no transition needed
                updateMemberPreference(club.id, "card_collapsed", next);
              }}
              className="inline-flex ring-[3px] ring-[var(--card)] rounded-full cursor-pointer transition-transform duration-200 ease-out hover:scale-[1.03] active:scale-[0.97] focus:outline-none focus-visible:ring-[3px] focus-visible:ring-[var(--primary)]"
              aria-label={isCollapsed ? "Expand club card" : "Collapse club card"}
            >
              <EntityAvatar entity={clubToAvatarData(club)} emojiSet="club" size="lg" />
            </button>
          ) : (
            <div className="ring-[3px] ring-[var(--card)] rounded-full">
              <EntityAvatar entity={clubToAvatarData(club)} emojiSet="club" size="lg" />
            </div>
          )}
        </div>

        {/* Status icons — top left corner */}
        <TooltipProvider>
          <div className="absolute top-[4.25rem] left-2 z-10 flex items-center gap-1">
            <Tooltip>
              <TooltipTrigger asChild>
                {isModerated ? (
                  <Lock className="w-4 h-4 text-[var(--text-muted)]" weight="bold" />
                ) : (
                  <Globe className="w-4 h-4 text-[var(--text-muted)]" weight="bold" />
                )}
              </TooltipTrigger>
              <TooltipContent side="bottom">{isModerated ? "Moderated" : "Open"}</TooltipContent>
            </Tooltip>
            {club.is_member && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <CheckCircle className="w-4 h-4 text-[var(--text-muted)]" weight="fill" />
                </TooltipTrigger>
                <TooltipContent side="bottom">Joined</TooltipContent>
              </Tooltip>
            )}
          </div>
        </TooltipProvider>

        {/* Right icons row: genre icons + favorite — all inline */}
        {((club.genres && club.genres.length > 0) || (showFavorite && club.user_role)) && (
          <TooltipProvider>
            <div className="absolute top-[4.25rem] right-2 z-20 flex items-center gap-1">
              {club.genres?.map((slug) => {
                const genre = getGenreBySlug(slug as string);
                if (!genre) return null;
                return (
                  <Tooltip key={slug}>
                    <TooltipTrigger asChild>
                      <span>
                        <GenreIcon
                          slug={slug as string}
                          size={14}
                          weight="bold"
                          className="text-[var(--text-muted)]"
                        />
                      </span>
                    </TooltipTrigger>
                    <TooltipContent side="bottom">{genre.name}</TooltipContent>
                  </Tooltip>
                );
              })}
              {showFavorite && club.user_role && (
                <span className="ml-1 inline-flex" onClickCapture={(e) => e.preventDefault()}>
                  <FavoriteButton
                    clubId={club.id}
                    isFavorite={club.is_favorite ?? false}
                    size="icon-sm"
                    className="[&_svg]:w-4 [&_svg]:h-4 !p-0 !min-h-0 !min-w-0 !w-auto"
                  />
                </span>
              )}
            </div>
          </TooltipProvider>
        )}

        {/* Content area */}
        <div className="flex-1 flex flex-col items-center px-4 pt-2 pb-3">
          {/* Club name */}
          <h3 className="text-base font-semibold text-[var(--text-primary)] text-center truncate max-w-full">
            {club.name}
          </h3>

          {/* Description — hidden when collapsed */}
          {!isCollapsed && club.description && (
            <p className="text-xs text-[var(--text-secondary)] line-clamp-2 text-center mt-2 leading-relaxed">
              {club.description}
            </p>
          )}

          {/* Badge placeholders — hidden when collapsed */}
          {!isCollapsed && (
            <div className="flex gap-2 items-center justify-center mt-3">
              {Array.from({ length: 3 }).map((_, i) => {
                const badge = featuredBadges[i];
                if (badge) {
                  return <CategoryBadge key={badge.id} badge={badge} size="sm" showLabel={false} />;
                }
                return (
                  <div
                    key={`empty-${i}`}
                    className="w-9 h-9 rounded-full bg-[var(--surface-2)] shadow-[inset_0_1px_3px_rgba(0,0,0,0.3)]"
                  />
                );
              })}
            </div>
          )}
        </div>

        {/* Stats bar */}
        <TooltipProvider>
          <div
            className="flex items-center border-t border-[var(--border)] divide-x divide-[var(--border)]"
            style={{
              backgroundColor: themeColor ? `${themeColor}06` : "var(--surface-1)/50",
            }}
          >
            <StatCell
              icon={Users}
              value={club.member_count || 0}
              themeColor={themeColor}
              label="Members"
            />
            <StatCell
              icon={FilmReel}
              value={club.festival_count || 0}
              themeColor={themeColor}
              label="Festivals"
            />
            <StatCell
              icon={FilmStrip}
              value={club.movies_watched || 0}
              themeColor={themeColor}
              label="Movies Watched"
            />
          </div>
        </TooltipProvider>
      </div>
    </Wrapper>
  );
}

function StatCell({
  icon: Icon,
  value,
  themeColor,
  label,
}: {
  icon: React.ElementType;
  value: number;
  themeColor: string | null;
  label: string;
}) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <div className="flex-1 flex items-center justify-center gap-1.5 py-2.5">
          <Icon className="w-3.5 h-3.5" style={{ color: themeColor || "var(--text-muted)" }} />
          <span className="text-xs font-medium tabular-nums text-[var(--text-secondary)]">
            {value}
          </span>
        </div>
      </TooltipTrigger>
      <TooltipContent side="bottom">{label}</TooltipContent>
    </Tooltip>
  );
}
