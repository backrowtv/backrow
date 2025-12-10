"use client";

/**
 * Points Section for Club Settings
 *
 * Handles scoring system configuration including:
 * - Default points (last place = 1, each place above = +1)
 * - Custom points (set points for each place individually)
 * - Formula points (linear or exponential)
 * - Season standings toggle
 */

import { WarningCircle } from "@phosphor-icons/react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Text } from "@/components/ui/typography";
import type { SettingsSectionProps } from "./types";

type PointsSectionProps = SettingsSectionProps;

export function PointsSection({
  localSettings,
  isPending,
  handleSave,
  updateSetting,
  updateBooleanSetting,
  modeConstraints: _modeConstraints,
  festivalType,
}: PointsSectionProps) {
  const festivalTypeValue = festivalType || (localSettings.festival_type as string) || "standard";
  const isEndless = festivalTypeValue === "endless";
  const scoringEnabled = (localSettings.scoring_enabled as boolean) ?? !isEndless;
  const isDisabled = isEndless || !scoringEnabled;

  const placementPoints = localSettings.placement_points as
    | {
        type?: string;
        points?: Array<{ place: number; points: number | null }>;
        formula?: string;
      }
    | Array<{ place: number; points: number | null }>
    | undefined;
  const pointsType = Array.isArray(placementPoints) ? "custom" : placementPoints?.type || "default";
  const customPoints = Array.isArray(placementPoints)
    ? placementPoints
    : placementPoints?.points || [];

  return (
    <div className="space-y-4">
      {/* Warning for endless festivals */}
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
                Points and scoring are not applicable for endless festivals. Switch to Standard
                festival type to enable these settings.
              </Text>
            </div>
          </div>
        </div>
      )}

      {/* Warning for scoring disabled */}
      {!isEndless && !scoringEnabled && (
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
                Scoring Disabled
              </Text>
              <Text size="sm" style={{ color: "#f59e0b" }}>
                Enable scoring in Festival settings to configure points.
              </Text>
            </div>
          </div>
        </div>
      )}

      {/* Settings shown but disabled when not available */}
      <div className={isDisabled ? "opacity-50 pointer-events-none select-none" : ""}>
        <div className="space-y-2">
          <Label htmlFor="placementPointsType">Scoring System</Label>
          <Select
            id="placementPointsType"
            value={pointsType}
            onChange={(e) => {
              const newType = e.target.value;
              if (newType === "default") {
                updateSetting("placement_points", { type: "default" });
              } else if (newType === "custom") {
                updateSetting("placement_points", {
                  type: "custom",
                  rules: [
                    { from: 1, to: 1, points: 10 },
                    { from: 2, to: 2, points: 7 },
                    { from: 3, to: 3, points: 5 },
                    { from: 4, to: 4, points: 3 },
                    { from: 5, to: 5, points: 1 },
                  ],
                });
              }
            }}
            helperText="Points are awarded based on final ranking position."
            disabled={isDisabled}
          >
            <option value="default">Linear (Last place = 1, each place above = +1)</option>
            <option value="custom">Custom (Set points for each place or range)</option>
          </Select>
        </div>

        {pointsType === "custom" && (
          <div
            className="space-y-4 p-4 rounded-lg border mt-4"
            style={{ backgroundColor: "var(--surface-1)", borderColor: "var(--border)" }}
          >
            <div className="flex items-center justify-between mb-2">
              <Text size="sm" className="font-medium">
                Custom Placement Points
              </Text>
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={isDisabled}
                onClick={() => {
                  const newPlace = customPoints.length + 1;
                  const newPoints = [
                    ...customPoints,
                    {
                      place: newPlace,
                      points:
                        customPoints.length > 0
                          ? (customPoints[customPoints.length - 1].points || 0) - 1
                          : 1,
                    },
                  ];
                  updateSetting("placement_points", { type: "custom", points: newPoints });
                }}
              >
                Add Place
              </Button>
            </div>
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {customPoints.length === 0 ? (
                <Text size="sm" muted>
                  No custom points configured. Add places to customize point distribution.
                </Text>
              ) : (
                customPoints.map((point, index) => (
                  <div key={index} className="flex items-center gap-3">
                    <div className="w-20">
                      <Text size="sm" className="font-medium">
                        Place {point.place}
                      </Text>
                    </div>
                    <div className="flex-1">
                      <Input
                        type="number"
                        min="0"
                        value={point.points ?? ""}
                        disabled={isDisabled}
                        onChange={(e) => {
                          const updated = [...customPoints];
                          updated[index] = {
                            ...point,
                            points: e.target.value ? parseInt(e.target.value) : null,
                          };
                          updateSetting("placement_points", { type: "custom", points: updated });
                        }}
                        placeholder="Auto (default)"
                      />
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      disabled={isDisabled}
                      onClick={() => {
                        const updated = customPoints
                          .filter((_, i) => i !== index)
                          .map((p, i) => ({ ...p, place: i + 1 }));
                        updateSetting("placement_points", { type: "custom", points: updated });
                      }}
                    >
                      Remove
                    </Button>
                  </div>
                ))
              )}
            </div>
            <Text size="sm" muted className="mt-2">
              Set points for each placement. Leave blank to use default Formula One calculation
              (total_participants - place + 1). Ties will split points (average of tied places).
            </Text>
          </div>
        )}

        <div className="flex items-center gap-2 mt-4">
          <Checkbox
            id="seasonStandings"
            checked={(localSettings.season_standings_enabled as boolean) ?? true}
            onCheckedChange={(checked) => updateBooleanSetting("season_standings_enabled", checked)}
            disabled={isDisabled || !scoringEnabled}
          />
          <Label
            htmlFor="seasonStandings"
            className={isDisabled || !scoringEnabled ? "opacity-50" : ""}
          >
            Enable Season Standings
          </Label>
        </div>
        <Text size="sm" muted>
          {isDisabled
            ? "Season standings require standard festivals with scoring enabled."
            : !scoringEnabled
              ? "Season standings require scoring to be enabled."
              : "When enabled, members are ranked by total points across all festivals in the season. Points are awarded based on final placement in each festival."}
        </Text>
      </div>

      <Button onClick={handleSave} disabled={isPending}>
        {isPending ? "Saving..." : "Save Settings"}
      </Button>
    </div>
  );
}
