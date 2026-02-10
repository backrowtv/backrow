"use client";

import { cn } from "@/lib/utils";
import type { RatingVisualIcon } from "@/types/club-settings";
import { Star, Popcorn, Ticket, FilmStrip, FilmSlate } from "@phosphor-icons/react";

interface VisualRatingIconProps {
  icon: RatingVisualIcon;
  filled: boolean;
  className?: string;
}

export function VisualRatingIcon({ icon, filled, className }: VisualRatingIconProps) {
  const baseClasses = cn(
    "w-6 h-6 transition-colors",
    filled ? "text-foreground" : "text-[var(--text-muted)] opacity-30",
    className
  );

  const weight = filled ? "fill" : "regular";

  switch (icon) {
    case "stars":
      return <Star className={baseClasses} weight={weight} />;
    case "popcorn":
      return <Popcorn className={baseClasses} weight={weight} />;
    case "ticket":
      return <Ticket className={baseClasses} weight={weight} />;
    case "film":
      return <FilmStrip className={baseClasses} weight={weight} />;
    case "clapperboard":
      return <FilmSlate className={baseClasses} weight={weight} />;
    default:
      return <Star className={baseClasses} weight={weight} />;
  }
}
