"use client";

/**
 * Guessing Section Component for Settings Form
 *
 * Handles configuration for nomination guessing features.
 * Requires blind nominations to be enabled and standard festival type.
 */

import { Info } from "@phosphor-icons/react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Text } from "@/components/ui/typography";
import type { SettingsSectionProps } from "./types";
import type { FestivalType } from "@/types/club-settings";

export function GuessingSection({
  localSettings,
  isPending,
  handleSave,
  updateSetting,
  updateBooleanSetting,
  festivalType,
}: SettingsSectionProps) {
  const blindNominationsEnabled = (localSettings.blind_nominations_enabled as boolean) ?? false;
  const guessingEnabled = (localSettings.nomination_guessing_enabled as boolean) ?? false;
  const festivalTypeValue =
    festivalType || (localSettings.festival_type as FestivalType) || "standard";
  const canEnableGuessing = blindNominationsEnabled && festivalTypeValue === "standard";

  return (
    <div className="space-y-4">
      {!canEnableGuessing && (
        <div
          className="p-4 rounded-lg border"
          style={{ backgroundColor: "var(--surface-1)", borderColor: "var(--border)" }}
        >
          <div className="flex items-start gap-2">
            <Info className="h-5 w-5 flex-shrink-0 mt-0.5" style={{ color: "var(--primary)" }} />
            <div className="space-y-1">
              <Text size="sm" className="font-medium">
                Requirements
              </Text>
              <Text size="sm" muted>
                {!blindNominationsEnabled && festivalTypeValue !== "standard"
                  ? "Guessing requires: Blind Nominations enabled (in Nomination settings) and Standard festival type (not Endless)."
                  : !blindNominationsEnabled
                    ? "Guessing requires Blind Nominations to be enabled. Enable it in the Nomination settings section above."
                    : "Guessing is only available for Standard festivals, not Endless festivals. Change festival type in Festival Style settings."}
              </Text>
            </div>
          </div>
        </div>
      )}
      <div className="flex items-center gap-2">
        <Checkbox
          id="guessingEnabled"
          checked={guessingEnabled}
          onCheckedChange={(checked) =>
            updateBooleanSetting("nomination_guessing_enabled", checked)
          }
          disabled={!canEnableGuessing}
        />
        <Label htmlFor="guessingEnabled" className={!canEnableGuessing ? "opacity-50" : ""}>
          Enable Nominator Guessing
        </Label>
      </div>
      <Text size="sm" muted className={!canEnableGuessing ? "opacity-50" : ""}>
        {canEnableGuessing
          ? "When enabled, members can guess which other user nominated each movie during blind nominations. No points are awarded - this is just for fun and engagement."
          : "Enable the requirements above to use guessing features."}
      </Text>

      {guessingEnabled && canEnableGuessing && (
        <div className="space-y-2">
          <Label htmlFor="guessingDeadline">
            Guessing Deadline (days after nomination phase ends)
          </Label>
          <Input
            id="guessingDeadline"
            type="number"
            min="0"
            max="14"
            value={(localSettings.guessing_deadline_days as number) ?? 7}
            onChange={(e) => updateSetting("guessing_deadline_days", parseInt(e.target.value) || 0)}
            helperText="How many days after nominations close that members can submit guesses. Set to 0 to allow guessing until results are revealed."
          />
        </div>
      )}

      <Button onClick={handleSave} disabled={isPending}>
        {isPending ? "Saving..." : "Save Settings"}
      </Button>
    </div>
  );
}
