"use client";

/**
 * Nomination Settings Section
 *
 * Handles all nomination-related settings including:
 * - Nominations per user limit
 * - Non-admin nominations toggle
 * - Festival nomination cap
 * - Blind nominations
 * - Nomination phase timing
 */

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Text } from "@/components/ui/typography";
import { NominationTimingSection } from "./TimingSections";
import type { SettingsSectionProps } from "./types";
import type { FestivalType } from "@/types/club-settings";

export function NominationSection({
  localSettings,
  isPending,
  handleSave,
  updateSetting,
  updateBooleanSetting,
  updateSettingLoose,
  festivalType: propFestivalType,
}: SettingsSectionProps) {
  const maxNominationsPerUser =
    (localSettings.max_nominations_per_user as number) ??
    (localSettings.max_nominations as number) ??
    1;
  const maxNominationsPerFestival = localSettings.max_nominations_per_festival as
    | number
    | null
    | undefined;
  const festivalCapEnabled =
    maxNominationsPerFestival !== null && maxNominationsPerFestival !== undefined;
  const festivalType =
    (propFestivalType as FestivalType) ||
    (localSettings.festival_type as FestivalType) ||
    "standard";
  const blindNominationsEnabled = (localSettings.blind_nominations_enabled as boolean) ?? false;
  const allowNonAdminNominations = (localSettings.allow_non_admin_nominations as boolean) ?? true;

  return (
    <div className="space-y-6">
      {/* Per-User Limit */}
      <div className="space-y-2">
        <Label htmlFor="maxNominationsPerUser">Nominations Per User</Label>
        <Input
          id="maxNominationsPerUser"
          type="number"
          min="1"
          max="10"
          value={maxNominationsPerUser}
          onChange={(e) => updateSetting("max_nominations_per_user", parseInt(e.target.value) || 1)}
          helperText="How many movies each member can nominate per festival. Applies to both standard and endless festivals."
        />
      </div>

      {/* Non-Admin Nominations Toggle */}
      <div className="space-y-3 pt-2 border-t" style={{ borderColor: "var(--border)" }}>
        <div className="flex items-center justify-between">
          <div className="space-y-0.5">
            <Label htmlFor="allowNonAdminNominations" className="text-base font-medium">
              Allow Non-Admin Nominations
            </Label>
            <Text size="sm" muted>
              When disabled, only producers and directors can nominate. When enabled, all members
              can nominate.
            </Text>
          </div>
          <Checkbox
            id="allowNonAdminNominations"
            checked={allowNonAdminNominations}
            onCheckedChange={(checked) =>
              updateBooleanSetting("allow_non_admin_nominations", checked)
            }
          />
        </div>
      </div>

      {/* Per-Festival Cap */}
      <div className="pt-4 border-t" style={{ borderColor: "var(--border)" }}>
        <div className="flex items-center justify-between mb-4">
          <div className="space-y-0.5">
            <Label htmlFor="festivalCapEnabled" className="text-base font-medium">
              Enable Festival Nomination Cap
            </Label>
            <Text size="sm" muted>
              Limit the total number of nominations per festival. Useful for large clubs.
            </Text>
          </div>
          <Checkbox
            id="festivalCapEnabled"
            checked={festivalCapEnabled}
            onCheckedChange={(checked) => {
              if (checked) {
                updateSetting("max_nominations_per_festival", 5);
              } else {
                updateSetting("max_nominations_per_festival", null);
              }
            }}
          />
        </div>
        <div className="space-y-2">
          {festivalCapEnabled && (
            <div className="space-y-2 pl-6">
              <Label htmlFor="maxNominationsPerFestival">Max Nominations Per Festival</Label>
              <Input
                id="maxNominationsPerFestival"
                type="number"
                min="1"
                max="50"
                value={maxNominationsPerFestival || 5}
                onChange={(e) =>
                  updateSetting("max_nominations_per_festival", parseInt(e.target.value) || 1)
                }
                helperText={
                  festivalType === "endless"
                    ? "For endless festivals, this limits how many movies can be active at one time. Admin manually manages rotation when cap is reached."
                    : "Maximum number of movies that can be nominated in a single festival."
                }
              />
            </div>
          )}
        </div>
      </div>

      {/* Blind Nominations */}
      {festivalType === "standard" && (
        <div className="space-y-3 pt-2 border-t" style={{ borderColor: "var(--border)" }}>
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="blindNominationsEnabled" className="text-base font-medium">
                Blind Nominations
              </Label>
              <Text size="sm" muted>
                When enabled, members can see who has nominated but not what they nominated until
                the results phase.
              </Text>
            </div>
            <Checkbox
              id="blindNominationsEnabled"
              checked={blindNominationsEnabled}
              onCheckedChange={(checked) =>
                updateBooleanSetting("blind_nominations_enabled", checked)
              }
            />
          </div>
        </div>
      )}

      {/* Nomination Phase Timing */}
      <NominationTimingSection localSettings={localSettings} updateSetting={updateSettingLoose} />

      <div className="pt-4 border-t" style={{ borderColor: "var(--border)" }}>
        <Button onClick={handleSave} disabled={isPending}>
          {isPending ? "Saving..." : "Save Settings"}
        </Button>
      </div>
    </div>
  );
}
