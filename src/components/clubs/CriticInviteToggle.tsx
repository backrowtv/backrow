"use client";

import { useState, useTransition } from "react";
import { Switch } from "@/components/ui/switch";
import { Text } from "@/components/ui/typography";
import { updateClubSettings } from "@/app/actions/clubs";
import toast from "react-hot-toast";

interface CriticInviteToggleProps {
  clubId: string;
  initialValue: boolean;
}

export function CriticInviteToggle({ clubId, initialValue }: CriticInviteToggleProps) {
  const [enabled, setEnabled] = useState(initialValue);
  const [isPending, startTransition] = useTransition();

  function handleToggle(checked: boolean) {
    setEnabled(checked);
    startTransition(async () => {
      const result = await updateClubSettings(clubId, {
        allow_critics_to_invite: checked,
      });
      if (result && "error" in result && result.error) {
        toast.error(result.error);
        setEnabled(!checked); // revert
      } else {
        toast.success(
          checked ? "Critics can now invite members" : "Only admins can invite members"
        );
      }
    });
  }

  return (
    <div className="flex items-center justify-between gap-4 p-4 rounded-lg border border-[var(--border)] bg-[var(--surface-1)]">
      <div className="space-y-0.5">
        <Text size="sm" className="font-medium">
          Allow Critics to Invite
        </Text>
        <Text size="tiny" muted>
          When enabled, all members (including critics) can invite new people to the club
        </Text>
      </div>
      <Switch checked={enabled} onCheckedChange={handleToggle} disabled={isPending} />
    </div>
  );
}
