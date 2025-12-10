"use client";

/**
 * Rubric Settings Section
 *
 * Handles club rating rubric configuration including:
 * - Rubric enforcement levels (off/suggested/required)
 * - Preset rubric templates
 * - Custom rubric editor
 * - Slider icon style selection
 * - Watch/Rate phase timing
 * - Extended reviews toggle
 */

import { Sparkle, CaretRight } from "@phosphor-icons/react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Text } from "@/components/ui/typography";
import { RubricEditor } from "@/components/ratings/RubricEditor";
import { SliderIconSelector } from "@/components/ratings/SliderIconSelector";
import { WatchRateTimingSection } from "./TimingSections";
import {
  PRESET_RUBRICS,
  createRubricsFromPreset,
  type RatingRubric,
  type RubricSliderIcon,
  type RubricEnforcement,
} from "@/types/club-settings";
import type { SettingsSectionProps } from "./types";

export function RubricSection({
  localSettings,
  initialSettings: _initialSettings,
  isPending,
  handleSave,
  updateSetting,
  updateBooleanSetting,
  modeConstraints: _modeConstraints,
  updateSettingLoose,
}: SettingsSectionProps) {
  const ratingRubrics = (localSettings.rating_rubrics as RatingRubric[]) ?? [];
  const rubricSliderIcon =
    (localSettings.rating_rubric_slider_icon as RubricSliderIcon) ?? "default";

  return (
    <div className="space-y-6">
      {/* Club Rating Rubric */}
      <div>
        <div className="mb-4">
          <Label className="text-base font-medium">Club Rating Rubric</Label>
          <Text size="sm" muted>
            Configure a rubric for your club. Members can use this or their own personal rubrics.
          </Text>
        </div>

        {/* Rubric Enforcement Level */}
        <div className="mb-4 space-y-2">
          <Label>Rubric Policy</Label>
          <RadioGroup
            value={(localSettings.rubric_enforcement as RubricEnforcement) || "off"}
            onValueChange={(value) =>
              updateSetting("rubric_enforcement", value as RubricEnforcement)
            }
          >
            <div className="flex items-start gap-2">
              <RadioGroupItem value="off" id="rubric-off" className="mt-0.5" />
              <div>
                <Label htmlFor="rubric-off" className="cursor-pointer">
                  Off
                </Label>
                <Text size="tiny" muted>
                  Club doesn&apos;t use rubrics. Members can still use personal rubrics if they
                  want.
                </Text>
              </div>
            </div>
            <div className="flex items-start gap-2">
              <RadioGroupItem value="suggested" id="rubric-suggested" className="mt-0.5" />
              <div>
                <Label htmlFor="rubric-suggested" className="cursor-pointer">
                  Suggested
                </Label>
                <Text size="tiny" muted>
                  Club has a rubric, but members can use their own personal rubrics instead.
                </Text>
              </div>
            </div>
            <div className="flex items-start gap-2">
              <RadioGroupItem value="required" id="rubric-required" className="mt-0.5" />
              <div>
                <Label htmlFor="rubric-required" className="cursor-pointer">
                  Required
                </Label>
                <Text size="tiny" muted>
                  All members must use the club&apos;s rubric. Personal rubrics cannot be used.
                </Text>
              </div>
            </div>
          </RadioGroup>
        </div>

        {/* Only show rubric editor if enforcement is suggested or required */}
        {((localSettings.rubric_enforcement as RubricEnforcement) === "suggested" ||
          (localSettings.rubric_enforcement as RubricEnforcement) === "required") && (
          <>
            {/* Preset Template Selector - Show when no rubrics yet */}
            {(!ratingRubrics || (ratingRubrics as RatingRubric[]).length === 0) && (
              <div
                className="mb-4 p-4 rounded-lg"
                style={{
                  backgroundColor: "var(--surface-1)",
                  border: "1px solid var(--border)",
                }}
              >
                <div className="flex items-center gap-2 mb-3">
                  <Sparkle className="h-5 w-5" style={{ color: "var(--primary)" }} />
                  <Text className="font-medium">Start with a Template</Text>
                </div>
                <Text size="sm" muted className="mb-3">
                  Choose a preset to get started quickly, or build from scratch below.
                </Text>
                <div className="grid gap-2">
                  {PRESET_RUBRICS.map((preset) => (
                    <button
                      key={preset.id}
                      type="button"
                      onClick={() => {
                        const newRubrics = createRubricsFromPreset(preset);
                        updateSetting("rating_rubrics", newRubrics);
                        updateSetting("rating_rubric_name", preset.name);
                      }}
                      className="flex items-center justify-between p-3 rounded-lg border text-left transition-colors hover:bg-[var(--surface-2)] hover:border-[var(--primary)]"
                      style={{
                        borderColor: "var(--border)",
                        backgroundColor: "var(--background)",
                      }}
                    >
                      <div className="flex-1 min-w-0">
                        <Text size="sm" className="font-medium">
                          {preset.name}
                        </Text>
                        <Text size="tiny" muted className="mt-0.5">
                          {preset.description}
                        </Text>
                        <div className="flex flex-wrap gap-1 mt-1.5">
                          {preset.rubrics.map((r, i) => (
                            <span
                              key={i}
                              className="text-xs px-1.5 py-0.5 rounded"
                              style={{
                                backgroundColor: "var(--surface-2)",
                                color: "var(--text-muted)",
                              }}
                            >
                              {r.name} ({r.weight}%)
                            </span>
                          ))}
                        </div>
                      </div>
                      <CaretRight
                        className="h-4 w-4 flex-shrink-0 ml-2"
                        style={{ color: "var(--text-muted)" }}
                      />
                    </button>
                  ))}
                </div>
              </div>
            )}

            <RubricEditor
              rubrics={ratingRubrics as RatingRubric[]}
              rubricName={(localSettings.rating_rubric_name as string) || ""}
              onChange={(updatedRubrics) => {
                updateSetting("rating_rubrics", updatedRubrics);
              }}
              onNameChange={(name) => updateSetting("rating_rubric_name", name)}
            />

            {/* Slider Icon Style - Only show when rubrics are configured */}
            {ratingRubrics.length > 0 && (
              <div className="pt-4 mt-4 border-t" style={{ borderColor: "var(--border)" }}>
                <SliderIconSelector
                  value={rubricSliderIcon}
                  onChange={(icon) => updateSetting("rating_rubric_slider_icon", icon)}
                />
              </div>
            )}
          </>
        )}
      </div>

      {/* Watch/Rate Phase Timing */}
      <WatchRateTimingSection localSettings={localSettings} updateSetting={updateSettingLoose} />

      <div
        className="flex items-center gap-2 pt-4 border-t"
        style={{ borderColor: "var(--border)" }}
      >
        <Checkbox
          id="showRatingsBeforeResults"
          checked={(localSettings.show_ratings_before_results as boolean) ?? false}
          onCheckedChange={(checked) =>
            updateBooleanSetting("show_ratings_before_results", checked)
          }
        />
        <Label htmlFor="showRatingsBeforeResults">Show ratings before results are revealed</Label>
      </div>
      <Text size="sm" muted>
        When enabled, members can see all ratings before the festival winner is announced. When
        disabled, ratings are hidden until results are revealed.
      </Text>

      <div className="flex items-center gap-2">
        <Checkbox
          id="extendedReviews"
          checked={(localSettings.extended_reviews as boolean) ?? false}
          onCheckedChange={(checked) => updateBooleanSetting("extended_reviews", checked)}
        />
        <Label htmlFor="extendedReviews">Extended Review Format (1000+ characters)</Label>
      </div>
      <Text size="sm" muted>
        Enable long-form reviews for detailed film criticism and analysis.
      </Text>

      <div className="pt-4 border-t" style={{ borderColor: "var(--border)" }}>
        <Button onClick={handleSave} disabled={isPending}>
          {isPending ? "Saving..." : "Save Settings"}
        </Button>
      </div>
    </div>
  );
}
