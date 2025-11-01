"use client";

import { cn } from "@/lib/utils";
import { Card } from "@/components/ui/card";
import { Text } from "@/components/ui/typography";
import { EntityAvatar } from "@/components/ui/entity-avatar";
import { userToAvatarData, type AvatarData } from "@/lib/avatar-helpers";
import { SocialLinksDisplay } from "@/components/profile/SocialLinks";
import { CategoryBadge } from "./CategoryBadge";
import Image from "next/image";
import Link from "next/link";
import { User, FilmSlate, Users, CalendarBlank } from "@phosphor-icons/react";
import { getTMDBBlurDataURL } from "@/lib/utils/blur-placeholder";
import type { IDCardSettings, FeaturedBadge, UserIDCardStats } from "@/types/id-card";
import type { UserFavorite } from "@/types/favorites";

interface SocialLinksData {
  letterboxd?: string;
  letterboxd_visible?: boolean;
  imdb?: string;
  imdb_visible?: boolean;
  trakt?: string;
  trakt_visible?: boolean;
  tmdb?: string;
  tmdb_visible?: boolean;
  youtube?: string;
  youtube_visible?: boolean;
  twitter?: string;
  twitter_visible?: boolean;
  instagram?: string;
  instagram_visible?: boolean;
  reddit?: string;
  reddit_visible?: boolean;
  discord?: string;
  discord_visible?: boolean;
  tiktok?: string;
  tiktok_visible?: boolean;
}

interface FavoriteClub {
  id: string;
  name: string;
  slug: string;
}

export interface UserBadge {
  id: string;
  name: string;
  icon_url?: string | null;
}

export interface UserIDCardUser extends AvatarData {
  id: string;
  display_name: string;
  username?: string | null;
  bio?: string | null;
  social_links?: SocialLinksData | null;
  id_card_settings?: IDCardSettings | null;
  joined_at?: string | null;
}

export interface UserIDCardFavorites {
  featured: UserFavorite[];
  club?: FavoriteClub | null;
}

export interface UserIDCardAchievements {
  festivalWins: { first: number; second: number; third: number };
  badges: UserBadge[];
}

export interface UserIDCardProps {
  user: UserIDCardUser;
  favorites?: UserIDCardFavorites | null;
  achievements?: UserIDCardAchievements | null;
  stats?: UserIDCardStats | null;
  featuredBadges?: FeaturedBadge[];
  variant?: "full" | "compact";
  showEditButton?: boolean;
  className?: string;
}

/**
 * UserIDCard - A horizontal membership card with fixed aspect ratio
 *
 * Layout:
 * - Header: Avatar, Display Name, @username, Social Icons, Bio
 * - Stats: Clubs count, Movies watched count
 * - Display Case Row 1: Favorite movie + 3 favorite people (all rectangular posters)
 * - Display Case Row 2: 5 featured badges (circles)
 */
