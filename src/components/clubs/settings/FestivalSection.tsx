"use client";

/**
 * Festival Section Component for Club Settings
 *
 * Handles festival type selection (standard vs endless) and competitive features.
 */

import { Info, WarningCircle } from "@phosphor-icons/react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Text } from "@/components/ui/typography";
import { RecentlyWatchedRetentionSection } from "./TimingSections";
import type { SettingsSectionProps } from "./types";
import type { FestivalType } from "@/types/club-settings";

export function FestivalSection({
  localSettings,
  initialSettings: _initialSettings,
  isPending,
  handleSave,
  updateSetting,
  updateBooleanSetting,
  modeConstraints: _modeConstraints,
  updateSettingLoose,
}: SettingsSectionProps) {
  const festivalType = (localSettings.festival_type as FestivalType) || "standard";
  const isEndless = festivalType === "endless";
  const scoringEnabled = (localSettings.scoring_enabled as boolean) ?? !isEndless;
  const guessingEnabled = (localSettings.nomination_guessing_enabled as boolean) ?? !isEndless;

  // Endless festivals are incompatible with competitive features
  const endlessIncompatible = isEndless && (scoringEnabled || guessingEnabled);

  return (
    <div className="space-y-6">
      {/* Festival Type Selection */}
      <div className="space-y-4">
        <div className="space-y-1">
          <Label className="text-sm font-medium">Festival Type</Label>
          <Text size="sm" muted>
            Choose between standard festivals with phases or endless continuous festivals.
          </Text>
        </div>

        <RadioGroup
          value={festivalType}
          onValueChange={(value) => updateSetting("festival_type", value as FestivalType)}
          className="space-y-3"
        >
          <div
            role="button"
            tabIndex={0}
            className="flex items-start gap-3 p-4 rounded-lg border cursor-pointer transition-colors"
            style={{
              borderColor: festivalType === "standard" ? "var(--primary)" : "var(--border)",
              backgroundColor:
                festivalType === "standard" ? "var(--surface-2)" : "var(--surface-1)",
            }}
            onClick={() => updateSetting("festival_type", "standard")}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                updateSetting("festival_type", "standard");
              }
            }}
          >
            <RadioGroupItem value="standard" id="festival-standard" className="mt-0.5" />
            <div className="flex-1 space-y-1">
              <Label htmlFor="festival-standard" className="font-medium cursor-pointer">
                Standard Festival
              </Label>
              <Text size="sm" muted>
                Four-phase cycle: Theme Selection → Nomination → Watch & Rate → Awards/Results
              </Text>
            </div>
          </div>

          <div
            role="button"
            tabIndex={0}
            className="flex items-start gap-3 p-4 rounded-lg border cursor-pointer transition-colors"
            style={{
              borderColor: festivalType === "endless" ? "var(--primary)" : "var(--border)",
              backgroundColor: festivalType === "endless" ? "var(--surface-2)" : "var(--surface-1)",
            }}
            onClick={() => updateSetting("festival_type", "endless")}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                updateSetting("festival_type", "endless");
              }
            }}
          >
            <RadioGroupItem value="endless" id="festival-endless" className="mt-0.5" />
            <div className="flex-1 space-y-1">
              <Label htmlFor="festival-endless" className="font-medium cursor-pointer">
                Endless Festival
              </Label>
              <Text size="sm" muted>
                Continuous festival without phases. Theme is optional. Ratings are not tied to
                competitive stats.
              </Text>
            </div>
          </div>
        </RadioGroup>
      </div>

      {/* Endless Festival Info & Warnings */}
      {isEndless && (
        <div className="space-y-3">
          <div
            className="p-4 rounded-lg border"
            style={{ backgroundColor: "var(--surface-1)", borderColor: "var(--border)" }}
          >
            <div className="flex items-start gap-2">
              <Info className="h-5 w-5 flex-shrink-0 mt-0.5" style={{ color: "var(--primary)" }} />
              <div className="space-y-2">
                <Text size="sm" className="font-medium">
                  Endless Festival Mode
                </Text>
                <Text size="sm" muted>
                  Endless festivals run continuously without phases. Theme selection is optional.
                  Users can rate movies, but ratings are not tied to nominators or competitive
                  statistics. If themed, ratings can be tracked per theme for historical purposes.
                </Text>
              </div>
            </div>
          </div>

          {endlessIncompatible && (
            <div
              className="p-4 rounded-lg border"
              style={{
                backgroundColor: "rgba(251, 191, 36, 0.1)",
                borderColor: "rgba(251, 191, 36, 0.3)",
              }}
            >
              <div className="flex items-start gap-2">
                <WarningCircle
                  className="h-5 w-5 flex-shrink-0 mt-0.5"
                  style={{ color: "#f59e0b" }}
                />
                <div className="space-y-1">
                  <Text
                    size="sm"
                    className="font-medium"
                    style={{ color: "#f59e0b", fontWeight: 500 }}
                  >
                    Incompatible Settings Detected
                  </Text>
                  <Text size="sm" style={{ color: "#f59e0b", fontWeight: 500 }}>
                    Endless festivals are not compatible with:
                    {scoringEnabled && " • Competitive ratings/scoring"}
                    {guessingEnabled && " • Guessing features"}
                    <br />
                    Please disable these features or switch to Standard festival type.
                  </Text>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Recently Watched Retention - Only for Endless Festivals */}
      {isEndless && (
        <RecentlyWatchedRetentionSection
          localSettings={localSettings}
          updateSetting={updateSettingLoose}
        />
      )}

      {/* Competitive Features (disabled for endless) */}
      <div className="pt-4 border-t" style={{ borderColor: "var(--border)" }}>
        <div className="mb-4">
          <Label className="text-sm font-medium">Competitive Features</Label>
          <Text size="sm" muted>
            {isEndless
              ? "Competitive features are not available for endless festivals."
              : "Enable scoring, points, and competitive elements."}
          </Text>
        </div>
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <Checkbox
              id="scoringEnabled"
              checked={scoringEnabled}
              onCheckedChange={(checked) => updateBooleanSetting("scoring_enabled", checked)}
              disabled={isEndless}
            />
            <div className="flex-1">
              <Label htmlFor="scoringEnabled" className={isEndless ? "opacity-50" : ""}>
                Enable Scoring & Points
              </Label>
              <Text size="sm" muted>
                {isEndless
                  ? "Scoring is not available for endless festivals."
                  : "When enabled, members earn points for nominations, ratings, and guesses. Points determine festival winners and season standings."}
              </Text>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Checkbox
              id="festivalWinnerEnabled"
              checked={(localSettings.festival_winner_enabled as boolean) ?? !isEndless}
              onCheckedChange={(checked) =>
                updateBooleanSetting("festival_winner_enabled", checked)
              }
              disabled={isEndless}
            />
            <div className="flex-1">
              <Label htmlFor="festivalWinnerEnabled" className={isEndless ? "opacity-50" : ""}>
                Show Festival Winner
              </Label>
              <Text size="sm" muted>
                {isEndless
                  ? "Festival winners are not available for endless festivals."
                  : "When enabled, the winning movie is announced with ceremony/results page."}
              </Text>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Checkbox
              id="festivalRatingsEnabled"
              checked={(localSettings.club_ratings_enabled as boolean) ?? true}
              onCheckedChange={(checked) => updateBooleanSetting("club_ratings_enabled", checked)}
              disabled={isEndless}
            />
            <div className="flex-1">
              <Label htmlFor="festivalRatingsEnabled" className={isEndless ? "opacity-50" : ""}>
                Enable Festival Ratings
              </Label>
              <Text size="sm" muted>
                {isEndless
                  ? "Festival ratings are not available for endless festivals."
                  : "When enabled, members can rate movies in festivals for competitive scoring. Personal ratings are always available."}
              </Text>
            </div>
          </div>
        </div>
      </div>

      {/* Theme Note for Endless */}
      {isEndless && (
        <div
          className="p-4 rounded-lg border"
          style={{ backgroundColor: "var(--surface-1)", borderColor: "var(--border)" }}
        >
          <div className="flex items-start gap-2">
            <Info className="h-5 w-5 flex-shrink-0 mt-0.5" style={{ color: "var(--primary)" }} />
            <Text size="sm" muted>
              <strong>Theme Selection:</strong> Themes are optional for endless festivals. You can
              configure theme settings in the Themes section. If a theme is selected, ratings can be
              tracked per theme. If themeless, ratings become general ratings for that film.
            </Text>
          </div>
        </div>
      )}

      {/* Auto-Start & Gap Settings */}
      <div className="pt-4 border-t" style={{ borderColor: "var(--border)" }}>
        <div className="mb-4">
          <Label className="text-base font-medium">Festival Automation</Label>
          <Text size="sm" muted>
            Auto-start and gap settings between festivals.
          </Text>
        </div>
        <div className="space-y-4">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Checkbox
                id="autoStartNextFestival"
                checked={(localSettings.auto_start_next_festival as boolean) ?? false}
                onCheckedChange={(checked) =>
                  updateBooleanSetting("auto_start_next_festival", checked)
                }
              />
              <Label htmlFor="autoStartNextFestival">Auto-Start Next Festival</Label>
            </div>
            <Text size="sm" muted>
              When enabled, automatically create and start the next festival when the current one
              concludes.
            </Text>
          </div>
        </div>
      </div>

      <div className="pt-4 border-t" style={{ borderColor: "var(--border)" }}>
        <Button onClick={handleSave} disabled={isPending || endlessIncompatible}>
          {isPending ? "Saving..." : "Save Settings"}
        </Button>
      </div>
    </div>
  );
}
