"use client";

import { useState } from "react";
import { Card } from "@/components/ui/card";
import { UsersThree } from "@phosphor-icons/react";
import { DateDisplay } from "@/components/ui/date-display";
import { UserPopupModal } from "@/components/profile/UserPopupModal";
import { EntityAvatar } from "@/components/ui/entity-avatar";
import { userToAvatarData } from "@/lib/avatar-helpers";

interface HomeActivityItemProps {
  activity: {
    id: string;
    action: string;
    details: { target_name?: string } | null;
    created_at: string;
    user?: {
      id?: string;
      display_name?: string;
      avatar_url?: string | null;
      social_links?: {
        avatar_icon?: string;
        avatar_color_index?: number;
        [key: string]: unknown;
      } | null;
    } | null;
    club?: {
      name?: string;
    } | null;
  };
  currentUserId?: string;
}

export function HomeActivityItem({ activity, currentUserId }: HomeActivityItemProps) {
  const [popupOpen, setPopupOpen] = useState(false);
  const userId = activity.user?.id;

  return (
    <>
      <Card className="p-4 flex gap-4 items-start">
        <button
          type="button"
          onClick={() => {
            if (userId) setPopupOpen(true);
          }}
          className="flex-shrink-0 cursor-pointer rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--primary)]"
          aria-label={`View ${(Array.isArray(activity.user) ? activity.user[0] : activity.user)?.display_name || "user"}'s profile`}
        >
          <EntityAvatar
            entity={userToAvatarData(
              Array.isArray(activity.user) ? activity.user[0] : activity.user
            )}
            emojiSet="user"
            size="md"
          />
        </button>
        <div className="flex-1">
          <div className="flex items-baseline justify-between">
            <p className="text-sm">
              <span
                role="button"
                tabIndex={0}
                className="font-bold cursor-pointer"
                onClick={() => {
                  if (userId) {
                    setPopupOpen(true);
                  }
                }}
                onKeyDown={(e) => {
                  if ((e.key === "Enter" || e.key === " ") && userId) {
                    e.preventDefault();
                    setPopupOpen(true);
                  }
                }}
              >
                {(() => {
                  // Handle user relation - can be array or object - show "You" for current user
                  const userRelation = Array.isArray(activity.user)
                    ? activity.user[0]
                    : activity.user;
                  if (currentUserId && userRelation?.id === currentUserId) {
                    return "You";
                  }
                  return userRelation?.display_name || "Unknown User";
                })()}
              </span>{" "}
              {activity.action}{" "}
              <span className="font-bold">{activity.details?.target_name || "something"}</span>
            </p>
            <span className="text-xs text-[var(--text-muted)] whitespace-nowrap ml-2 flex-shrink-0">
              <DateDisplay date={activity.created_at} />
            </span>
          </div>
          {(() => {
            // Handle club relation - can be array or object
            const clubRelation = Array.isArray(activity.club) ? activity.club[0] : activity.club;
            return (
              clubRelation && (
                <div className="mt-2 text-xs text-[var(--text-muted)] flex items-center gap-1 bg-[var(--muted)] w-fit px-2 py-0.5 rounded-full">
                  <UsersThree className="w-3 h-3" />
                  {clubRelation.name}
                </div>
              )
            );
          })()}
        </div>
      </Card>

      {/* User Popup Modal */}
      {userId && <UserPopupModal userId={userId} open={popupOpen} onOpenChange={setPopupOpen} />}
    </>
  );
}
