"use client";

import { Database } from "@/types/database";
import { Card, CardContent } from "@/components/ui/card";
import { ClickableUserAvatar } from "@/components/ui/clickable-user-avatar";
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
import { ChatCircle, User, DotsThreeVertical } from "@phosphor-icons/react";
import { DateDisplay } from "@/components/ui/date-display";

type ClubMember = Database["public"]["Tables"]["club_members"]["Row"];
type User = Database["public"]["Tables"]["users"]["Row"];

interface MemberCardProps {
  member: ClubMember & { users: User | null };
  stats?: {
    points: number;
    festivals: number;
  };
  currentUserRole?: string;
  currentUserId?: string;
  onUpdateRole?: (userId: string, newRole: "critic" | "director") => Promise<void>;
  onRemoveMember?: (userId: string) => Promise<void>;
}

export function MemberCard({
  member,
  stats,
  currentUserRole,
  currentUserId,
  onUpdateRole,
  onRemoveMember,
}: MemberCardProps) {
  const displayName =
    member.club_display_name || member.users?.display_name || member.users?.email || "Unknown User";

  const _initials = displayName
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  const _avatarUrl = member.users?.avatar_url || null;

  const isCurrentUser = member.user_id === currentUserId;
  const canManageMembers = currentUserRole === "producer" || currentUserRole === "director";
  const canEdit =
    canManageMembers &&
    !isCurrentUser &&
    member.role !== "producer" &&
    (currentUserRole === "producer" ||
      (currentUserRole === "director" && member.role === "critic"));

  const joinDate = member.joined_at || new Date().toISOString();

  return (
    <Card className="overflow-hidden">
      <CardContent className="text-center">
        <ClickableUserAvatar
          entity={userToAvatarData(member.users)}
          userId={member.user_id}
          size="xxl"
          className="mx-auto mb-4"
        />
        <h3 className="font-semibold line-clamp-2" style={{ color: "var(--text-primary)" }}>
          {displayName}
        </h3>
        <div className="mt-1">
          <RoleBadge role={member.role as "producer" | "director" | "critic"} />
        </div>

        <div className="mt-4 space-y-1 text-sm" style={{ color: "var(--text-muted)" }}>
          {stats && (
            <>
              <div>{stats.points.toFixed(1)} points</div>
              <div>{stats.festivals} festivals</div>
            </>
          )}
          <div>
            Joined <DateDisplay date={joinDate} format="date" />
          </div>
        </div>

        <div className="flex gap-2 mt-4 justify-center">
          <Button size="sm" variant="ghost">
            <ChatCircle className="h-4 w-4" />
          </Button>
          <Button size="sm" variant="ghost">
            <User className="h-4 w-4" />
          </Button>
          {canEdit && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button size="sm" variant="ghost">
                  <DotsThreeVertical className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem>View Profile</DropdownMenuItem>
                <DropdownMenuItem>Send Message</DropdownMenuItem>
                {canEdit && (
                  <>
                    <DropdownMenuSeparator />
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
                    <DropdownMenuItem
                      className="text-destructive"
                      onClick={() => onRemoveMember?.(member.user_id)}
                    >
                      Remove from Club
                    </DropdownMenuItem>
                  </>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
