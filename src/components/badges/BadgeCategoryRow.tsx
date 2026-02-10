"use client";

import { IdentificationCard, Trophy } from "@phosphor-icons/react";
import Image from "next/image";
import { Text } from "@/components/ui/typography";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import type { BadgeWithProgress, BadgeCategoryId } from "@/types/badges";
import { cn } from "@/lib/utils";
import { BADGE_CATEGORY_LABELS } from "@/lib/constants/ui";

/**
 * Distinct category colors for badge backgrounds.
 * 8 total sections (4 user + 4 club) each get a unique hue.
 * All 6 badges in a section share the same background color.
 */
export const CATEGORY_COLORS: Record<string, { bg: string; ring: string }> = {
  // User badge categories
  festivals_won: {
    bg: "color-mix(in oklch, oklch(0.75 0.14 85) 18%, var(--surface-2))", // warm gold
    ring: "color-mix(in oklch, oklch(0.75 0.14 85) 30%, var(--border))",
  },
  movies_watched: {
    bg: "color-mix(in oklch, oklch(0.65 0.14 250) 18%, var(--surface-2))", // cool blue
    ring: "color-mix(in oklch, oklch(0.65 0.14 250) 30%, var(--border))",
  },
  festivals_participated: {
    bg: "color-mix(in oklch, oklch(0.70 0.14 175) 18%, var(--surface-2))", // teal
    ring: "color-mix(in oklch, oklch(0.70 0.14 175) 30%, var(--border))",
  },
  guesses_correct: {
    bg: "color-mix(in oklch, oklch(0.70 0.14 310) 18%, var(--surface-2))", // purple
    ring: "color-mix(in oklch, oklch(0.70 0.14 310) 30%, var(--border))",
  },
  // Club badge categories
  festivals_completed: {
    bg: "color-mix(in oklch, oklch(0.72 0.14 30) 18%, var(--surface-2))", // coral/red-orange
    ring: "color-mix(in oklch, oklch(0.72 0.14 30) 30%, var(--border))",
  },
  club_movies_watched: {
    bg: "color-mix(in oklch, oklch(0.68 0.14 280) 18%, var(--surface-2))", // indigo
    ring: "color-mix(in oklch, oklch(0.68 0.14 280) 30%, var(--border))",
  },
  members: {
    bg: "color-mix(in oklch, oklch(0.72 0.14 140) 18%, var(--surface-2))", // green
    ring: "color-mix(in oklch, oklch(0.72 0.14 140) 30%, var(--border))",
  },
  seasons_completed: {
    bg: "color-mix(in oklch, oklch(0.70 0.14 55) 18%, var(--surface-2))", // amber
    ring: "color-mix(in oklch, oklch(0.70 0.14 55) 30%, var(--border))",
  },
  // Achievement badges
  achievements: {
    bg: "color-mix(in oklch, oklch(0.72 0.14 0) 18%, var(--surface-2))", // warm red
    ring: "color-mix(in oklch, oklch(0.72 0.14 0) 30%, var(--border))",
  },
};

interface BadgeCategoryRowProps {
  badges: BadgeWithProgress[];
  currentValue: number;
  featuredIds: string[];
  category: BadgeCategoryId;
  colorKey?: string; // Override color lookup key (for club categories with distinct colors)
  customTierLabels?: string[]; // Optional custom tier labels (for club challenges)
}

export function BadgeCategoryRow({
  badges,
  currentValue,
  featuredIds,
  category,
  colorKey,
  customTierLabels,
}: BadgeCategoryRowProps) {
  return (
    <div className="space-y-3">
      <div className={cn("grid gap-2 sm:gap-3 justify-items-center grid-cols-3 sm:grid-cols-6")}>
        {badges.map((badge, index) => (
          <BadgeItem
            key={badge.id}
            badge={badge}
            currentValue={currentValue}
            tier={index + 1}
            isFeatured={featuredIds.includes(badge.id)}
            category={category}
            colorKey={colorKey}
            customTierLabels={customTierLabels}
          />
        ))}
      </div>
    </div>
  );
}

interface BadgeItemProps {
  badge: BadgeWithProgress;
  currentValue: number;
  tier: number;
  isFeatured: boolean;
  category: BadgeCategoryId;
  colorKey?: string;
  customTierLabels?: string[];
}

