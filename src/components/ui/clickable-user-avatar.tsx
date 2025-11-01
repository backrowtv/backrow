"use client";

import { useState } from "react";
import { EntityAvatar } from "@/components/ui/entity-avatar";
import { UserPopupModal } from "@/components/profile/UserPopupModal";
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
