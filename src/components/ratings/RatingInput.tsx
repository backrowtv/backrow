"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";

interface RatingInputProps {
  value?: number;
  onChange: (rating: number) => void;
  disabled?: boolean;
  step?: number;
}

export function RatingInput({
  value = 0,
  onChange,
  disabled = false,
  step = 0.1,
}: RatingInputProps) {
  const [localValue, setLocalValue] = useState(value?.toString() || "");

  const min = 0;
  const max = 10;

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const newValue = e.target.value;
    setLocalValue(newValue);

    const numValue = parseFloat(newValue);
    if (!isNaN(numValue) && numValue >= min && numValue <= max) {
      onChange(numValue);
    }
  }

  function handleBlur() {
    const numValue = parseFloat(localValue);
    if (isNaN(numValue) || numValue < min) {
      setLocalValue(min.toString());
      onChange(min);
    } else if (numValue > max) {
      setLocalValue(max.toString());
      onChange(max);
    } else {
      const rounded = Math.round(numValue * 10) / 10;
      setLocalValue(rounded.toString());
      onChange(rounded);
    }
  }

  return (
    <div className="space-y-[var(--spacing-2)]">
      {/* Numerical Display */}
      <div className="flex items-center gap-[var(--spacing-4)]">
        <input
          type="number"
          value={localValue}
          onChange={handleChange}
          onBlur={handleBlur}
          disabled={disabled}
          min={min}
          max={max}
          step={step}
          className={cn(
            "w-24 rounded-md border",
            "border-[var(--border)]",
            "bg-[var(--surface-1)]",
            "px-[var(--spacing-3)]",
            "py-[var(--spacing-2)]",
            "text-[var(--text-primary)]",
            "text-[var(--font-body-sm-size)]",
            "min-h-[44px]", // WCAG minimum
            "focus:border-[var(--focus-ring)]",
            "focus:outline-none",
            "focus:ring-2",
            "focus:ring-[var(--focus-ring)]",
            "disabled:opacity-50"
          )}
        />
        <span className="text-[var(--font-body-sm-size)] text-[var(--text-secondary)]">/ 10</span>
      </div>

      {/* Slider */}
      <input
        type="range"
        value={value || min}
        onChange={(e) => {
          const numValue = parseFloat(e.target.value);
          setLocalValue(numValue.toString());
          onChange(numValue);
        }}
        disabled={disabled}
        min={min}
        max={max}
        step={step}
        className="w-full touch-action-none"
        style={{
          accentColor: "var(--primary)",
        }}
      />

      <p className="text-[var(--font-caption-size)] text-[var(--text-muted)]">Rating: 0.0 - 10.0</p>
    </div>
  );
}
