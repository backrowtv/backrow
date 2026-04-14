"use client";

import { cn } from "@/lib/utils";
import { Trophy } from "@phosphor-icons/react";
import Image from "next/image";
import type { FeaturedBadge } from "@/types/id-card";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { CATEGORY_COLORS } from "@/components/badges/BadgeCategoryRow";

interface CategoryBadgeProps {
  badge: FeaturedBadge;
  size?: "xs" | "sm" | "md";
  showLabel?: boolean;
}

export function CategoryBadge({ badge, size = "sm", showLabel = true }: CategoryBadgeProps) {
  const sizeClasses = {
    xs: { circle: "w-6 h-6", icon: "w-3 h-3", img: 15, label: "text-[10px]" },
    sm: { circle: "w-8 h-8", icon: "w-4 h-4", img: 20, label: "text-xs" },
    md: { circle: "w-10 h-10", icon: "w-5 h-5", img: 26, label: "text-xs" },
  };

  const sizes = sizeClasses[size];

  const colors = CATEGORY_COLORS[badge.category] || CATEGORY_COLORS.festivals_won;

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <div className="flex flex-col items-center gap-0.5">
            {/* Circular badge with category-colored background */}
            <div
              className={cn(
                "rounded-full flex items-center justify-center flex-shrink-0",
                sizes.circle
              )}
              style={{
                backgroundColor: colors.bg,
                border: `1.5px solid ${colors.ring}`,
              }}
            >
              {badge.icon_url ? (
                <Image
                  src={badge.icon_url}
                  alt={badge.name}
                  width={sizes.img}
                  height={sizes.img}
                  className="object-contain"
                  unoptimized
                />
              ) : (
                <Trophy className={cn(sizes.icon, "text-[var(--text-secondary)]")} weight="fill" />
              )}
            </div>
            {/* Visible name label */}
            {showLabel && (
              <span
                className={cn(
                  "font-medium truncate max-w-[5rem] text-center text-[var(--text-secondary)]",
                  sizes.label
                )}
              >
                {badge.name}
              </span>
            )}
          </div>
        </TooltipTrigger>
        <TooltipContent side="top">
          <div className="space-y-1">
            <p className="font-semibold">{badge.name}</p>
            {badge.description && (
              <p className="text-xs text-[var(--text-muted)]">{badge.description}</p>
            )}
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