export function UserIDCard({
  user,
  favorites,
  stats,
  featuredBadges = [],
  variant = "full",
  showEditButton: _showEditButton = false,
  className,
}: UserIDCardProps) {
  const isCompact = variant === "compact";

  // Filter social links based on visibility settings
  const visibleSocialLinks = getVisibleSocialLinks(user.social_links, user.id_card_settings);
  const hasSocialLinks = visibleSocialLinks && Object.values(visibleSocialLinks).some(Boolean);

  return (
    <Card
      variant="elevated"
      className={cn(
        "overflow-hidden rounded-2xl",
        "w-full",
        "aspect-[1.586/1]",
        "bg-[var(--surface-2)]",
        "shadow-[var(--shadow-lg)]",
        className
      )}
    >
      <div
        className={cn("p-4 pb-2.5 h-full flex flex-col justify-between", isCompact && "p-3 pb-2")}
      >
        {/* Top section */}
        <div>
          {/* Header Section - Avatar + Info side by side */}
          <div className="flex gap-3">
            {/* Avatar */}
            <EntityAvatar
              entity={userToAvatarData(user)}
              emojiSet="user"
              size="xl"
              className="flex-shrink-0"
            />

            {/* Name, Username, Social Icons */}
            <div className="flex-1 min-w-0">
              <div className="flex flex-wrap items-baseline gap-x-1.5 min-w-0">
                <Text
                  size="sm"
                  className="font-semibold text-[var(--text-primary)] truncate max-w-full"
                >
                  {user.display_name}
                </Text>
                {user.username && (
                  <Text size="tiny" muted className="shrink-0">
                    @{user.username}
                  </Text>
                )}
              </div>
              {/* Social links */}
              {hasSocialLinks && (
                <div className="mt-1 overflow-hidden">
                  <SocialLinksDisplay socialLinks={visibleSocialLinks} size="md" />
                </div>
              )}
            </div>
          </div>

          {/* Motto - full width, left aligned */}
          {user.bio && (
            <p className="mt-1 text-[11px] leading-tight italic text-[var(--text-muted)] line-clamp-2">
              &ldquo;{user.bio.slice(0, 100)}&rdquo;
            </p>
          )}
        </div>

        {/* Bottom section - Favorites, Badges, Stats */}
        <div>
          {/* Favorites & Badges Row - fixed height so card doesn't shift */}
          <div className="pt-2">
            <div className="flex items-end justify-between h-11">
              {/* Favorites - left side */}
              <div className="flex items-end gap-2">
                {favorites?.featured.map((fav) => (
                  <FavoriteCard
                    key={fav.id}
                    href={
                      fav.item_type === "movie"
                        ? `/movies/${fav.tmdb_id}`
                        : `/person/${fav.tmdb_id}`
                    }
                    imageSrc={fav.image_path}
                    title={fav.title}
                    size="sm"
                  />
                ))}
              </div>

              {/* Badges - right side, vertically centered with posters */}
              <div className="flex gap-2 items-center self-center">
                {Array.from({ length: 3 }).map((_, i) => {
                  const badge = featuredBadges[i];
                  if (badge) {
                    return (
                      <CategoryBadge key={badge.id} badge={badge} size="sm" showLabel={false} />
                    );
                  }
                  return (
                    <div
                      key={`empty-${i}`}
                      className="w-9 h-9 rounded-full bg-[var(--surface-2)] shadow-[inset_0_1px_3px_rgba(0,0,0,0.3)]"
                    />
                  );
                })}
              </div>
            </div>
          </div>

          {/* Stats Row */}
          {(stats || user.joined_at) && (
            <div className="mt-1.5 pt-1.5 flex justify-between items-center text-xs text-[var(--text-muted)] flex-1">
              {stats && (
                <>
                  <div className="flex items-center gap-1">
                    <Users weight="fill" className="w-3 h-3" />
                    <span>
                      {stats.clubsCount} {stats.clubsCount === 1 ? "club" : "clubs"}
                    </span>
                  </div>
                  <div className="flex items-center gap-1">
                    <FilmSlate weight="fill" className="w-3 h-3" />
                    <span>
                      {stats.moviesWatchedCount}{" "}
                      {stats.moviesWatchedCount === 1 ? "movie" : "movies"}
                    </span>
                  </div>
                </>
              )}
              {user.joined_at && (
                <div className="flex items-center gap-1">
                  <CalendarBlank weight="fill" className="w-3 h-3" />
                  <span suppressHydrationWarning>
                    Issued{" "}
                    {new Date(user.joined_at).toLocaleDateString("en-US", {
                      month: "2-digit",
                      year: "numeric",
                    })}
                  </span>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </Card>
  );
}

/**
 * Filter social links based on visibility settings
 * Uses {platform}_visible fields in social_links (existing pattern from LinkedAccountsForm)
 * Max 5 social links can be displayed on the ID card
 */
function getVisibleSocialLinks(
  socialLinks: SocialLinksData | null | undefined,
  _settings: IDCardSettings | null | undefined // Kept for backward compatibility
): SocialLinksData | null {
  if (!socialLinks) return null;

  const result: SocialLinksData = {};
  const platforms = [
    "letterboxd",
    "imdb",
    "trakt",
    "tmdb",
    "youtube",
    "twitter",
    "instagram",
    "reddit",
    "discord",
    "tiktok",
  ] as const;
  const MAX_DISPLAY = 5;
  let count = 0;

  for (const platform of platforms) {
    if (count >= MAX_DISPLAY) break;

    const visibilityKey = `${platform}_visible` as keyof SocialLinksData;
    // Show if: link exists AND visibility is not explicitly false
    if (socialLinks[platform] && socialLinks[visibilityKey] !== false) {
      result[platform] = socialLinks[platform];
      count++;
    }
  }

  return Object.keys(result).length > 0 ? result : null;
}

/**
 * FavoriteCard - Unified card for displaying favorite movie/person
 * Uses rectangular aspect ratio matching movie posters
 * Responsive: smaller on mobile to fit within half card width
 */
function FavoriteCard({
  href,
  imageSrc,
  title,
  size = "md",
}: {
  href: string;
  imageSrc: string | null;
  title: string;
  size?: "xs" | "sm" | "md";
}) {
  const sizeClasses = {
    xs: "w-7 aspect-[2/3]",
    sm: "w-[34px] aspect-[2/3]",
    md: "flex-1 max-w-[36px] sm:max-w-none sm:flex-none sm:w-12 aspect-[2/3]",
  };

  return (
    <Link href={href} className="group" title={title}>
      <div
        className={cn(
          "overflow-hidden bg-[var(--surface-2)] transition-transform group-hover:scale-105",
          size === "xs" ? "rounded" : "rounded-lg",
          sizeClasses[size]
        )}
      >
        {imageSrc ? (
          <Image
            src={imageSrc}
            alt={title}
            width={48}
            height={72}
            className="w-full h-full object-cover"
            placeholder="blur"
            blurDataURL={getTMDBBlurDataURL()}
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <User className="w-4 h-4 text-[var(--text-muted)]" />
          </div>
        )}
      </div>
    </Link>
  );
}
