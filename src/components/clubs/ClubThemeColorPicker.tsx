"use client";

import { Check } from "@phosphor-icons/react";

// Re-export shared utilities for backwards compatibility with existing imports
export {
  CLUB_THEME_COLORS,
  type ClubThemeColorId,
  getClubThemeColor,
  getClubThemeCSS,
  getClubThemeColorForGlow,
} from "@/lib/clubs/theme-colors";

import { CLUB_THEME_COLORS } from "@/lib/clubs/theme-colors";

interface ClubThemeColorPickerProps {
  value?: string | null;
  onChange: (colorId: string | null) => void;
  disabled?: boolean;
  label?: string;
}

export function ClubThemeColorPicker({
  value,
  onChange,
  disabled = false,
  label = "Theme Color",
}: ClubThemeColorPickerProps) {
  const selectedColor = CLUB_THEME_COLORS.find((c) => c.id === value) || CLUB_THEME_COLORS[0];

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <label className="text-sm font-medium" style={{ color: "var(--text-primary)" }}>
          {label}
        </label>
        <span className="text-xs" style={{ color: "var(--text-muted)" }}>
          {selectedColor.name}
        </span>
      </div>
      <div className="flex flex-wrap gap-1.5">
        {CLUB_THEME_COLORS.map((themeColor) => (
          <button
            key={themeColor.id}
            type="button"
            onClick={() => onChange(themeColor.id === "none" ? null : themeColor.id)}
            disabled={disabled}
            className={`
              relative w-8 h-8 rounded-md border-2 transition-all
              ${disabled ? "opacity-50 cursor-not-allowed" : "hover:scale-105 cursor-pointer"}
              ${
                value === themeColor.id || (themeColor.id === "none" && !value)
                  ? "ring-2 ring-offset-1 ring-offset-[var(--surface-0)]"
                  : ""
              }
            `}
            style={{
              backgroundColor: themeColor.color || "var(--surface-2)",
              borderColor: themeColor.color || "var(--border)",
            }}
            aria-label={`Select ${themeColor.name} theme`}
            title={themeColor.name}
          >
            {(value === themeColor.id || (themeColor.id === "none" && !value)) && (
              <div className="absolute inset-0 flex items-center justify-center">
                <Check
                  className="w-3.5 h-3.5"
                  weight="bold"
                  style={{ color: themeColor.color ? "white" : "var(--text-primary)" }}
                />
              </div>
            )}
            {themeColor.id === "none" && !(value === themeColor.id || !value) && (
              <div className="absolute inset-0 flex items-center justify-center">
                <div
                  className="w-full h-0.5 rotate-45 absolute"
                  style={{ backgroundColor: "var(--border)" }}
                />
              </div>
            )}
          </button>
        ))}
      </div>
    </div>
  );
}
