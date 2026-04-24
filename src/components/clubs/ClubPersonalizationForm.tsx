"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { updateClubMemberPersonalization } from "@/app/actions/clubs";
import toast from "react-hot-toast";

interface ClubPersonalizationFormProps {
  clubId: string;
  initialDisplayName: string;
  globalDisplayName: string;
}

export function ClubPersonalizationForm({
  clubId,
  initialDisplayName,
  globalDisplayName,
}: ClubPersonalizationFormProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [displayName, setDisplayName] = useState(initialDisplayName);

  const handleSave = () => {
    startTransition(async () => {
      const result = await updateClubMemberPersonalization(clubId, {
        clubDisplayName: displayName || null,
      });

      if ("error" in result && result.error) {
        toast.error(result.error);
      } else {
        toast.success("Personalization settings saved");
        // Drop client router cache so the new display name shows in the
        // dashboard sidebar, comments, and member lists on next navigation.
        router.refresh();
      }
    });
  };

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="clubDisplayName">Display Name in This Club</Label>
        <Input
          id="clubDisplayName"
          type="text"
          value={displayName}
          onChange={(e) => setDisplayName(e.target.value)}
          placeholder={globalDisplayName || "Your display name"}
          disabled={isPending}
          maxLength={50}
          helperText="Leave empty to use your global display name. This name will only appear in this club."
        />
      </div>

      {displayName !== initialDisplayName && (
        <div className="flex justify-end">
          <Button onClick={handleSave} disabled={isPending} variant="primary">
            {isPending ? "Saving..." : "Save"}
          </Button>
        </div>
      )}
    </div>
  );
}
