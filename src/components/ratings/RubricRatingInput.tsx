"use client";

import { useState, useCallback, useMemo } from "react";
import { Text } from "@/components/ui/typography";
import { cn } from "@/lib/utils";
import type { RatingRubric } from "@/types/club-settings";
import { calculateWeightedScore, RUBRIC_SCALE } from "@/types/club-settings";

interface RubricRatingInputProps {
  rubrics: RatingRubric[];
  rubricName?: string;
  onRatingChange: (rating: number, rubricRatings: Record<string, number>) => void;
  initialRatings?: Record<string, number>;
  disabled?: boolean;
  // Compact mode for inline usage
  compact?: boolean;
}

export function RubricRatingInput({
  rubrics,
  rubricName,
  onRatingChange,
  initialRatings = {},
  disabled = false,
  compact = false,
}: RubricRatingInputProps) {
  const scale = useMemo(() => ({ min: RUBRIC_SCALE.MIN, max: RUBRIC_SCALE.MAX }), []);

  const [rubricRatings, setRubricRatings] = useState<Record<string, number>>(() => {
    const initial: Record<string, number> = {};
    rubrics.forEach((rubric) => {
      initial[rubric.id] = initialRatings[rubric.id] ?? RUBRIC_SCALE.MIN;
    });
    return initial;
  });

  // Calculate the weighted final score
  const finalRating = useMemo(() => {
    return calculateWeightedScore(rubricRatings, rubrics, scale);
  }, [rubricRatings, rubrics, scale]);

  // Update a single category rating
  const handleCategoryRatingChange = useCallback(
    (categoryId: string, value: number) => {
      const snappedValue = Math.round(value);
      const clampedValue = Math.max(RUBRIC_SCALE.MIN, Math.min(RUBRIC_SCALE.MAX, snappedValue));

      setRubricRatings((prev) => {
        const updated = { ...prev, [categoryId]: clampedValue };
        const newFinalRating = calculateWeightedScore(updated, rubrics, scale);
        onRatingChange(newFinalRating, updated);
        return updated;
      });
    },
    [rubrics, scale, onRatingChange]
  );

  if (rubrics.length === 0) {
    return null;
  }

  return (
    <div
      className={cn("rounded-xl border-2 overflow-hidden", compact ? "border" : "border-2")}
      style={{
        borderColor: "var(--border)",
        backgroundColor: "var(--surface-1)",
      }}
    >
      {/* Rubric Name Header */}
      {rubricName && (
        <div
          className="px-4 py-2.5 border-b"
          style={{
            borderColor: "var(--border)",
            backgroundColor: "var(--background)",
          }}
        >
          <Text
            className={cn("font-medium", compact ? "text-sm" : "text-base")}
            style={{ color: "var(--primary)" }}
          >
            {rubricName}
          </Text>
        </div>
      )}

      {/* Categories Container */}
      <div className={cn("p-4", compact ? "space-y-3" : "space-y-4")}>
        {/* Category Sliders */}
        {rubrics.map((rubric) => (
          <CategorySlider
            key={rubric.id}
            category={rubric}
            value={rubricRatings[rubric.id] ?? RUBRIC_SCALE.MIN}
            disabled={disabled}
            onChange={(value) => handleCategoryRatingChange(rubric.id, value)}
            compact={compact}
          />
        ))}

        {/* Final Rating Box */}
        <div
          className={cn(
            "flex flex-col items-center justify-center border-2 rounded-lg",
            compact ? "py-2 mt-3" : "py-3 mt-4"
          )}
          style={{
            borderColor: "var(--border)",
            backgroundColor: "var(--background)",
          }}
        >
          <Text size="sm" muted className="uppercase tracking-wider text-xs font-medium mb-1">
            Final Rating
          </Text>
          <Text
            className={cn("font-bold tabular-nums font-mono", compact ? "text-xl" : "text-2xl")}
            style={{ color: "var(--text-primary)" }}
          >
            {finalRating.toFixed(1)}
          </Text>
        </div>
      </div>
    </div>
  );
}

// Category Slider Component - matches wireframe layout
// Layout: weight% (left) | category name (center above slider) | slider | score (right)
interface CategorySliderProps {
  category: RatingRubric;
  value: number;
  disabled: boolean;
  onChange: (value: number) => void;
  compact?: boolean;
}

