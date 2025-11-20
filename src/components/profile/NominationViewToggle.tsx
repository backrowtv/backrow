"use client";

import { FilmStrip, List } from "@phosphor-icons/react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export type NominationViewMode = "carousel" | "list";

interface NominationViewToggleProps {
  view: NominationViewMode;
  onChange: (view: NominationViewMode) => void;
  className?: string;
}

const STORAGE_KEY = "nominationsViewMode";

export function NominationViewToggle({ view, onChange, className }: NominationViewToggleProps) {
  return (
    <div
      className={cn("flex items-center rounded-lg border border-[var(--border)] p-0.5", className)}
    >
      <Button
        variant="ghost"
        size="sm"
        onClick={() => onChange("carousel")}
        className={cn(
          "h-7 w-7 p-0 rounded-md",
          view === "carousel"
            ? "bg-[var(--surface-2)] text-[var(--text-primary)]"
            : "text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-transparent"
        )}
        aria-label="Carousel view"
        aria-pressed={view === "carousel"}
      >
        <FilmStrip className="w-4 h-4" />
      </Button>
      <Button
        variant="ghost"
        size="sm"
        onClick={() => onChange("list")}
        className={cn(
          "h-7 w-7 p-0 rounded-md",
          view === "list"
            ? "bg-[var(--surface-2)] text-[var(--text-primary)]"
            : "text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-transparent"
        )}
        aria-label="List view"
        aria-pressed={view === "list"}
      >
        <List className="w-4 h-4" />
      </Button>
    </div>
  );
}

export function getStoredNominationViewMode(): NominationViewMode {
  if (typeof window === "undefined") return "carousel";
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored === "carousel" || stored === "list") {
      return stored;
    }
  } catch {
    // Ignore storage errors
  }
  return "carousel";
}

export function setStoredNominationViewMode(view: NominationViewMode): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(STORAGE_KEY, view);
  } catch {
    // Ignore storage errors
  }
}
