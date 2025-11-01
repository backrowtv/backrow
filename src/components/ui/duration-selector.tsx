"use client";

import * as React from "react";
import { useId } from "react";
import { cn } from "@/lib/utils";
import type { DefaultPhaseDuration, DurationUnit } from "@/types/club-settings";

export interface DurationSelectorProps {
  value?: DefaultPhaseDuration;
  onChange: (value: DefaultPhaseDuration | undefined) => void;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
  label?: string;
}

const UNIT_OPTIONS: { value: DurationUnit; label: string }[] = [
  { value: "days", label: "days" },
  { value: "weeks", label: "weeks" },
  { value: "months", label: "months" },
];

export function DurationSelector({
  value,
  onChange,
  placeholder = "No default",
  disabled = false,
  className,
  label,
}: DurationSelectorProps) {
  const generatedId = useId();
  const inputId = `duration-${generatedId}`;

  const handleValueChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const numValue = parseInt(e.target.value, 10);

    if (isNaN(numValue) || numValue < 1) {
      // Clear the value if empty or invalid
      onChange(undefined);
      return;
    }

    onChange({
      value: numValue,
      unit: value?.unit || "weeks",
    });
  };

  const handleUnitChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const unit = e.target.value as DurationUnit;

    if (!value?.value) {
      // If no value yet, set a default of 1
      onChange({ value: 1, unit });
      return;
    }

    onChange({
      value: value.value,
      unit,
    });
  };

  const handleClear = () => {
    onChange(undefined);
  };

  const inputClasses = cn(
    "w-20 rounded-l-md border border-r-0",
    "bg-[var(--background)]",
    "border-[var(--border)]",
    "text-[var(--text-primary)]",
    "placeholder:text-[var(--text-muted)]",
    "px-3 py-2 text-base md:text-sm",
    "h-9",
    "focus-visible:ring-2 focus-visible:ring-[var(--ring)] focus-visible:border-transparent focus-visible:z-10",
    "hover:border-[var(--border-hover)]",
    "transition-colors duration-150",
    "disabled:cursor-not-allowed disabled:opacity-50 disabled:bg-[var(--surface-2)]"
  );

  const selectClasses = cn(
    "h-9 rounded-r-md border px-2 py-2 text-base md:text-sm",
    "appearance-none cursor-pointer",
    "bg-[var(--surface-1)] text-[var(--text-primary)]",
    "border-[var(--border)]",
    "hover:border-[var(--border-hover)]",
    "focus-visible:ring-2 focus-visible:ring-[var(--ring)] focus-visible:border-transparent focus-visible:z-10",
    "disabled:cursor-not-allowed disabled:opacity-50"
  );

  return (
    <div className={cn("inline-flex flex-col", className)}>
      {label && (
        <label
          htmlFor={inputId}
          className="block text-sm font-medium mb-1.5 text-[var(--text-primary)]"
        >
          {label}
        </label>
      )}
      <div className="flex items-center gap-1">
        <div className="flex">
          <input
            id={inputId}
            type="number"
            min={1}
            max={365}
            value={value?.value || ""}
            onChange={handleValueChange}
            placeholder={placeholder}
            disabled={disabled}
            className={inputClasses}
            aria-label={label || "Duration value"}
          />
          <select
            value={value?.unit || "weeks"}
            onChange={handleUnitChange}
            disabled={disabled}
            className={selectClasses}
            aria-label="Duration unit"
          >
            {UNIT_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>
        {value && (
          <button
            type="button"
            onClick={handleClear}
            disabled={disabled}
            className={cn(
              "p-1.5 rounded text-[var(--text-muted)] hover:text-[var(--text-primary)]",
              "hover:bg-[var(--surface-2)] transition-colors",
              "disabled:opacity-50 disabled:cursor-not-allowed"
            )}
            aria-label="Clear duration"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        )}
      </div>
    </div>
  );
}
