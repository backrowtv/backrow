"use client";

import { useMemo } from "react";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Text } from "@/components/ui/typography";
import { cn } from "@/lib/utils";
import { VisualRatingIcon } from "@/components/ratings/VisualRatingIcon";
import type { RatingVisualIcon, RubricSliderIcon } from "@/types/club-settings";
import { Circle } from "@phosphor-icons/react";
import { NUMERIC_INCREMENT_OPTIONS } from "@/types/user-rating-preferences";

export interface RatingScaleSettings {
  rating_increment: number;
  rating_slider_icon?: RubricSliderIcon;
}

const SLIDER_ICON_OPTIONS: { value: RubricSliderIcon; label: string }[] = [
  { value: "stars", label: "Stars" },
  { value: "popcorn", label: "Popcorn" },
  { value: "ticket", label: "Tickets" },
  { value: "film", label: "Film" },
  { value: "clapperboard", label: "Clapperboard" },
];

interface RatingScaleCustomizerProps {
  settings: RatingScaleSettings;
  onChange: (settings: RatingScaleSettings) => void;
  disabled?: boolean;
  showHeader?: boolean;
  showPreview?: boolean;
  compact?: boolean;
}

export function RatingScaleCustomizer({
  settings,
  onChange,
  disabled = false,
  showHeader = true,
  showPreview = true,
  compact = false,
}: RatingScaleCustomizerProps) {
  const sliderIcon = settings.rating_slider_icon ?? "default";

  const previewValue = useMemo(() => {
    // Show a 7.X value to demonstrate the step
    if (settings.rating_increment >= 1) return 7;
    if (settings.rating_increment === 0.5) return 7.5;
    return 7.3;
  }, [settings.rating_increment]);

  const previewPercent = useMemo(() => {
    return (previewValue / 10) * 100;
  }, [previewValue]);

  const updateSetting = <K extends keyof RatingScaleSettings>(
    key: K,
    value: RatingScaleSettings[K]
  ) => {
    onChange({ ...settings, [key]: value });
  };

  // Mini non-interactive slider for preview
  const MiniSlider = ({ className: cls }: { className?: string }) => (
    <div className={cn("relative w-full", cls)}>
      <div className="h-1.5 rounded-full bg-[var(--border)] overflow-hidden">
        <div
          className="h-full rounded-full"
          style={{ width: `${previewPercent}%`, backgroundColor: "var(--primary)" }}
        />
      </div>
      <div
        className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 pointer-events-none"
        style={{ left: `${previewPercent}%` }}
      >
        {sliderIcon === "default" ? (
          <div
            className="w-3.5 h-3.5 rounded-full border-2 shadow-sm"
            style={{ backgroundColor: "var(--primary)", borderColor: "var(--background)" }}
          />
        ) : (
          <VisualRatingIcon icon={sliderIcon as RatingVisualIcon} filled className="h-4 w-4" />
        )}
      </div>
    </div>
  );

  return (
    <div
      className={cn("rounded-lg border", compact ? "p-3 space-y-3" : "p-4 space-y-4")}
      style={{ backgroundColor: "var(--surface-1)", borderColor: "var(--border)" }}
    >
      {/* Header — desktop only */}
      {showHeader && (
        <div className="hidden sm:flex items-center gap-2">
          <Text size="sm" className="font-medium">
            Rating Scale
          </Text>
        </div>
      )}

      {/* Controls + Preview */}
      <div className={cn("grid grid-cols-1 gap-4", showPreview && "md:grid-cols-[1fr_auto]")}>
        {/* Left: Controls */}
        <div className="space-y-3">
          {/* Slider Icon row */}
          <div className="flex items-center gap-2 sm:gap-3 sm:min-h-[2.75rem]">
            <Label
              className="text-xs leading-tight w-10 shrink-0 text-center"
              style={{ color: "var(--text-muted)" }}
            >
              Slider Icon
            </Label>
            <div className="flex items-center gap-1">
              {SLIDER_ICON_OPTIONS.map((opt) => {
                const isSelected = sliderIcon === opt.value;
                return (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => updateSetting("rating_slider_icon", opt.value)}
                    disabled={disabled}
                    title={opt.label}
                    className={cn(
                      "p-1.5 rounded transition-all",
                      isSelected
                        ? "bg-[var(--surface-3)] ring-1 ring-[var(--primary)] shadow-sm"
                        : "hover:bg-[var(--hover)]"
                    )}
                  >
                    <VisualRatingIcon
                      icon={opt.value as RatingVisualIcon}
                      filled
                      className="h-5 w-5"
                    />
                  </button>
                );
              })}
              {/* Circle (default) */}
              <button
                type="button"
                onClick={() => updateSetting("rating_slider_icon", "default")}
                disabled={disabled}
                title="Default (Circle)"
                className={cn(
                  "p-1.5 rounded transition-all",
                  sliderIcon === "default"
                    ? "bg-[var(--surface-3)] ring-1 ring-[var(--primary)] shadow-sm"
                    : "hover:bg-[var(--hover)]"
                )}
              >
                <Circle
                  weight="fill"
                  className="h-5 w-5"
                  style={{
                    color: sliderIcon === "default" ? "var(--primary)" : "var(--text-muted)",
                  }}
                />
              </button>
            </div>

            {/* Step — desktop inline */}
            <div className="hidden sm:flex items-center gap-2">
              <Label className="text-xs whitespace-nowrap" style={{ color: "var(--text-muted)" }}>
                Step
              </Label>
              <Select
                value={settings.rating_increment.toString()}
                onChange={(e) => updateSetting("rating_increment", parseFloat(e.target.value))}
                disabled={disabled}
                className="w-20 h-8 text-sm"
              >
                {NUMERIC_INCREMENT_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </Select>
            </div>
          </div>

          {/* Step — mobile only */}
          <div className="flex sm:hidden items-center gap-2 min-h-[2.75rem]">
            <Label className="text-xs whitespace-nowrap" style={{ color: "var(--text-muted)" }}>
              Step
            </Label>
            <div className="w-20">
              <Select
                value={settings.rating_increment.toString()}
                onChange={(e) => updateSetting("rating_increment", parseFloat(e.target.value))}
                disabled={disabled}
                className="h-9 text-sm !min-h-0 px-3"
              >
                {NUMERIC_INCREMENT_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </Select>
            </div>
          </div>

          {/* Preview — mobile only */}
          {showPreview && (
            <div
              className="flex items-center gap-2 pt-2 min-h-[2.75rem] border-t md:hidden"
              style={{ borderColor: "var(--border)" }}
            >
              <Text size="tiny" muted>
                Preview:
              </Text>
              <div className="flex items-center gap-3 flex-1">
                <div className="flex items-baseline gap-0.5 shrink-0">
                  <span className="text-lg font-semibold" style={{ color: "var(--primary)" }}>
                    {previewValue.toFixed(1)}
                  </span>
                  <span className="text-xs" style={{ color: "var(--text-muted)" }}>
                    /10
                  </span>
                </div>
                <MiniSlider className="max-w-[8rem]" />
              </div>
            </div>
          )}
        </div>

        {/* Right: Preview — desktop only */}
        {showPreview && (
          <div
            className="hidden md:flex flex-col items-center justify-center w-[9rem] px-4 min-h-[4.5rem] border-l"
            style={{ borderColor: "var(--border)" }}
          >
            <Text size="tiny" muted className="mb-1.5">
              Preview
            </Text>
            <div className="flex flex-col items-center gap-1.5 w-full">
              <div className="flex items-baseline gap-0.5">
                <span className="text-2xl font-semibold" style={{ color: "var(--primary)" }}>
                  {previewValue.toFixed(1)}
                </span>
                <span className="text-sm" style={{ color: "var(--text-muted)" }}>
                  /10
                </span>
              </div>
              <MiniSlider />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export const DEFAULT_RATING_SCALE_SETTINGS: RatingScaleSettings = {
  rating_increment: 0.5,
  rating_slider_icon: "default",
};
