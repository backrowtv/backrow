"use client";

import { SquaresFour, List } from "@phosphor-icons/react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export type ClubViewMode = "cards" | "table";

interface ClubViewToggleProps {
  view: ClubViewMode;
  onChange: (view: ClubViewMode) => void;
  className?: string;
}

const STORAGE_KEY = "clubViewMode";

export function ClubViewToggle({ view, onChange, className }: ClubViewToggleProps) {
  return (
    <div
      className={cn("flex items-center rounded-lg border border-[var(--border)] p-0.5", className)}
    >
      <Button
        variant="ghost"
        size="sm"
        onClick={() => onChange("cards")}
        className={cn(
          "h-7 w-7 p-0 rounded-md",
          view === "cards"
            ? "bg-[var(--surface-2)] text-[var(--text-primary)]"
            : "text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-transparent"
        )}
        aria-label="Card view"
        aria-pressed={view === "cards"}
      >
        <SquaresFour className="w-4 h-4" />
      </Button>
      <Button
        variant="ghost"
        size="sm"
        onClick={() => onChange("table")}
        className={cn(
          "h-7 w-7 p-0 rounded-md",
          view === "table"
            ? "bg-[var(--surface-2)] text-[var(--text-primary)]"
            : "text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-transparent"
        )}
        aria-label="Table view"
        aria-pressed={view === "table"}
      >
        <List className="w-4 h-4" />
      </Button>
    </div>
  );
}

// Utility functions for localStorage persistence
export function getStoredViewMode(): ClubViewMode {
  if (typeof window === "undefined") return "cards";
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    // Handle new values
    if (stored === "cards" || stored === "table") {
      return stored;
    }
    // Migrate old values: 'list' -> 'cards', 'grid' -> 'cards'
    if (stored === "list" || stored === "grid") {
      localStorage.setItem(STORAGE_KEY, "cards");
      return "cards";
    }
  } catch {
    // Ignore storage errors
  }
  return "cards";
}

export function setStoredViewMode(view: ClubViewMode): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(STORAGE_KEY, view);
  } catch {
    // Ignore storage errors
  }
}
