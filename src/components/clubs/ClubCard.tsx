"use client";

import { useRef, useEffect, useCallback } from "react";
import Link from "next/link";
import { EntityAvatar } from "@/components/ui/entity-avatar";
import { clubToAvatarData } from "@/lib/avatar-helpers";
import { BrandText } from "@/components/ui/brand-text";
import { cn } from "@/lib/utils";
import { Users } from "@phosphor-icons/react";
import { type FestivalPhase } from "@/lib/phase-labels";
import { FavoriteButton } from "@/components/clubs/FavoriteButton";
import NumberFlow from "@/components/ui/number-flow";
import { getClubThemeColorForGlow } from "@/lib/clubs/theme-colors";

interface ClubCardProps {
  club: {
    id: string;
    slug: string;
    name: string;
    logo_url?: string | null;
    picture_url?: string | null;
    member_count?: number;
    is_favorite?: boolean;
    user_role?: string;
    festival_phase?: FestivalPhase;
    ratings_enabled?: boolean;
    /** Club's theme color for card background tinting */
    theme_color?: string | null;
    /** Settings can be Json from the database, so we accept unknown */
    settings?: unknown;
  };
  showFavorite?: boolean;
  className?: string;
}

const DEFAULT_FONT_SIZE = 12; // text-xs on mobile
const MIN_FONT_SIZE = 9;

export function ClubCard({ club, showFavorite = true, className }: ClubCardProps) {
  const nameRef = useRef<HTMLHeadingElement>(null);

  const fitText = useCallback(() => {
    const el = nameRef.current;
    if (!el) return;
    el.style.fontSize = `${DEFAULT_FONT_SIZE}px`;
    let size = DEFAULT_FONT_SIZE;
    while (el.scrollHeight > el.clientHeight && size > MIN_FONT_SIZE) {
      size--;
      el.style.fontSize = `${size}px`;
    }
  }, []);

  useEffect(() => {
    fitText();
  }, [club.name, fitText]);

  // Use theme_color for card background tint (no fallback - no theme = no tint)
  const themeGlow = getClubThemeColorForGlow(club.theme_color);
  const accentStyle = themeGlow
    ? {
        backgroundColor: `hsla(${themeGlow.h}, ${themeGlow.s}%, ${themeGlow.l}%, 0.3)`,
      }
    : undefined;

  return (
    <div className={cn("relative", className)}>
      {/* Member Count - top left */}
      <div className="absolute top-2 left-2 z-10 flex items-center gap-0.5 text-[10px] text-[var(--text-muted)]">
        <Users className="w-2.5 h-2.5" />
        <NumberFlow value={club.member_count || 0} />
      </div>

      {/* Favorite Button - top right */}
      {showFavorite && club.user_role && (
        <div className="absolute top-1.5 right-1.5 z-10" onClick={(e) => e.preventDefault()}>
          <FavoriteButton
            clubId={club.id}
            isFavorite={club.is_favorite ?? false}
            size="icon-sm"
            className="[&_svg]:w-3.5 [&_svg]:h-3.5"
          />
        </div>
      )}

      <Link href={`/club/${club.slug}`} className="block">
        <div
          className={cn(
            "relative flex flex-col items-center justify-center p-1.5 sm:p-3 rounded-xl transition-all overflow-hidden aspect-square",
            "border border-[var(--emboss-border)]",
            "shadow-[var(--emboss-shadow)]",
            "hover:bg-[var(--surface-1)] hover:border-[var(--border)]",
            "group"
          )}
          style={accentStyle}
        >
          {/* Club Avatar */}
          <EntityAvatar
            entity={clubToAvatarData(club)}
            emojiSet="club"
            size="lg"
            className="mb-1"
          />

          {/* Club Name - fills remaining bottom space */}
          <h3
            ref={nameRef}
            className="text-xs sm:text-sm font-medium text-[var(--text-primary)] text-center w-full flex-1 overflow-hidden leading-tight flex items-center justify-center"
          >
            <BrandText>{club.name}</BrandText>
          </h3>
        </div>
      </Link>
    </div>
  );
}
