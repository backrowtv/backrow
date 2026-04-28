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
  initialShowClubCardDesktop: boolean;
  initialShowClubCardMobile: boolean;
  initialShowSpoilerWarnings: boolean;
}

export function ClubDashboardPreferences({
  clubId,
  initialShowClubCardDesktop,
  initialShowClubCardMobile,
  initialShowSpoilerWarnings,
}: ClubDashboardPreferencesProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [showClubCardDesktop, setShowClubCardDesktop] = useState(initialShowClubCardDesktop);
  const [showClubCardMobile, setShowClubCardMobile] = useState(initialShowClubCardMobile);
  const [showSpoilerWarnings, setShowSpoilerWarnings] = useState(initialShowSpoilerWarnings);

  const handleClubCardChange = (viewport: "desktop" | "mobile", next: boolean) => {
    const setter = viewport === "desktop" ? setShowClubCardDesktop : setShowClubCardMobile;
    const previous = viewport === "desktop" ? showClubCardDesktop : showClubCardMobile;
    const key = viewport === "desktop" ? "hide_club_card_desktop" : "hide_club_card_mobile";

    setter(next);
    startTransition(async () => {
      const result = await updateMemberPreference(clubId, key, !next);
      if ("error" in result && result.error) {
        setter(previous);
        toast.error(result.error);
        return;
      }
      toast.success(
        next ? `Club ID card shown on ${viewport}` : `Club ID card hidden on ${viewport}`
      );
      router.refresh();
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
          label="Show club ID card on desktop"
          description="The card in the desktop sidebar with the club avatar, description, and stats."
          htmlFor="showClubCardDesktop"
        >
          <Switch
            id="showClubCardDesktop"
            checked={showClubCardDesktop}
            onCheckedChange={(next) => handleClubCardChange("desktop", next)}
            disabled={isPending}
          />
        </SettingsRow>

        <SettingsRow
          label="Show club ID card on mobile"
          description="The card at the top of the dashboard when viewing on a phone."
          htmlFor="showClubCardMobile"
        >
          <Switch
            id="showClubCardMobile"
            checked={showClubCardMobile}
            onCheckedChange={(next) => handleClubCardChange("mobile", next)}
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