function BadgeItem({
  badge,
  currentValue,
  tier,
  isFeatured,
  category,
  colorKey,
  customTierLabels,
}: BadgeItemProps) {
  const { earned, isNextToUnlock, threshold, progress, name, description } = badge;
  const isLocked = !earned && !isNextToUnlock;

  // Get category-specific label (use custom labels if provided)
  const tierLabels = customTierLabels || BADGE_CATEGORY_LABELS[category];
  const tierLabel = tierLabels[Math.min(tier - 1, tierLabels.length - 1)];

  // Get category color — use colorKey override for club categories
  const colors = CATEGORY_COLORS[colorKey || category] || CATEGORY_COLORS.festivals_won;

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <div className="relative flex flex-col items-center gap-1 w-full">
            {/* Badge container */}
            <div
              className={cn(
                "relative w-14 h-14 rounded-full flex items-center justify-center transition-all",
                isLocked && "opacity-20 grayscale"
              )}
              style={{
                backgroundColor: colors.bg,
                boxShadow: earned
                  ? `inset 0 1px 0 rgba(255,255,255,0.08), 0 1px 3px rgba(0,0,0,0.1)`
                  : undefined,
                border: `1.5px solid ${earned ? colors.ring : "var(--border)"}`,
              }}
            >
              {/* Progress arc for next-to-unlock — circular */}
              {isNextToUnlock && (
                <svg className="absolute inset-0 w-full h-full -rotate-90" viewBox="0 0 56 56">
                  <circle
                    cx="28"
                    cy="28"
                    r="26"
                    fill="none"
                    stroke="var(--text-muted)"
                    strokeWidth="3"
                    strokeDasharray={`${progress.percent * 1.634} 163.4`}
                    strokeLinecap="round"
                  />
                </svg>
              )}

              {/* Inner content — custom icon or fallback */}
              {badge.icon_url ? (
                <Image
                  src={badge.icon_url}
                  alt={name}
                  width={36}
                  height={36}
                  className="object-contain"
                />
              ) : (
                <div className="flex flex-col items-center">
                  <Trophy
                    className={cn(
                      "w-5 h-5",
                      earned && "text-[var(--text-primary)]",
                      isNextToUnlock && "text-[var(--text-secondary)]",
                      isLocked && "text-[var(--text-muted)]"
                    )}
                    weight={earned ? "fill" : "regular"}
                  />
                  <span
                    className={cn(
                      "text-xs font-bold tabular-nums mt-0.5",
                      earned && "text-[var(--text-primary)]",
                      isNextToUnlock && "text-[var(--text-primary)]",
                      isLocked && "text-[var(--text-muted)]"
                    )}
                  >
                    {threshold}
                  </span>
                </div>
              )}

              {/* Featured indicator (ID card icon) */}
              {earned && isFeatured && (
                <div className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-[var(--primary)] flex items-center justify-center border-2 border-[var(--background)]">
                  <IdentificationCard className="w-3 h-3 text-white" weight="fill" />
                </div>
              )}
            </div>

            {/* Tier label below badge — centered, wrapping allowed */}
            <Text
              size="tiny"
              className={cn(
                "font-medium text-center leading-tight max-w-[5rem]",
                earned && "text-[var(--text-primary)]",
                !earned && "text-[var(--text-muted)]"
              )}
            >
              {tierLabel}
            </Text>

            {/* Progress percentage for next-to-unlock (below tier label) */}
            {isNextToUnlock && (
              <Text
                size="tiny"
                className="text-[var(--text-muted)] font-medium tabular-nums -mt-0.5"
              >
                {Math.round(progress.percent)}%
              </Text>
            )}
          </div>
        </TooltipTrigger>

        <TooltipContent side="top" className="max-w-xs">
          <div className="space-y-2">
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-2">
                {badge.icon_url ? (
                  <Image
                    src={badge.icon_url}
                    alt={name}
                    width={16}
                    height={16}
                    className="object-contain"
                  />
                ) : (
                  <Trophy
                    className={cn(
                      "w-4 h-4",
                      earned ? "text-[var(--text-primary)]" : "text-[var(--text-muted)]"
                    )}
                    weight={earned ? "fill" : "regular"}
                  />
                )}
                <p className="font-semibold">{name}</p>
              </div>
            </div>

            <p className="text-xs text-[var(--text-muted)]">{description}</p>

            {!earned && (
              <div className="pt-1 border-t border-[var(--border)]">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-[var(--text-muted)]">Progress</span>
                  <span>
                    <span className="text-[var(--primary)] font-medium">{currentValue}</span>
                    <span className="text-[var(--text-muted)]"> / {threshold}</span>
                  </span>
                </div>
                <div className="mt-1 h-1.5 bg-[var(--surface-2)] rounded-full overflow-hidden">
                  <div
                    className="h-full bg-[var(--primary)] rounded-full transition-all"
                    style={{ width: `${Math.min(progress.percent, 100)}%` }}
                  />
                </div>
              </div>
            )}

            {earned && (
              <div className="pt-1 border-t border-[var(--border)] space-y-1">
                {badge.earnedAt && (
                  <p className="text-xs text-[var(--text-muted)]" suppressHydrationWarning>
                    Earned {new Date(badge.earnedAt).toLocaleDateString()}
                  </p>
                )}
                {isFeatured && (
                  <p className="text-xs flex items-center gap-1 text-[var(--primary)]">
                    <IdentificationCard className="w-3 h-3" weight="fill" />
                    Displayed on ID card
                  </p>
                )}
              </div>
            )}
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
