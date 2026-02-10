"use client";

import Image from "next/image";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import type { Badge as BadgeType } from "@/app/actions/badges.types";

interface BadgeDisplayProps {
  badge: BadgeType;
  earned?: boolean;
  progress?: {
    current: number;
    target: number;
    progress: number;
  };
  size?: "sm" | "md" | "lg";
  showProgress?: boolean;
}

export function BadgeDisplay({
  badge,
  earned = false,
  progress,
  size = "md",
  showProgress = false,
}: BadgeDisplayProps) {
  const sizeClasses = {
    sm: "w-8 h-8",
    md: "w-12 h-12",
    lg: "w-16 h-16",
  };

  const imageSizes = {
    sm: 24,
    md: 36,
    lg: 48,
  };

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <div
            className={`
              ${sizeClasses[size]}
              flex items-center justify-center
              transition-all duration-200
              ${!earned ? "opacity-40 grayscale" : ""}
              ${earned ? "hover:scale-110 cursor-pointer" : "cursor-default"}
            `}
          >
            {badge.icon_url ? (
              <Image
                src={badge.icon_url}
                alt={badge.name}
                width={imageSizes[size]}
                height={imageSizes[size]}
                className="object-contain w-full h-full"
                draggable={false}
              />
            ) : (
              <span className="text-xs text-[var(--text-muted)]">?</span>
            )}
          </div>
        </TooltipTrigger>
        <TooltipContent side="top" className="max-w-xs">
          <div className="space-y-1">
            <p className="font-semibold text-sm">{badge.name}</p>
            <p className="text-xs text-[var(--text-muted)]">{badge.description}</p>
            {showProgress && progress && !earned && (
              <p className="text-xs text-[var(--text-muted)] mt-2">
                Progress: {progress.current} / {progress.target}
              </p>
            )}
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
