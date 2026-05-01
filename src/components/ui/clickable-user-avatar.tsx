"use client";

import { useState } from "react";
import { EntityAvatar } from "@/components/ui/entity-avatar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { UserPopupModal } from "@/components/profile/UserPopupModal";
import { UserPopupBody } from "@/components/profile/UserPopupBody";
import { useMediaQuery } from "@/lib/hooks/useMediaQuery";
import type { AvatarData } from "@/lib/avatar-helpers";
import type { AvatarProps } from "@/components/ui/avatar";

interface ClickableUserAvatarProps extends Omit<
  AvatarProps,
  | "src"
  | "alt"
  | "defaultAvatarIcon"
  | "defaultAvatarColor"
  | "defaultAvatarBorderColor"
  | "useBrandedBorder"
> {
  entity: AvatarData | null | undefined;
  alt?: string;
  /** User ID — if provided, avatar becomes clickable and opens profile popup */
  userId?: string | null;
  /** Force non-clickable even when userId is present */
  disabled?: boolean;
}

export function ClickableUserAvatar({
  entity,
  alt,
  userId,
  disabled,
  size = "md",
  className,
  ...props
}: ClickableUserAvatarProps) {
  const [popupOpen, setPopupOpen] = useState(false);
  const isDesktop = useMediaQuery("(min-width: 640px)");

  const isClickable = !!userId && !disabled;
  const displayName = entity?.name || "User";

  if (!isClickable) {
    return (
      <EntityAvatar
        entity={entity}
        emojiSet="user"
        alt={alt}
        size={size}
        className={className}
        {...props}
      />
    );
  }

  if (isDesktop) {
    return (
      <Popover open={popupOpen} onOpenChange={setPopupOpen}>
        <PopoverTrigger asChild>
          <button
            type="button"
            onClick={(e) => e.stopPropagation()}
            aria-label={`View ${displayName}'s profile`}
            className="cursor-pointer rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--primary)] focus-visible:ring-offset-2"
          >
            <EntityAvatar
              entity={entity}
              emojiSet="user"
              alt={alt}
              size={size}
              className={className}
              {...props}
            />
          </button>
        </PopoverTrigger>
        <PopoverContent
          side="bottom"
          align="start"
          sideOffset={8}
          className="w-[340px] p-0 bg-transparent border-none shadow-none"
        >
          <UserPopupBody userId={userId!} open={popupOpen} onClose={() => setPopupOpen(false)} />
        </PopoverContent>
      </Popover>
    );
  }

  return (
    <>
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          setPopupOpen(true);
        }}
        aria-label={`View ${displayName}'s profile`}
        className="cursor-pointer rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--primary)] focus-visible:ring-offset-2"
      >
        <EntityAvatar
          entity={entity}
          emojiSet="user"
          alt={alt}
          size={size}
          className={className}
          {...props}
        />
      </button>
      <UserPopupModal userId={userId!} open={popupOpen} onOpenChange={setPopupOpen} />
    </>
  );
}
