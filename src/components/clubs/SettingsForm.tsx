"use client";

import { updateClubSettings } from "@/app/actions/clubs";
import { useTransition, useState, useMemo, useRef } from "react";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import type { ClubSettings } from "@/types/club-settings";
import type { FestivalConstraints } from "./settings/types";
import { ThemesSection } from "./settings/ThemesSection";
import { NominationSection } from "./settings/NominationSection";
import { FestivalSection } from "./settings/FestivalSection";
import { GuessingSection } from "./settings/GuessingSection";
import { RubricSection } from "./settings/RubricSection";
import { PointsSection } from "./settings/PointsSection";
import { ResultsSection } from "./settings/ResultsSection";

interface SettingsFormProps {
  clubId: string;
  clubSlug?: string;
  section: "themes" | "nomination" | "festival" | "guessing" | "rubric" | "points" | "results";
  /** Club settings - use ClubSettings type for type safety */
  settings: Partial<ClubSettings>;
  themeSubmissionsLocked?: boolean;
  festivalType?: string;
}

export function SettingsForm({
  clubId,
  clubSlug,
  section,
  settings,
  themeSubmissionsLocked,
  festivalType,
}: SettingsFormProps) {
  const [isPending, startTransition] = useTransition();
  const router = useRouter();
  const [localSettings, setLocalSettings] = useState<Partial<ClubSettings>>(settings);
  const initialSettingsRef = useRef<Partial<ClubSettings>>(settings);

  // Simple constraint: is this an endless festival?
  const modeConstraints = useMemo<FestivalConstraints>(() => {
    return {
      isEndless: festivalType === "endless",
    };
  }, [festivalType]);

  async function handleSave(options?: { confirmEndlessSwitch?: boolean }) {
    startTransition(async () => {
      const result = await updateClubSettings(clubId, localSettings, options);
      if (result && "error" in result && result.error) {
        // Handle endless→standard confirmation flow
        if (result.error === "CONFIRM_ENDLESS_SWITCH") {
          const count = (result as { playingMovieCount?: number }).playingMovieCount ?? 0;
          const message =
            count > 0
              ? `You have ${count} movie${count === 1 ? "" : "s"} currently playing. Switching to standard will conclude them. Continue?`
              : "Switch to standard festival mode? Your endless festival will be concluded.";

          if (window.confirm(message)) {
            handleSave({ confirmEndlessSwitch: true });
          } else {
            setLocalSettings((prev) => ({ ...prev, festival_type: "endless" }));
          }
          return;
        }

        toast.error(result.error);
      } else {
        toast.success("Settings saved");
        initialSettingsRef.current = localSettings;
        router.refresh();
      }
    });
  }

  const updateSetting = <K extends keyof ClubSettings>(key: K, value: ClubSettings[K]) => {
    setLocalSettings({ ...localSettings, [key]: value });
  };

  // Looser typed version for child components that use string keys
  const updateSettingLoose = (key: string, value: unknown) => {
    setLocalSettings({ ...localSettings, [key]: value });
  };

  // Helper for checkbox state which can be boolean | "indeterminate"
  const updateBooleanSetting = (key: keyof ClubSettings, checked: boolean | "indeterminate") => {
    updateSetting(key, checked === true ? true : false);
  };

  const sharedProps = {
    clubId,
    clubSlug,
    localSettings,
    initialSettings: initialSettingsRef.current,
    isPending,
    handleSave,
    updateSetting,
    updateSettingLoose,
    updateBooleanSetting,
    modeConstraints,
    router,
    startTransition,
    festivalType,
  };

  switch (section) {
    case "themes":
      return <ThemesSection {...sharedProps} themeSubmissionsLocked={themeSubmissionsLocked} />;
    case "nomination":
      return <NominationSection {...sharedProps} />;
    case "festival":
      return <FestivalSection {...sharedProps} />;
    case "guessing":
      return <GuessingSection {...sharedProps} />;
    case "rubric":
      return <RubricSection {...sharedProps} />;
    case "points":
      return <PointsSection {...sharedProps} />;
    case "results":
      return <ResultsSection {...sharedProps} />;
    default:
      return null;
  }
}
