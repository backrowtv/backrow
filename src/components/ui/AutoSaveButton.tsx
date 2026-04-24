"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import { Check, CircleNotch, FloppyDisk, Warning } from "@phosphor-icons/react";
import { formatDistanceToNow } from "date-fns";
import type { AutoSaveState } from "@/hooks/useAutoSaveForm";

export interface AutoSaveButtonProps {
  state: AutoSaveState;
  onClick: () => void;
  lastSavedAt?: Date | null;
  error?: string | null;
  className?: string;
  /**
   * Size — matches Button sizes but the auto-save button has its own look.
   * @default "md"
   */
  size?: "sm" | "md";
  /**
   * Label overrides per state, useful for copy variations ("Saved" → "Up to date").
   */
  labels?: Partial<Record<AutoSaveState, string>>;
}

const DEFAULT_LABELS: Record<AutoSaveState, string> = {
  idle: "Saved",
  dirty: "Save",
  saving: "Saving…",
  saved: "Saved",
  error: "Retry save",
};

export function AutoSaveButton({
  state,
  onClick,
  lastSavedAt,
  error,
  className,
  size = "md",
  labels,
}: AutoSaveButtonProps) {
  const label = labels?.[state] ?? DEFAULT_LABELS[state];

  const isDisabled = state === "saving" || state === "idle";

  // Refresh the relative "last saved" label periodically while mounted.
  const [, setTick] = React.useState(0);
  React.useEffect(() => {
    if (!lastSavedAt) return;
    const id = setInterval(() => setTick((t) => t + 1), 30_000);
    return () => clearInterval(id);
  }, [lastSavedAt]);

  const relativeSaved = lastSavedAt ? formatDistanceToNow(lastSavedAt, { addSuffix: true }) : null;

  const subtitle = (() => {
    if (state === "error") return error ?? "Save failed — tap to retry";
    if (state === "saving") return "Saving changes";
    if (state === "saved") return "All changes saved";
    if (state === "dirty") return "Unsaved changes";
    if (lastSavedAt) return `Last saved ${relativeSaved}`;
    return "No changes yet";
  })();

  const stateStyles: Record<AutoSaveState, string> = {
    idle: cn(
      "border-[var(--border)] bg-[var(--surface-1)] text-[var(--text-muted)]",
      "cursor-default"
    ),
    dirty: cn(
      "border-[var(--primary)]/60 bg-[var(--primary)]/10 text-[var(--primary)]",
      "hover:bg-[var(--primary)]/15 cursor-pointer"
    ),
    saving: cn(
      "border-[var(--border)] bg-[var(--surface-1)] text-[var(--text-muted)]",
      "cursor-wait"
    ),
    saved: cn(
      "border-[var(--success,var(--primary))]/60",
      "bg-[var(--success,var(--primary))]/10",
      "text-[var(--success,var(--primary))]",
      "animate-[autosave-pulse_600ms_ease-out]"
    ),
    error: cn(
      "border-[var(--destructive)]/70 bg-[var(--destructive)]/10",
      "text-[var(--destructive)] hover:bg-[var(--destructive)]/15",
      "cursor-pointer"
    ),
  };

  const icon = (() => {
    if (state === "saving") return <CircleNotch className="h-4 w-4 animate-spin" />;
    if (state === "saved") return <Check weight="bold" className="h-4 w-4" />;
    if (state === "error") return <Warning weight="bold" className="h-4 w-4" />;
    if (state === "dirty") return <FloppyDisk weight="fill" className="h-4 w-4" />;
    return <Check className="h-4 w-4 opacity-50" />;
  })();

  const sizeStyles = size === "sm" ? "h-8 px-3 text-xs" : "h-9 px-4 text-sm";

  return (
    <div className={cn("flex flex-col items-start gap-1", className)}>
      <button
        type="button"
        onClick={onClick}
        disabled={isDisabled}
        aria-live="polite"
        aria-busy={state === "saving"}
        className={cn(
          "inline-flex items-center justify-center gap-2 rounded-md border font-medium",
          "transition-colors duration-150",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)] focus-visible:ring-offset-2",
          "disabled:pointer-events-none",
          sizeStyles,
          stateStyles[state]
        )}
      >
        {icon}
        <span>{label}</span>
      </button>
      <p className="text-[11px] leading-none text-[var(--text-muted)] select-none">{subtitle}</p>
    </div>
  );
}
