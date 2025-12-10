"use client";

import { useState } from "react";
import { Database } from "@/types/database";
import { EntityAvatar } from "@/components/ui/entity-avatar";
import { userToAvatarData } from "@/lib/avatar-helpers";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { RoleBadge } from "./RoleBadge";
import { DotsThreeVertical } from "@phosphor-icons/react";
import { DateDisplay } from "@/components/ui/date-display";
import { cn } from "@/lib/utils";
import Link from "next/link";
import { UserPopupModal } from "@/components/profile/UserPopupModal";

type ClubMember = Database["public"]["Tables"]["club_members"]["Row"];
type User = Database["public"]["Tables"]["users"]["Row"];

interface MemberListItemProps {
  member: ClubMember & { users: User | null };
  /** @deprecated Stats are no longer displayed */
  stats?: {
    points: number;
    festivals: number;
  };
  currentUserRole?: string;
  currentUserId?: string;
  onUpdateRole?: (userId: string, newRole: "critic" | "director") => void;
  onRemoveMember?: (userId: string) => void;
}

export function MemberListItem({
  member,
  stats: _stats,
  currentUserRole,
  currentUserId,
  onUpdateRole,
  onRemoveMember,
}: MemberListItemProps) {
  const [popupOpen, setPopupOpen] = useState(false);

  const displayName =
    member.club_display_name || member.users?.display_name || member.users?.email || "Unknown User";

  const username = member.users?.username;
  const isCurrentUser = member.user_id === currentUserId;
  const canManageMembers = currentUserRole === "producer" || currentUserRole === "director";
  const canEdit =
    canManageMembers &&
    !isCurrentUser &&
    member.role !== "producer" &&
    (currentUserRole === "producer" ||
      (currentUserRole === "director" && member.role === "critic"));

  const joinDate = member.joined_at || new Date().toISOString();

  // Handle avatar/name click - own profile goes to /profile, others open popup
  const handleUserClick = () => {
    if (isCurrentUser) {
      window.location.href = "/profile";
    } else {
      setPopupOpen(true);
    }
  };

  return (
    <>
      <div
        className={cn(
          "flex items-center gap-2 py-1.5 text-xs",
          "border-b border-[var(--border)] last:border-b-0"
        )}
      >
        {/* Avatar */}
        {isCurrentUser ? (
          <Link href="/profile" className="flex-shrink-0">
            <EntityAvatar entity={userToAvatarData(member.users)} emojiSet="user" size="xs" />
          </Link>
        ) : (
          <button
            onClick={handleUserClick}
            className="flex-shrink-0 hover:opacity-80 transition-opacity"
          >
            <EntityAvatar entity={userToAvatarData(member.users)} emojiSet="user" size="xs" />
          </button>
        )}

        {/* Name, Username, Role */}
        <div className="flex items-center gap-1.5 min-w-0 flex-1">
          {isCurrentUser ? (
            <Link href="/profile" className="font-medium text-[var(--text-primary)] truncate">
              {displayName}
              <span className="text-[var(--text-muted)] font-normal ml-1">(you)</span>
            </Link>
          ) : (
            <button
              onClick={handleUserClick}
              className="font-medium text-[var(--text-primary)] truncate text-left"
            >
              {displayName}
            </button>
          )}
          {username && (
            <span className="text-[var(--text-muted)] truncate hidden sm:inline">@{username}</span>
          )}
          <RoleBadge role={member.role as "producer" | "director" | "critic"} size="sm" />
        </div>

        {/* Join Date */}
        <span className="text-[var(--text-muted)] whitespace-nowrap hidden sm:inline">
          <DateDisplay date={joinDate} format="date" />
        </span>

        {/* Actions */}
        {canEdit && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button size="sm" variant="ghost" className="h-6 w-6 p-0">
                <DotsThreeVertical className="h-3.5 w-3.5" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {member.role === "critic" && (
                <DropdownMenuItem onClick={() => onUpdateRole?.(member.user_id, "director")}>
                  Promote to Director
                </DropdownMenuItem>
              )}
              {currentUserRole === "producer" && member.role === "director" && (
                <DropdownMenuItem onClick={() => onUpdateRole?.(member.user_id, "critic")}>
                  Demote to Critic
                </DropdownMenuItem>
              )}
              <DropdownMenuSeparator />
              <DropdownMenuItem
                className="text-destructive"
                onClick={() => onRemoveMember?.(member.user_id)}
              >
                Remove from Club
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>

      {/* User Popup Modal - only for other users */}
      {!isCurrentUser && (
        <UserPopupModal userId={member.user_id} open={popupOpen} onOpenChange={setPopupOpen} />
      )}
    </>
  );
}
