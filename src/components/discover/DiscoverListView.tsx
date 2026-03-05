"use client";

import Link from "next/link";
import { EntityAvatar } from "@/components/ui/entity-avatar";
import { clubToAvatarData } from "@/lib/avatar-helpers";
import { cn } from "@/lib/utils";
import { Check, Users, FilmReel, FilmStrip, Lock } from "@phosphor-icons/react";
import { getClubThemeColor, getClubThemeColorForGlow } from "@/lib/clubs/theme-colors";

interface ClubData {
  id: string;
  slug: string;
  name: string;
  description?: string | null;
  picture_url?: string | null;
  member_count?: number;
  festival_count?: number;
  movies_watched?: number;
  is_member?: boolean;
  privacy?: string | null;
  theme_color?: string | null;
  settings?: unknown;
  keywords?: string[] | null;
}

interface DiscoverListViewProps {
  clubs: ClubData[];
  className?: string;
}

export function DiscoverListView({ clubs, className }: DiscoverListViewProps) {
  return (
    <div className={cn("space-y-0", className)}>
      {/* Table header */}
      <div className="hidden md:grid grid-cols-[1fr_80px_80px_80px] gap-2 px-4 py-2 text-[10px] font-semibold text-[var(--text-muted)] uppercase tracking-wider">
        <span>Club</span>
        <span className="text-center">Members</span>
        <span className="text-center">Festivals</span>
        <span className="text-center">Movies</span>
      </div>

      {/* Rows */}
      <div className="space-y-1.5">
        {clubs.map((club) => (
          <DiscoverListItem key={club.id} club={club} />
        ))}
      </div>
    </div>
  );
}

function DiscoverListItem({ club }: { club: ClubData }) {
  const isModerated = club.privacy === "public_moderated";
  const themeColor = club.theme_color ? getClubThemeColor(club.theme_color) : null;
  const themeHsl = club.theme_color ? getClubThemeColorForGlow(club.theme_color) : null;

  return (
    <Link href={`/club/${club.slug}`} className="block group">
      <div
        className="relative overflow-hidden rounded-xl border border-[var(--border)] bg-[var(--card)] transition-all duration-200 hover:border-[var(--border-hover)] hover:shadow-md"
        style={
          themeHsl
            ? ({
                "--row-accent": `hsla(${themeHsl.h}, ${themeHsl.s}%, ${themeHsl.l}%, 0.06)`,
              } as React.CSSProperties)
            : undefined
        }
      >
        <div className="flex items-stretch">
          {/* Left accent stripe */}
          <div
            className="w-[3px] flex-shrink-0"
            style={{ backgroundColor: themeColor || "var(--border)" }}
          />

          {/* Grid layout matching header columns */}
          <div className="flex-1 md:grid md:grid-cols-[1fr_80px_80px_80px] md:gap-2 md:items-center group-hover:bg-[var(--row-accent,transparent)] transition-colors">
            {/* Club info cell */}
            <div className="flex items-center gap-3 p-3">
              <EntityAvatar
                entity={clubToAvatarData(club)}
                emojiSet="club"
                size="md"
                className="flex-shrink-0"
              />
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1.5">
                  <h3 className="text-sm font-semibold text-[var(--text-primary)] truncate">
                    {club.name}
                  </h3>
                  {isModerated && (
                    <Lock
                      className="w-3 h-3 text-[var(--text-muted)] flex-shrink-0"
                      weight="bold"
                    />
                  )}
                  {club.is_member && (
                    <Check
                      className="w-3.5 h-3.5 text-[var(--primary)] flex-shrink-0"
                      weight="bold"
                    />
                  )}
                </div>
                {club.description && (
                  <p className="text-xs text-[var(--text-secondary)] line-clamp-1 mt-0.5 leading-relaxed">
                    {club.description}
                  </p>
                )}
                {/* Mobile stats row */}
                <div className="flex items-center gap-3 mt-1.5 md:hidden text-[11px] text-[var(--text-muted)]">
                  <span className="inline-flex items-center gap-1">
                    <Users className="w-3 h-3" />
                    {club.member_count || 0}
                  </span>
                  <span className="inline-flex items-center gap-1">
                    <FilmReel className="w-3 h-3" />
                    {club.festival_count || 0}
                  </span>
                  <span className="inline-flex items-center gap-1">
                    <FilmStrip className="w-3 h-3" />
                    {club.movies_watched || 0}
                  </span>
                </div>
              </div>
            </div>

            {/* Data cells — desktop only, aligned with header */}
            <div className="hidden md:flex items-center justify-center py-3">
              <span className="text-sm font-medium tabular-nums text-[var(--text-secondary)]">
                {club.member_count || 0}
              </span>
            </div>
            <div className="hidden md:flex items-center justify-center py-3">
              <span className="text-sm font-medium tabular-nums text-[var(--text-secondary)]">
                {club.festival_count || 0}
              </span>
            </div>
            <div className="hidden md:flex items-center justify-center py-3 pr-3">
              <span className="text-sm font-medium tabular-nums text-[var(--text-secondary)]">
                {club.movies_watched || 0}
              </span>
            </div>
          </div>
        </div>
      </div>
    </Link>
  );
}
