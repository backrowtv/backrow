"use client";

import { cn } from "@/lib/utils";
import { useUserProfile } from "@/components/auth/UserProfileProvider";
import { formatRatingDisplay } from "@/lib/ratings/normalize";
import {
  DEFAULT_RATING_PREFERENCES,
  type UserRatingPreferences,
} from "@/types/user-rating-preferences";

interface RatingDisplayProps {
  /** Rating value (on 0-10 scale) */
  rating: number;
  /** Custom class for container */
  className?: string;
  /** Whether to show the "/10" suffix */
  showMax?: boolean;
}

/**
 * RatingDisplay - Unified component for displaying ratings
 *
 * Always shows numeric display with one decimal place (0.0 - 10.0)
 *
 * @example
 * <RatingDisplay rating={8.0} />
 * // renders "8.0"
 *
 * @example
 * <RatingDisplay rating={7.5} showMax />
 * // renders "7.5/10"
 */
export function RatingDisplay({ rating, className, showMax = false }: RatingDisplayProps) {
  const formatted = formatRatingDisplay(rating);

  return (
    <span className={cn("tabular-nums", className)}>
      {formatted}
      {showMax && <span className="text-[0.65em] opacity-40 font-medium">/10</span>}
    </span>
  );
}

/**
 * Hook to get the user's rating preferences
 * Returns increment and slider icon preferences
 */
export function useRatingPreferences(): UserRatingPreferences {
  const { profile } = useUserProfile();
  return profile?.rating_preferences ?? DEFAULT_RATING_PREFERENCES;
}
