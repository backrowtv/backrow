"use client";

import { usePathname } from "next/navigation";
import { Avatar } from "@/components/ui/avatar";
import { SocialLinksDisplay } from "@/components/profile/SocialLinks";
import Link from "next/link";
import { PencilSimple } from "@phosphor-icons/react";
import { getAvatarColor, getAvatarIconSrc, getAvatarBorderColor } from "@/lib/avatar-constants";
import Image from "next/image";

interface ProfileHeaderWrapperProps {
  profile: {
    avatar_url?: string | null;
    display_name?: string | null;
    username?: string | null;
    bio?: string | null;
    // Avatar columns - stored as proper columns, not in social_links JSON
    avatar_icon?: string | null;
    avatar_color_index?: number | null;
    avatar_border_color_index?: number | null;
    // Keep social_links for actual social links only
    social_links?: { letterboxd?: string; imdb?: string; trakt?: string; tmdb?: string } | null;
    email?: string | null;
  };
  favoriteClub?: { id: string; name: string } | null;
}

// Paths where the profile header should be shown (not settings pages)
const SHOW_HEADER_PATHS = [
  "/profile",
  "/profile/activity",
  "/profile/history",
  "/profile/stats",
  "/profile/reviews",
  "/profile/display-case",
  "/profile/future-nominations",
  "/profile/edit",
];

export function ProfileHeaderWrapper({ profile, favoriteClub }: ProfileHeaderWrapperProps) {
  const pathname = usePathname();

  // Check if we should show the header
  // Show on exact matches or year-in-review pages
  const shouldShowHeader =
    SHOW_HEADER_PATHS.includes(pathname) || pathname.startsWith("/profile/year-in-review-");

  if (!shouldShowHeader) {
    return null;
  }

  const displayName = profile.display_name || profile.email?.split("@")[0] || "User";
  const initials = displayName
    .split(" ")
    .map((n: string) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  // Get avatar icon, color, and border color from proper columns
  const avatarIcon = profile.avatar_icon;
  const avatarColorIndex = profile.avatar_color_index;
  const avatarBorderColorIndex = profile.avatar_border_color_index;

  // Only use default avatar if there's no uploaded image
  const showDefaultAvatar = !profile.avatar_url && avatarIcon != null && avatarColorIndex != null;
  const avatarIconSrc =
    showDefaultAvatar && avatarIcon ? getAvatarIconSrc(avatarIcon, "user") : null;
  const defaultAvatarIcon: React.ReactNode | string | undefined = avatarIconSrc ? (
    <Image
      src={avatarIconSrc}
      alt=""
      width={64}
      height={64}
      className="w-[65%] h-[65%] object-contain"
      draggable={false}
    />
  ) : showDefaultAvatar && avatarIcon && avatarIcon !== "letter" && avatarIcon !== "photo" ? (
    displayName.charAt(0).toUpperCase()
  ) : undefined;
  const defaultAvatarColor =
    showDefaultAvatar && avatarColorIndex != null
      ? getAvatarColor(avatarColorIndex as number)
      : undefined;
  const defaultAvatarBorderColor = showDefaultAvatar
    ? getAvatarBorderColor(avatarBorderColorIndex ?? undefined)
    : undefined;

  // Founder accounts get branded primary border on uploaded photos
  const isFounder = profile.email === "stephen@backrow.tv";

  return (
    <div className="border-b border-[var(--border)]">
      <div className="max-w-5xl mx-auto px-4 lg:px-6 py-6">
        <div className="flex items-start gap-4">
          {/* Avatar */}
          <Avatar
            src={profile.avatar_url || undefined}
            alt={displayName}
            fallback={initials}
            size="xl"
            className="flex-shrink-0"
            defaultAvatarIcon={defaultAvatarIcon}
            defaultAvatarColor={defaultAvatarColor}
            defaultAvatarBorderColor={defaultAvatarBorderColor}
            useBrandedBorder={isFounder}
          />

          {/* Info */}
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2">
              <div className="flex-1 min-w-0">
                <h1 className="text-base sm:text-xl font-bold text-[var(--text-primary)]">
                  {displayName}
                </h1>
                {profile.username && (
                  <p className="text-sm text-[var(--text-muted)]">@{profile.username}</p>
                )}
              </div>
              <Link
                href="/profile/settings"
                className="p-1.5 rounded-md text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--surface-1)] transition-colors"
                title="Edit profile"
              >
                <PencilSimple className="w-4 h-4" />
              </Link>
            </div>

            {/* Bio */}
            {profile.bio && (
              <p className="text-sm text-[var(--text-secondary)] mt-2 line-clamp-2">
                {profile.bio}
              </p>
            )}

            {/* Favorite Club + Social Links Row */}
            <div className="flex flex-wrap items-center gap-3 mt-3">
              {favoriteClub && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium bg-[var(--surface-3)] text-[var(--text-primary)]">
                  <svg className="h-3 w-3 fill-current" viewBox="0 0 20 20">
                    <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                  </svg>
                  {favoriteClub.name}
                </span>
              )}
              <SocialLinksDisplay socialLinks={profile.social_links || null} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