function CategorySlider({
  category,
  value,
  disabled,
  onChange,
  compact = false,
}: CategorySliderProps) {
  const percentage = (value / RUBRIC_SCALE.MAX) * 100;

  return (
    <div className={cn("space-y-1", compact ? "space-y-0.5" : "space-y-1")}>
      {/* Category Name (centered) */}
      <Text size="sm" className="text-center font-medium" style={{ color: "var(--text-primary)" }}>
        {category.name || "Unnamed Category"}
      </Text>

      {/* Slider Row: weight% | slider | score */}
      <div className="flex items-center gap-3">
        {/* Weight Percentage - Left */}
        <span
          className={cn(
            "font-mono text-right flex-shrink-0",
            compact ? "text-xs w-8" : "text-sm w-10"
          )}
          style={{ color: "var(--text-muted)" }}
        >
          {category.weight}%
        </span>

        {/* Slider - Center (flex-1) */}
        <div className="relative flex-1">
          {/* Tick marks background (0-10 = 11 ticks) */}
          <div
            className="absolute inset-0 flex justify-between items-center pointer-events-none"
            style={{ top: "50%", transform: "translateY(-50%)" }}
          >
            {Array.from({ length: RUBRIC_SCALE.MAX + 1 }, (_, i) => {
              const isActive = i <= value;
              return (
                <div
                  key={i}
                  className={cn("rounded-full", compact ? "w-px h-1" : "w-0.5 h-1.5")}
                  style={{
                    backgroundColor: isActive ? "var(--primary)" : "var(--surface-3)",
                    opacity: isActive ? 0.7 : 0.4,
                  }}
                />
              );
            })}
          </div>

          {/* Slider input */}
          <input
            type="range"
            min={RUBRIC_SCALE.MIN}
            max={RUBRIC_SCALE.MAX}
            step={RUBRIC_SCALE.STEP}
            value={value}
            onChange={(e) => onChange(parseFloat(e.target.value))}
            disabled={disabled}
            className={cn(
              "w-full rounded-full appearance-none cursor-pointer relative z-10 touch-pan-y",
              compact ? "h-2" : "h-3",
              "bg-transparent",
              // Webkit (Chrome, Safari) thumb
              "[&::-webkit-slider-thumb]:appearance-none",
              compact
                ? "[&::-webkit-slider-thumb]:h-5 [&::-webkit-slider-thumb]:w-5"
                : "[&::-webkit-slider-thumb]:h-6 [&::-webkit-slider-thumb]:w-6",
              "[&::-webkit-slider-thumb]:rounded-full",
              "[&::-webkit-slider-thumb]:bg-[var(--primary)]",
              "[&::-webkit-slider-thumb]:border-2",
              "[&::-webkit-slider-thumb]:border-[var(--background)]",
              "[&::-webkit-slider-thumb]:shadow-md",
              "[&::-webkit-slider-thumb]:cursor-pointer",
              "[&::-webkit-slider-thumb]:transition-transform",
              "[&::-webkit-slider-thumb]:hover:scale-110",
              // Firefox thumb
              compact
                ? "[&::-moz-range-thumb]:h-5 [&::-moz-range-thumb]:w-5"
                : "[&::-moz-range-thumb]:h-6 [&::-moz-range-thumb]:w-6",
              "[&::-moz-range-thumb]:rounded-full",
              "[&::-moz-range-thumb]:bg-[var(--primary)]",
              "[&::-moz-range-thumb]:border-2",
              "[&::-moz-range-thumb]:border-[var(--background)]",
              "[&::-moz-range-thumb]:cursor-pointer",
              // Disabled state
              "disabled:cursor-not-allowed disabled:opacity-50"
            )}
            style={{
              background: `linear-gradient(to right, var(--primary) 0%, var(--primary) ${percentage}%, var(--surface-2) ${percentage}%, var(--surface-2) 100%)`,
            }}
          />
        </div>

        {/* Score Value - Right */}
        <span
          className={cn(
            "font-mono tabular-nums text-right flex-shrink-0",
            compact ? "text-xs w-8" : "text-sm w-10"
          )}
          style={{ color: "var(--text-primary)" }}
        >
          {value}
        </span>
      </div>
    </div>
  );
}

export default RubricRatingInput;
