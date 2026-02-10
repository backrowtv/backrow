/**
 * Rating Normalization Utilities
 *
 * All ratings in BackRow are internally stored on a 0-10 scale with 0.1 precision.
 * All ratings are displayed as numbers with exactly one decimal place (e.g., "7.0", "8.5").
 */

/**
 * Normalize any rating to the internal 0-10 scale
 *
 * @param rating - The rating value in the source scale
 * @param fromMin - The minimum value of the source scale (e.g., 0 or 1)
 * @param fromMax - The maximum value of the source scale (e.g., 5 or 10)
 * @returns The normalized rating on a 0-10 scale with 0.1 precision
 *
 * @example
 * normalizeRating(2.5, 1, 5) // 2.5 out of 5 stars = 3.75/10 -> rounds to 3.8
 * normalizeRating(7.5, 0, 10) // Already on 0-10 scale = 7.5
 * normalizeRating(3, 1, 5) // 3 out of 5 stars = 5.0/10
 */
export function normalizeRating(rating: number, fromMin: number, fromMax: number): number {
  // Handle edge cases
  if (fromMax === fromMin) return 0;
  if (rating < fromMin) rating = fromMin;
  if (rating > fromMax) rating = fromMax;

  // Calculate percentage of the source scale
  const percentage = (rating - fromMin) / (fromMax - fromMin);

  // Convert to 0-10 scale
  const normalized = percentage * 10;

  // Round to 1 decimal place for storage precision
  return Math.round(normalized * 10) / 10;
}

/**
 * Format a rating for display — always one decimal place, 0-10 scale
 *
 * @param rating - The rating value to format
 * @returns Formatted string with exactly one decimal place
 *
 * @example
 * formatRatingDisplay(5) // "5.0"
 * formatRatingDisplay(5.5) // "5.5"
 * formatRatingDisplay(5.25) // "5.3" (rounded)
 * formatRatingDisplay(10) // "10.0"
 */
export function formatRatingDisplay(rating: number): string {
  return rating.toFixed(1);
}

/**
 * Constants for the internal rating scale
 */
export const INTERNAL_RATING_SCALE = {
  MIN: 0,
  MAX: 10,
  PRECISION: 0.1, // Minimum step for storage
} as const;

/**
 * Check if a rating is valid for the internal scale
 */
export function isValidInternalRating(rating: number): boolean {
  return (
    typeof rating === "number" &&
    !isNaN(rating) &&
    rating >= INTERNAL_RATING_SCALE.MIN &&
    rating <= INTERNAL_RATING_SCALE.MAX
  );
}
