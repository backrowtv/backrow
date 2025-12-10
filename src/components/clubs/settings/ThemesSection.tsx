"use client";

import { useState } from "react";
import toast from "react-hot-toast";

import { updateClub } from "@/app/actions/clubs";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Text } from "@/components/ui/typography";
import type { ThemeGovernance } from "@/types/club-settings";
import { Crown, Info, Shuffle, Users } from "@phosphor-icons/react";

import type { ThemesSectionProps } from "./types";

export function ThemesSection({
  clubId,
  clubSlug,
  localSettings,
  initialSettings,
  isPending,
  handleSave,
  updateSetting,
  updateBooleanSetting,
  router,
  startTransition,
  themeSubmissionsLocked,
}: ThemesSectionProps) {
  const [localThemeSubmissionsLocked, setLocalThemeSubmissionsLocked] = useState(
    themeSubmissionsLocked ?? false
  );

  const themesEnabled = (localSettings.themes_enabled as boolean) ?? true;
  const themeGovernance = (localSettings.theme_governance as ThemeGovernance) || "democracy";
  const themeVotingEnabled = (localSettings.theme_voting_enabled as boolean) ?? true;
  const maxThemesPerUser = (localSettings.max_themes_per_user as number) ?? 5;

  const getVotingHelperText = () => {
    if (!themesEnabled) return "";
    if (themeGovernance === "democracy") {
      return themeVotingEnabled
        ? "Members can upvote/downvote themes in the Theme Pool. Top-voted theme is automatically selected when a festival starts."
        : "Voting disabled. Enable voting to use democracy mode (top-voted theme auto-selected).";
    }
    if (themeGovernance === "random") {
      return themeVotingEnabled
        ? "Members can upvote/downvote themes in the Theme Pool for engagement. Theme is randomly selected from the pool when a festival starts."
        : "Theme is randomly selected from the pool when a festival starts.";
    }
    if (themeGovernance === "autocracy") {
      return themeVotingEnabled
        ? "Members can upvote/downvote themes in the Theme Pool. Votes are visible, but admin has final decision on theme selection."
        : "Admin manually selects theme from pool or enters a new theme when festival starts.";
    }
    return "";
  };

  return (
    <div className="space-y-6">
      {/* Master Toggle */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="space-y-0.5">
            <Label htmlFor="themesEnabled" className="text-base font-medium">
              Enable Themes
            </Label>
            <Text size="sm" muted>
              When disabled, all festivals start with an "Open" theme (any movie can be submitted).
            </Text>
          </div>
          <Checkbox
            id="themesEnabled"
            checked={themesEnabled}
            onCheckedChange={(checked) => updateBooleanSetting("themes_enabled", checked)}
          />
        </div>
      </div>

      {!themesEnabled && (
        <div
          className="p-4 rounded-lg border"
          style={{ backgroundColor: "var(--surface-1)", borderColor: "var(--border)" }}
        >
          <div className="flex items-start gap-2">
            <Info className="h-5 w-5 flex-shrink-0 mt-0.5" style={{ color: "var(--primary)" }} />
            <Text size="sm" muted>
              All festivals will start with an "Open" theme, allowing any type of movie to be
              submitted.
            </Text>
          </div>
        </div>
      )}

      {themesEnabled && (
        <>
          {/* Theme Pool Subsection */}
          <div className="pt-4 border-t" style={{ borderColor: "var(--border)" }}>
            <div className="mb-4">
              <Label className="text-sm font-medium">Theme Pool</Label>
              <Text size="sm" muted>
                Manage theme submissions and limits.
              </Text>
            </div>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="maxThemesPerUser">Max Themes Per User</Label>
                <Input
                  id="maxThemesPerUser"
                  type="number"
                  min="1"
                  max="20"
                  value={maxThemesPerUser}
                  onChange={(e) =>
                    updateSetting("max_themes_per_user", parseInt(e.target.value) || 1)
                  }
                  helperText="Maximum number of themes each user can have in the pool at one time."
                />
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label htmlFor="themeSubmissionsLocked" className="text-sm font-medium">
                      Lock Theme Submissions
                    </Label>
                    <Text size="sm" muted>
                      Prevents members from adding new themes to the pool.
                    </Text>
                  </div>
                  <Checkbox
                    id="themeSubmissionsLocked"
                    checked={localThemeSubmissionsLocked}
                    onCheckedChange={async (checked) => {
                      setLocalThemeSubmissionsLocked(checked === true);
                      startTransition(async () => {
                        const formData = new FormData();
                        formData.append("clubId", clubId);
                        formData.append("themeSubmissionsLocked", checked === true ? "on" : "off");
                        const result = await updateClub(null, formData);
                        if (result && "error" in result && result.error) {
                          toast.error(result.error);
                          setLocalThemeSubmissionsLocked(!checked); // Revert on error
                        } else {
                          toast.success("Theme submission setting updated");
                          router.refresh();
                        }
                      });
                    }}
                  />
                </div>
              </div>

              <div>
                <Button
                  variant="outline"
                  onClick={() => router.push(`/club/${clubSlug || clubId}`)}
                  type="button"
                >
                  Manage Theme Pool
                </Button>
                <Text size="sm" muted className="mt-2">
                  Navigate to the club page to add, edit, or remove themes from the pool.
                </Text>
              </div>
            </div>
          </div>

          {/* Governance Subsection */}
          <div className="pt-4 border-t" style={{ borderColor: "var(--border)" }}>
            <div className="mb-4">
              <Label className="text-sm font-medium">Theme Selection Governance</Label>
              <Text size="sm" muted>
                Choose how themes are selected when a festival starts.
              </Text>
            </div>
            <div className="space-y-4">
              <RadioGroup
                value={themeGovernance}
                onValueChange={(value) =>
                  updateSetting("theme_governance", value as ThemeGovernance)
                }
                className="space-y-3"
              >
                <div
                  className="flex items-start gap-3 p-4 rounded-lg border cursor-pointer transition-colors"
                  style={{
                    borderColor:
                      themeGovernance === "democracy" ? "var(--primary)" : "var(--border)",
                    backgroundColor:
                      themeGovernance === "democracy" ? "var(--surface-2)" : "var(--surface-1)",
                  }}
                  onClick={() => updateSetting("theme_governance", "democracy")}
                >
                  <RadioGroupItem value="democracy" id="governance-democracy" className="mt-0.5" />
                  <div className="flex-1 space-y-1">
                    <div className="flex items-center gap-2">
                      <Users className="h-4 w-4" style={{ color: "var(--text-secondary)" }} />
                      <Label htmlFor="governance-democracy" className="font-medium cursor-pointer">
                        Democracy
                      </Label>
                    </div>
                    <Text size="sm" muted>
                      Top-voted theme is automatically selected when a festival starts. Requires
                      voting to be enabled.
                    </Text>
                  </div>
                </div>

                <div
                  className="flex items-start gap-3 p-4 rounded-lg border cursor-pointer transition-colors"
                  style={{
                    borderColor: themeGovernance === "random" ? "var(--primary)" : "var(--border)",
                    backgroundColor:
                      themeGovernance === "random" ? "var(--surface-2)" : "var(--surface-1)",
                  }}
                  onClick={() => updateSetting("theme_governance", "random")}
                >
                  <RadioGroupItem value="random" id="governance-random" className="mt-0.5" />
                  <div className="flex-1 space-y-1">
                    <div className="flex items-center gap-2">
                      <Shuffle className="h-4 w-4" style={{ color: "var(--text-secondary)" }} />
                      <Label htmlFor="governance-random" className="font-medium cursor-pointer">
                        Random
                      </Label>
                    </div>
                    <Text size="sm" muted>
                      Theme is randomly selected from the pool when a festival starts. Voting can
                      still be enabled for engagement.
                    </Text>
                  </div>
                </div>

                <div
                  className="flex items-start gap-3 p-4 rounded-lg border cursor-pointer transition-colors"
                  style={{
                    borderColor:
                      themeGovernance === "autocracy" ? "var(--primary)" : "var(--border)",
                    backgroundColor:
                      themeGovernance === "autocracy" ? "var(--surface-2)" : "var(--surface-1)",
                  }}
                  onClick={() => updateSetting("theme_governance", "autocracy")}
                >
                  <RadioGroupItem value="autocracy" id="governance-autocracy" className="mt-0.5" />
                  <div className="flex-1 space-y-1">
                    <div className="flex items-center gap-2">
                      <Crown className="h-4 w-4" style={{ color: "var(--text-secondary)" }} />
                      <Label htmlFor="governance-autocracy" className="font-medium cursor-pointer">
                        Autocracy
                      </Label>
                    </div>
                    <Text size="sm" muted>
                      Admin manually selects theme from pool or enters a new theme when festival
                      starts. Can also select "Themeless" for an Open festival.
                    </Text>
                  </div>
                </div>
              </RadioGroup>
            </div>
          </div>

          {/* Voting Subsection */}
          <div className="pt-4 border-t" style={{ borderColor: "var(--border)" }}>
            <div className="flex items-center justify-between mb-4">
              <div className="space-y-0.5">
                <Label htmlFor="themeVotingEnabled" className="text-base font-medium">
                  Theme Pool Voting
                </Label>
                <Text size="sm" muted>
                  {getVotingHelperText()}
                </Text>
              </div>
              <Checkbox
                id="themeVotingEnabled"
                checked={themeVotingEnabled}
                onCheckedChange={(checked) => updateBooleanSetting("theme_voting_enabled", checked)}
              />
            </div>
            <div className="space-y-4">
              <div
                className="p-4 rounded-lg border"
                style={{ backgroundColor: "var(--surface-1)", borderColor: "var(--border)" }}
              >
                <div className="flex items-start gap-2">
                  <Info
                    className="h-5 w-5 flex-shrink-0 mt-0.5"
                    style={{ color: "var(--primary)" }}
                  />
                  <Text size="sm" muted>
                    Members can upvote and downvote themes directly in the Theme Pool. Votes help
                    identify popular themes and, in Democracy mode, determine which theme is
                    automatically selected when a festival starts.
                  </Text>
                </div>
              </div>
            </div>
          </div>
        </>
      )}

      {JSON.stringify(localSettings) !== JSON.stringify(initialSettings) && (
        <div className="pt-4 border-t" style={{ borderColor: "var(--border)" }}>
          <Button onClick={handleSave} disabled={isPending}>
            {isPending ? "Saving..." : "Save Settings"}
          </Button>
        </div>
      )}
    </div>
  );
}
