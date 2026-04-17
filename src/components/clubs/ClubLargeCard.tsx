"use client";

import Link from "next/link";
import { EntityAvatar } from "@/components/ui/entity-avatar";
import { clubToAvatarData } from "@/lib/avatar-helpers";
import { BrandText } from "@/components/ui/brand-text";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { Users, Check, Lock, LockSimpleOpen } from "@phosphor-icons/react";
import { getPhaseDisplay, type FestivalPhase } from "@/lib/phase-labels";
import { FavoriteButton } from "@/components/clubs/FavoriteButton";
import NumberFlow from "@/components/ui/number-flow";
import { getClubThemeColorForGlow } from "@/lib/clubs/theme-colors";

interface ClubLargeCardProps {
  club: {
    id: string;
    slug: string;
    name: string;
    description?: string | null;
    logo_url?: string | null;
    picture_url?: string | null;
    member_count?: number;
    is_favorite?: boolean;
    is_member?: boolean;
    user_role?: string;
    festival_phase?: FestivalPhase;
    ratings_enabled?: boolean;
    theme_color?: string | null;
    privacy?: string | null;
    settings?: unknown;
  };
  showFavorite?: boolean;
  /** Hide favorite button entirely (used on discover page) */
  hideFavorite?: boolean;
  /** Show compact bottom metadata instead of inline (used on discover page) */
  compactMeta?: boolean;
  className?: string;
}

export function ClubLargeCard({
  club,
  showFavorite = true,
  hideFavorite = false,
  compactMeta = false,
  className,
}: ClubLargeCardProps) {
  const phaseDisplay = getPhaseDisplay(club.festival_phase ?? null, club.ratings_enabled ?? true);

  // Use theme_color for card background tint (matches ClubCard's 0.3 solid opacity)
  const themeGlow = getClubThemeColorForGlow(club.theme_color);
  const accentStyle = themeGlow
    ? {
        backgroundColor: `hsla(${themeGlow.h}, ${themeGlow.s}%, ${themeGlow.l}%, 0.3)`,
      }
    : undefined;

  const isModerated = club.privacy === "public_moderated";

  return (
    <div className={cn("relative", className)}>
      {/* Favorite Button - Only for members, hidden when hideFavorite is true */}
      {!hideFavorite && showFavorite && club.user_role && (
        /* event-blocker wrapper — keyboard handled by nested FavoriteButton */
        // eslint-disable-next-line jsx-a11y/click-events-have-key-events, jsx-a11y/no-static-element-interactions
        <div className="absolute top-3 right-3 z-10" onClick={(e) => e.preventDefault()}>
          <FavoriteButton clubId={club.id} isFavorite={club.is_favorite ?? false} size="sm" />
        </div>
      )}

      <Link href={`/club/${club.slug}`} className="block">
        <div
          className={cn(
            "relative flex items-center gap-4 p-4 rounded-xl transition-all overflow-hidden",
            "border border-[var(--emboss-border)]",
            "shadow-[var(--emboss-shadow)]",
            "hover:bg-[var(--surface-1)] hover:border-[var(--border)]",
            "group"
          )}
          style={accentStyle}
        >
          {/* Club Avatar */}
          <div className="flex-shrink-0">
            <EntityAvatar entity={clubToAvatarData(club)} emojiSet="club" size="xl" />
          </div>

          {/* Club Info */}
          <div className="flex-1 min-w-0">
            {/* Name and phase badge row */}
            <div className="flex items-center gap-2 mb-1">
              <h3 className="text-lg font-semibold text-[var(--text-primary)] truncate">
                <BrandText>{club.name}</BrandText>
              </h3>
              {/* Only show phase badge inline (not Joined - that moves to bottom right) */}
              {!compactMeta && club.is_member && (
                <Badge
                  variant="secondary"
                  className="text-[10px] px-1.5 py-0.5 h-auto bg-[var(--surface-3)] text-[var(--text-primary)] border-0 flex-shrink-0"
                >
                  Joined
                </Badge>
              )}
              {phaseDisplay && (
                <Badge
                  variant="secondary"
                  className={cn(
                    "text-[10px] px-1.5 py-0.5 h-auto border-0 flex-shrink-0",
                    phaseDisplay.className
                  )}
                >
                  {phaseDisplay.label}
                </Badge>
              )}
            </div>

            {/* Description */}
            {club.description && (
              <p className="text-sm text-[var(--text-muted)] line-clamp-2 mb-2">
                {club.description}
              </p>
            )}

            {/* Standard meta: members count and privacy label (non-compact mode) */}
            {!compactMeta && (
              <div className="flex items-center gap-4 text-xs text-[var(--text-muted)]">
                <span className="flex items-center gap-1">
                  <Users className="w-3.5 h-3.5" />
                  <NumberFlow value={club.member_count || 0} /> members
                </span>
                <span className="capitalize">{isModerated ? "Moderated" : "Open"}</span>
              </div>
            )}
          </div>

          {/* Compact meta: checkmark (if joined), members count, lock icon - bottom right corner */}
          {compactMeta && (
            <div className="absolute bottom-3 right-3 flex items-center gap-2.5 text-xs text-[var(--text-muted)]">
              {club.is_member && <Check className="w-4 h-4 text-[var(--primary)]" weight="bold" />}
              <span className="flex items-center gap-1">
                <Users className="w-3.5 h-3.5" />
                <NumberFlow value={club.member_count || 0} />
              </span>
              {isModerated ? (
                <Lock className="w-3.5 h-3.5" weight="fill" />
              ) : (
                <LockSimpleOpen className="w-3.5 h-3.5 opacity-50" />
              )}
            </div>
          )}
        </div>
      </Link>
    </div>
  );
}
