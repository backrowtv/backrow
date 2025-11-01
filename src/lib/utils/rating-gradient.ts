/**
 * Rating slider gradient utility.
 * Creates a CSS linear-gradient for range inputs that fills based on the current value.
 */

/**
 * Generates a linear gradient for rating sliders.
 *
 * @param value - Current rating value
 * @param min - Minimum value of the scale
 * @param max - Maximum value of the scale
 * @param filledColor - CSS color for the filled portion (default: 'var(--primary)')
 * @param emptyColor - CSS color for the empty portion (default: 'var(--surface-2)')
 * @returns CSS linear-gradient string
 *
 * @example
 * ```tsx
 * // Basic usage
 * <input
 *   type="range"
 *   style={{ background: getRatingSliderGradient(rating, 0, 10) }}
 * />
 *
 * // With custom colors
 * <input
 *   type="range"
 *   style={{ background: getRatingSliderGradient(rating, 0, 10, 'var(--primary)', 'var(--surface-3)') }}
 * />
 * ```
 */
export function getRatingSliderGradient(
  value: number,
  min: number,
  max: number,
  filledColor = "var(--primary)",
  emptyColor = "var(--surface-2)"
): string {
  // Calculate percentage of the slider that should be filled
  const percentage = ((value - min) / (max - min)) * 100;

  return `linear-gradient(to right, ${filledColor} 0%, ${filledColor} ${percentage}%, ${emptyColor} ${percentage}%, ${emptyColor} 100%)`;
}

/**
 * Returns appropriate background style for a rating slider.
 * Handles edge case where value equals minimum (returns solid empty color).
 *
 * @param value - Current rating value
 * @param min - Minimum value of the scale
 * @param max - Maximum value of the scale
 * @param filledColor - CSS color for the filled portion (default: 'var(--primary)')
 * @param emptyColor - CSS color for the empty portion (default: 'var(--surface-2)')
 * @returns CSS background string
 */
export function getRatingSliderBackground(
  value: number,
  min: number,
  max: number,
  filledColor = "var(--primary)",
  emptyColor = "var(--surface-2)"
): string {
  // If value is at minimum, return solid empty color (no gradient needed)
  if (value <= min) {
    return emptyColor;
  }

  return getRatingSliderGradient(value, min, max, filledColor, emptyColor);
}
