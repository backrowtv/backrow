"use client";

import { useTheme } from "@/components/ui/theme-toggle";
import { THEME_PRESETS, isThemeDarkOnly } from "@/lib/themes/presets";
import { cn } from "@/lib/utils";
import { Check, Moon } from "@phosphor-icons/react";
import { Skeleton } from "@/components/ui/skeleton";

export function ThemeSelector() {
  const { theme, colorTheme, setColorTheme, mounted } = useTheme();

  if (!mounted) {
    return (
      <div className="grid grid-cols-5 gap-2">
        {THEME_PRESETS.map((preset) => (
          <Skeleton key={preset.id} className="h-12 rounded-lg" />
        ))}
      </div>
    );
  }

  const activeDarkOnly = isThemeDarkOnly(colorTheme);

  return (
    <div>
      <div className="grid grid-cols-5 gap-2">
        {THEME_PRESETS.map((preset) => {
          const isActive = colorTheme === preset.id;
          const isDarkOnly = !preset.variants.includes("light");
          const colors =
            theme === "light" && preset.previewColors.light
              ? preset.previewColors.light
              : preset.previewColors.dark;
          // colors: [background, surface, primary, accent, text]

          return (
            <button
              key={preset.id}
              type="button"
              onClick={() => setColorTheme(preset.id)}
              className={cn(
                "relative flex flex-col items-center gap-0.5 p-1.5 rounded-lg border-2 transition-all",
                isActive
                  ? "border-[var(--primary)] shadow-sm"
                  : "border-[var(--border)] hover:border-[var(--border-hover)]"
              )}
              style={{ backgroundColor: colors[0] }}
              title={isDarkOnly ? `${preset.name} (dark only)` : preset.name}
            >
              {/* Color preview dots */}
              <div className="flex items-center gap-0.5">
                <div className="w-2 h-2 rounded-full" style={{ backgroundColor: colors[1] }} />
                <div className="w-2 h-2 rounded-full" style={{ backgroundColor: colors[2] }} />
                <div className="w-2 h-2 rounded-full" style={{ backgroundColor: colors[3] }} />
              </div>

              {/* Name */}
              <span
                className="text-[8px] font-medium leading-none truncate max-w-full"
                style={{ color: colors[4] }}
              >
                {preset.name}
              </span>

              {/* Active check */}
              {isActive && (
                <div className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-[var(--primary)] flex items-center justify-center">
                  <Check className="w-2.5 h-2.5 text-white" weight="bold" />
                </div>
              )}

              {/* Dark-only indicator */}
              {isDarkOnly && (
                <div className="absolute top-0.5 left-0.5">
                  <Moon className="w-2.5 h-2.5" weight="fill" style={{ color: colors[4] }} />
                </div>
              )}
            </button>
          );
        })}
      </div>

      {/* Dark-only notice when active theme has no light variant */}
      {activeDarkOnly && (
        <div className="flex items-center gap-1.5 mt-2 px-1">
          <Moon className="w-3.5 h-3.5 text-[var(--text-muted)] shrink-0" weight="fill" />
          <p className="text-xs text-[var(--text-muted)]">
            Dark only — switching to light mode will revert to the default theme.
          </p>
        </div>
      )}
    </div>
  );
}
