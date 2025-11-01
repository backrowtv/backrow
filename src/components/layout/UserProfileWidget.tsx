"use client";

import Link from "next/link";
import { Avatar } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { useUserProfile } from "@/components/auth/UserProfileProvider";
import { getAvatarIconSrc, getAvatarColor, getAvatarBorderColor } from "@/lib/avatar-constants";
import Image from "next/image";

interface UserProfileWidgetProps {
  className?: string;
  collapsed?: boolean;
}

export function UserProfileWidget({ className, collapsed = false }: UserProfileWidgetProps) {
  // Get user profile from shared provider - automatically updates when profile changes
  const { profile } = useUserProfile();

  // Map to local format for compatibility
  const user = profile
    ? {
        email: profile.email,
        avatar_url: profile.avatar_url ?? undefined,
        display_name: profile.display_name ?? undefined,
        avatar_icon: profile.avatar_icon,
        avatar_color_index: profile.avatar_color_index,
        avatar_border_color_index: profile.avatar_border_color_index,
      }
    : null;

  if (!user) return null;

  // Get avatar icon, color, and border color from proper columns
  const avatarIcon = user.avatar_icon;
  const avatarColorIndex = user.avatar_color_index;
  const avatarBorderColorIndex = user.avatar_border_color_index;
  const avatarIconSrc = avatarIcon ? getAvatarIconSrc(avatarIcon, "user") : null;
  const defaultAvatarIcon = avatarIconSrc ? (
    <Image
      src={avatarIconSrc}
      alt=""
      width={64}
      height={64}
      className="w-[65%] h-[65%] object-contain"
      draggable={false}
    />
  ) : avatarIcon && avatarIcon !== "letter" && avatarIcon !== "photo" ? (
    (user.display_name || "?").charAt(0).toUpperCase()
  ) : undefined;
  const defaultAvatarColor =
    avatarColorIndex != null ? getAvatarColor(avatarColorIndex as number) : undefined;
  const defaultAvatarBorderColor = getAvatarBorderColor(avatarBorderColorIndex ?? undefined);

  // Founder accounts get branded primary border on uploaded photos
  const isFounder = user.email === "stephen@backrow.tv";

  const buttonContent = (
    <Button
      variant="ghost"
      className={cn(
        "w-full h-8 rounded-md transition-all duration-150 ease-out",
        "will-change-[background-color,color,transform]",
        "hover:bg-[var(--hover)]",
        "active:scale-[0.98]",
        collapsed ? "justify-center px-2" : "justify-start px-2",
        "group",
        className
      )}
    >
      <div
        className={cn(
          "flex items-center w-full transition-all duration-150 ease-out",
          collapsed ? "justify-center" : "gap-2"
        )}
      >
        <div className="relative">
          <Avatar
            src={user.avatar_url}
            alt={user.display_name || user.email || "User"}
            size="sm"
            className="transition-transform duration-200 group-hover:scale-105"
            defaultAvatarIcon={defaultAvatarIcon}
            defaultAvatarColor={defaultAvatarColor}
            defaultAvatarBorderColor={defaultAvatarBorderColor}
            useBrandedBorder={isFounder}
          />
        </div>
        {!collapsed && (
          <div className="flex-1 text-left min-w-0 transition-opacity duration-200">
            <p className="text-sm font-medium truncate text-[var(--text-primary)]">
              {user.display_name || user.email?.split("@")[0] || "User"}
            </p>
            <p className="text-xs text-[var(--text-muted)] truncate">View Profile</p>
          </div>
        )}
      </div>
    </Button>
  );

  if (collapsed) {
    return (
      <TooltipProvider delayDuration={150}>
        <Tooltip>
          <TooltipTrigger asChild>
            <Link
              href="/profile"
              className="block transition-transform duration-150 ease-out active:scale-[0.98]"
            >
              {buttonContent}
            </Link>
          </TooltipTrigger>
          <TooltipContent side="right" className="transition-opacity duration-150">
            <p>{user.display_name || user.email?.split("@")[0] || "User"}</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  return (
    <Link
      href="/profile"
      className="block transition-transform duration-150 ease-out active:scale-[0.98]"
    >
      {buttonContent}
    </Link>
  );
}
