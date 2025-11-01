"use client";

import { Minus, Plus } from "@phosphor-icons/react";
import { cn } from "@/lib/utils";

interface NumberStepperProps {
  id?: string;
  value: number;
  onChange: (value: number) => void;
  min?: number;
  max?: number;
  step?: number;
  disabled?: boolean;
  className?: string;
  format?: (value: number) => string;
}

export function NumberStepper({
  id,
  value,
  onChange,
  min = 1,
  max = 100,
  step = 1,
  disabled = false,
  className,
  format,
}: NumberStepperProps) {
  const handleDecrement = () => {
    if (value > min) {
      onChange(Math.max(min, value - step));
    }
  };

  const handleIncrement = () => {
    if (value < max) {
      onChange(Math.min(max, value + step));
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = parseInt(e.target.value, 10);
    if (!isNaN(newValue)) {
      onChange(Math.min(max, Math.max(min, newValue)));
    }
  };

  return (
    <div className={cn("inline-flex items-center", className)}>
      <button
        type="button"
        onClick={handleDecrement}
        disabled={disabled || value <= min}
        className={cn(
          "flex items-center justify-center w-8 h-8 rounded-l-md border border-r-0",
          "bg-[var(--surface-1)] border-[var(--border)]",
          "hover:bg-[var(--surface-2)] transition-colors",
          "disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-[var(--surface-1)]"
        )}
        aria-label="Decrease"
      >
        <Minus className="w-3.5 h-3.5 text-[var(--text-muted)]" />
      </button>
      <input
        id={id}
        type={format ? "text" : "number"}
        value={format ? format(value) : value}
        onChange={handleInputChange}
        disabled={disabled}
        min={format ? undefined : min}
        max={format ? undefined : max}
        className={cn(
          "h-8 text-center text-sm font-medium",
          format ? "w-[4.5rem]" : "w-12",
          "bg-[var(--background)] border-y border-[var(--border)]",
          "text-[var(--text-primary)]",
          "focus:outline-none focus:ring-1 focus:ring-[var(--primary)] focus:border-[var(--primary)]",
          "disabled:opacity-50 disabled:cursor-not-allowed",
          "[appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
        )}
      />
      <button
        type="button"
        onClick={handleIncrement}
        disabled={disabled || value >= max}
        className={cn(
          "flex items-center justify-center w-8 h-8 rounded-r-md border border-l-0",
          "bg-[var(--surface-1)] border-[var(--border)]",
          "hover:bg-[var(--surface-2)] transition-colors",
          "disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-[var(--surface-1)]"
        )}
        aria-label="Increase"
      >
        <Plus className="w-3.5 h-3.5 text-[var(--text-muted)]" />
      </button>
    </div>
  );
}
