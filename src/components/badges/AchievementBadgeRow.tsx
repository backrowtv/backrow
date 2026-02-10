"use client";

import {
  Star,
  ThumbsDown,
  TrendDown,
  Heart,
  Crown,
  Timer,
  Repeat,
  Flag,
  IdentificationCard,
} from "@phosphor-icons/react";
import { Text } from "@/components/ui/typography";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import type { AchievementBadge } from "@/types/badges";
import { cn } from "@/lib/utils";
import { CATEGORY_COLORS } from "./BadgeCategoryRow";

const ACHIEVEMENT_ICONS: Record<
  string,
  React.ComponentType<{ className?: string; weight?: "fill" | "regular" }>
> = {
  rating_perfect_10: Star,
  rating_rock_bottom: ThumbsDown,
  rating_contrarian: TrendDown,
  rating_generous: Heart,
  nomination_crowd_pleaser: Crown,
  festival_photo_finish: Timer,
  festival_back_to_back: Repeat,
  club_founder: Flag,
};

interface AchievementBadgeRowProps {
  badges: AchievementBadge[];
  featuredIds: string[];
}

export function AchievementBadgeRow({ badges, featuredIds }: AchievementBadgeRowProps) {
  const colors = CATEGORY_COLORS.achievements || CATEGORY_COLORS.festivals_won;

  return (
    <div className={cn("grid gap-2 sm:gap-3 justify-items-center grid-cols-4 sm:grid-cols-8")}>
      {badges.map((badge) => (
        <AchievementItem
          key={badge.id}
          badge={badge}
          isFeatured={featuredIds.includes(badge.id)}
          colors={colors}
        />
      ))}
    </div>
  );
}

interface AchievementItemProps {
  badge: AchievementBadge;
  isFeatured: boolean;
  colors: { bg: string; ring: string };
}

function AchievementItem({ badge, isFeatured, colors }: AchievementItemProps) {
  const { earned, name, description, requirementType } = badge;
  const Icon = ACHIEVEMENT_ICONS[requirementType] || Star;

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <div className="relative flex flex-col items-center gap-1 w-full">
            <div
              className={cn(
                "relative w-14 h-14 rounded-full flex items-center justify-center transition-all",
                !earned && "opacity-20 grayscale"
              )}
              style={{
                backgroundColor: colors.bg,
                boxShadow: earned
                  ? "inset 0 1px 0 rgba(255,255,255,0.08), 0 1px 3px rgba(0,0,0,0.1)"
                  : undefined,
                border: `1.5px solid ${earned ? colors.ring : "var(--border)"}`,
              }}
            >
              <Icon
                className={cn(
                  "w-6 h-6",
                  earned ? "text-[var(--text-primary)]" : "text-[var(--text-muted)]"
                )}
                weight={earned ? "fill" : "regular"}
              />

              {earned && isFeatured && (
                <div className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-[var(--primary)] flex items-center justify-center border-2 border-[var(--background)]">
                  <IdentificationCard className="w-3 h-3 text-white" weight="fill" />
                </div>
              )}
            </div>

            <Text
              size="tiny"
              className={cn(
                "font-medium text-center leading-tight max-w-[5rem]",
                earned ? "text-[var(--text-primary)]" : "text-[var(--text-muted)]"
              )}
            >
              {name}
            </Text>
          </div>
        </TooltipTrigger>

        <TooltipContent side="top" className="max-w-xs">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Icon
                className={cn(
                  "w-4 h-4",
                  earned ? "text-[var(--text-primary)]" : "text-[var(--text-muted)]"
                )}
                weight={earned ? "fill" : "regular"}
              />
              <p className="font-semibold">{name}</p>
            </div>

            <p className="text-xs text-[var(--text-muted)]">{description}</p>

            {earned && badge.earnedAt && (
              <div className="pt-1 border-t border-[var(--border)] space-y-1">
                <p className="text-xs text-[var(--text-muted)]" suppressHydrationWarning>
                  Earned {new Date(badge.earnedAt).toLocaleDateString()}
                </p>
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
