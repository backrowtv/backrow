"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { SettingsRow } from "@/components/ui/settings-section";
import { updateMemberPreference } from "@/app/actions/clubs/membership";
import toast from "react-hot-toast";
import { SlidersHorizontal } from "@phosphor-icons/react";

interface ClubDashboardPreferencesProps {
  clubId: string;
  initialShowClubCard: boolean;
  initialShowSpoilerWarnings: boolean;
}

export function ClubDashboardPreferences({
  clubId,
  initialShowClubCard,
  initialShowSpoilerWarnings,
}: ClubDashboardPreferencesProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [showClubCard, setShowClubCard] = useState(initialShowClubCard);
  const [showSpoilerWarnings, setShowSpoilerWarnings] = useState(initialShowSpoilerWarnings);

  const handleShowClubCardChange = (next: boolean) => {
    const previous = showClubCard;
    setShowClubCard(next);
    startTransition(async () => {
      const result = await updateMemberPreference(clubId, "hide_club_card", !next);
      if ("error" in result && result.error) {
        setShowClubCard(previous);
        toast.error(result.error);
      } else {
        toast.success(next ? "Club ID card shown" : "Club ID card hidden");
        // Drop the client router cache so the dashboard reflects the change on next visit.
        router.refresh();
      }
    });
  };

  const handleSpoilerWarningsChange = (next: boolean) => {
    const previous = showSpoilerWarnings;
    setShowSpoilerWarnings(next);
    startTransition(async () => {
      const result = await updateMemberPreference(clubId, "disable_spoiler_warnings", !next);
      if ("error" in result && result.error) {
        setShowSpoilerWarnings(previous);
        toast.error(result.error);
      } else {
        toast.success(next ? "Spoiler warnings on" : "Spoiler warnings off");
        router.refresh();
      }
    });
  };

  return (
    <Card variant="default" hover>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <SlidersHorizontal className="h-5 w-5" style={{ color: "var(--primary)" }} />
          Dashboard & Discussions
        </CardTitle>
      </CardHeader>
      <CardContent>
        <SettingsRow
          label="Show club ID card on dashboard"
          description="The card in the sidebar with the club avatar, description, and stats."
          htmlFor="showClubCard"
        >
          <Switch
            id="showClubCard"
            checked={showClubCard}
            onCheckedChange={handleShowClubCardChange}
            disabled={isPending}
          />
        </SettingsRow>

        <SettingsRow
          label="Show spoiler warnings in discussions"
          description="Turn off if everyone in this club has already seen the movies."
          htmlFor="showSpoilerWarnings"
        >
          <Switch
            id="showSpoilerWarnings"
            checked={showSpoilerWarnings}
            onCheckedChange={handleSpoilerWarningsChange}
            disabled={isPending}
          />
        </SettingsRow>
      </CardContent>
    </Card>
  );
}
