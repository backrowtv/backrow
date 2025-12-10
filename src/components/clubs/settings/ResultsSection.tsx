"use client";

import { WarningCircle } from "@phosphor-icons/react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Text } from "@/components/ui/typography";
import type { SettingsSectionProps } from "./types";

export function ResultsSection({
  localSettings,
  initialSettings,
  isPending,
  handleSave,
  updateSetting,
  updateSettingLoose,
  updateBooleanSetting,
  modeConstraints: _modeConstraints,
  festivalType,
}: SettingsSectionProps) {
  const festivalTypeValue = festivalType || (localSettings.festival_type as string) || "standard";
  const isEndless = festivalTypeValue === "endless";
  const resultsRevealType =
    (localSettings.results_reveal_type as "automatic" | "manual") || "manual";
  const resultsRevealDirection =
    (localSettings.results_reveal_direction as "forward" | "backward") || "forward";
  const resultsRevealDelay = (localSettings.results_reveal_delay_seconds as number) ?? 5;

  return (
    <div className="space-y-4">
      {isEndless && (
        <div
          className="p-4 rounded-lg border"
          style={{
            backgroundColor: "rgba(251, 191, 36, 0.1)",
            borderColor: "rgba(251, 191, 36, 0.3)",
          }}
        >
          <div className="flex items-start gap-2">
            <WarningCircle className="h-5 w-5 flex-shrink-0 mt-0.5" style={{ color: "#f59e0b" }} />
            <div className="space-y-1">
              <Text size="sm" className="font-medium" style={{ color: "#f59e0b" }}>
                Not Available for Endless Festivals
              </Text>
              <Text size="sm" style={{ color: "#f59e0b" }}>
                Results settings are not applicable for endless festivals. Switch to Standard
                festival type to enable these settings.
              </Text>
            </div>
          </div>
        </div>
      )}

      {/* Settings shown but disabled when endless */}
      <div className={isEndless ? "opacity-50 pointer-events-none select-none" : ""}>
        <div className="space-y-2">
          <Label htmlFor="resultsRevealType">Results Reveal Type</Label>
          <Select
            id="resultsRevealType"
            value={resultsRevealType}
            onChange={(e) =>
              updateSetting("results_reveal_type", e.target.value as "automatic" | "manual")
            }
            helperText="Choose how results are revealed: manual (click-based) or automatic (time-based)"
            disabled={isEndless}
          >
            <option value="manual">Manual (click to reveal)</option>
            <option value="automatic">Automatic (timed)</option>
          </Select>
        </div>

        {/* Show delay field when automatic is selected OR for endless (to show what's possible) */}
        {(resultsRevealType === "automatic" || isEndless) && (
          <div className="space-y-2 mt-4">
            <Label htmlFor="resultsRevealDelay">Delay Between Reveals (seconds)</Label>
            <Input
              id="resultsRevealDelay"
              type="number"
              min="1"
              max="60"
              value={resultsRevealDelay}
              onChange={(e) =>
                updateSetting("results_reveal_delay_seconds", parseInt(e.target.value) || 5)
              }
              helperText="Time delay between revealing each position in automatic mode. Default: 5 seconds."
              disabled={isEndless}
            />
          </div>
        )}

        <div className="space-y-2 mt-4">
          <Label htmlFor="resultsRevealDirection">Reveal Direction</Label>
          <Select
            id="resultsRevealDirection"
            value={resultsRevealDirection}
            onChange={(e) =>
              updateSetting("results_reveal_direction", e.target.value as "forward" | "backward")
            }
            helperText="Choose the order in which results are revealed"
            disabled={isEndless}
          >
            <option value="forward">Forward (last place → winner)</option>
            <option value="backward">Backward (winner → last place)</option>
          </Select>
        </div>

        <div className="space-y-2 mt-4">
          <Label htmlFor="resultsDisplayMode">Display Mode</Label>
          <Select
            id="resultsDisplayMode"
            value={(localSettings.results_display_mode as string) || "all-at-once"}
            onChange={(e) => updateSettingLoose("results_display_mode", e.target.value)}
            helperText="Choose how results are displayed overall"
            disabled={isEndless}
          >
            <option value="all-at-once">All at Once</option>
            <option value="one-by-one">One by One</option>
          </Select>
        </div>

        {/* Spotlight reveal animation */}
        <div className="flex items-center gap-2 mt-4">
          <Checkbox
            id="spotlightAnimation"
            checked={(localSettings.spotlight_animation_enabled as boolean) ?? true}
            onCheckedChange={(checked) =>
              updateBooleanSetting("spotlight_animation_enabled", checked)
            }
            disabled={isEndless}
          />
          <Label htmlFor="spotlightAnimation">Enable Spotlight Reveal Animation</Label>
        </div>

        <div className="flex items-center gap-2 mt-4">
          <Checkbox
            id="showDetailedStats"
            checked={(localSettings.show_detailed_stats as boolean) ?? true}
            onCheckedChange={(checked) => updateBooleanSetting("show_detailed_stats", checked)}
            disabled={isEndless}
          />
          <Label htmlFor="showDetailedStats">Show Detailed Statistics</Label>
        </div>
        <Text size="sm" muted>
          Shows detailed statistics like average ratings, vote distributions, and member rankings on
          results page.
        </Text>
      </div>

      {JSON.stringify(localSettings) !== JSON.stringify(initialSettings) && (
        <Button onClick={handleSave} disabled={isPending}>
          {isPending ? "Saving..." : "Save Settings"}
        </Button>
      )}
    </div>
  );
}
