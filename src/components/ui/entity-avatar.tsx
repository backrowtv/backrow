"use client";

import Image from "next/image";
import { Avatar, type AvatarProps } from "@/components/ui/avatar";
import type { AvatarData } from "@/lib/avatar-helpers";
import {
  getAvatarColor,
  getAvatarBorderColor,
  getAvatarIconSrc,
  BACKROW_ICON_ID,
  BACKROW_ICON_PATH,
  BACKROW_BRAND_SAGE,
} from "@/lib/avatar-constants";
import { isBackRowFeaturedClub } from "@/lib/clubs/backrow-featured";

const FOUNDER_EMAIL = "stephen@backrow.tv";

/**
 * Renders the BackRow theater icon SVG
 */
function BackRowIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="-8 -8 528 528"
      className={className}
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
      fill="currentColor"
    >
      <g>
        <path d={BACKROW_ICON_PATH} />
        <circle cx="385.77" cy="12.069" r="10" />
      </g>
    </svg>
  );
}

interface EntityAvatarProps extends Omit<
  AvatarProps,
  | "src"
  | "alt"
  | "defaultAvatarIcon"
  | "defaultAvatarColor"
  | "defaultAvatarBorderColor"
  | "useBrandedBorder"
> {
  /** Normalized avatar data from userToAvatarData() or clubToAvatarData() */
  entity: AvatarData | null | undefined;
  /** Which icon set to use for resolution: 'user' (15 icons) or 'club' (50 icons) */
  emojiSet?: "user" | "club";
  /** Optional override for alt text */
  alt?: string;
}

/**
 * EntityAvatar - Unified avatar component for users and clubs.
 *
 * Replaces UserAvatar, ClubAvatar, and BackRowFeaturedAvatar with a single component.
 * Automatically handles founder branding (via email).
 *
 * Usage:
 * ```tsx
 * // For users
 * <EntityAvatar entity={userToAvatarData(user)} emojiSet="user" size="md" />
 *
 * // For clubs
 * <EntityAvatar entity={clubToAvatarData(club)} emojiSet="club" size="md" />
 * ```
 */
export function EntityAvatar({
  entity,
  emojiSet = "user",
  alt,
  size = "md",
  className,
  ...props
}: EntityAvatarProps) {
  if (!entity) {
    return <Avatar alt={alt || "Avatar"} size={size} className={className} {...props} />;
  }

  const displayName = entity.name || "Avatar";

  // Standard avatar rendering
  const isPhotoMode = entity.avatar_icon === "photo";
  const isBackRowIcon = entity.avatar_icon === BACKROW_ICON_ID;

  // Resolve the icon
  let defaultAvatarIcon: string | React.ReactNode | undefined;
  if (isPhotoMode) {
    // Photo mode: no icon, just show the image
    defaultAvatarIcon = undefined;
  } else if (isBackRowIcon) {
    defaultAvatarIcon = <BackRowIcon className="w-[70%] h-[70%]" />;
  } else if (entity.avatar_icon) {
    const iconSrc = getAvatarIconSrc(entity.avatar_icon, emojiSet);
    if (iconSrc) {
      defaultAvatarIcon = (
        <Image
          src={iconSrc}
          alt=""
          width={64}
          height={64}
          className="w-[65%] h-[65%] object-contain"
          draggable={false}
        />
      );
    } else {
      // No matching icon — fall back to letter
      defaultAvatarIcon = displayName.charAt(0).toUpperCase() || "?";
    }
  } else {
    // No icon set — show first letter
    defaultAvatarIcon = displayName.charAt(0).toUpperCase() || "?";
  }

  // Resolve colors
  let defaultAvatarColor =
    entity.avatar_color_index !== undefined && entity.avatar_color_index !== null && !isPhotoMode
      ? getAvatarColor(entity.avatar_color_index)
      : undefined;
  let defaultAvatarBorderColor = getAvatarBorderColor(entity.avatar_border_color_index);

  // BackRow Featured is locked to the brand sage regardless of the viewer's site theme.
  if (isBackRowFeaturedClub(entity.slug, entity.name)) {
    if (defaultAvatarColor === "var(--primary)") defaultAvatarColor = BACKROW_BRAND_SAGE;
    if (defaultAvatarBorderColor === "var(--primary)")
      defaultAvatarBorderColor = BACKROW_BRAND_SAGE;
  }

  // Founder accounts get branded primary border on uploaded photos (unless they set a custom border)
  const isFounder = entity.email === FOUNDER_EMAIL;
  const useBrandedBorder = isFounder && !defaultAvatarBorderColor;

  return (
    <Avatar
      src={entity.avatar_url ?? undefined}
      alt={alt || displayName}
      defaultAvatarIcon={defaultAvatarIcon}
      defaultAvatarColor={defaultAvatarColor}
      defaultAvatarBorderColor={defaultAvatarBorderColor}
      useBrandedBorder={useBrandedBorder}
      size={size}
      className={className}
      {...props}
    />
  );
}
