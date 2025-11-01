/**
 * Formatting utility functions
 *
 * Centralized formatting helpers for currency, time, and other display values.
 * Extracted from component files to reduce duplication.
 */

/**
 * Format a currency amount in a compact, human-readable format
 *
 * @example
 * formatCurrency(1500000000) // "$1.5B"
 * formatCurrency(25000000) // "$25M"
 * formatCurrency(750000) // "$750K"
 * formatCurrency(500) // "$500"
 */
export function formatCurrency(amount: number): string {
  if (amount >= 1_000_000_000) {
    return `$${(amount / 1_000_000_000).toFixed(1)}B`;
  }
  if (amount >= 1_000_000) {
    return `$${(amount / 1_000_000).toFixed(0)}M`;
  }
  if (amount >= 1_000) {
    return `$${(amount / 1_000).toFixed(0)}K`;
  }
  return `$${amount}`;
}

/**
 * Format a duration in minutes to a human-readable format
 *
 * @example
 * formatRuntime(150) // "2h 30m"
 * formatRuntime(60) // "1h"
 * formatRuntime(45) // "45m"
 * formatRuntime(0) // "0m"
 */
export function formatRuntime(minutes: number): string {
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  if (hours === 0) return `${mins}m`;
  if (mins === 0) return `${hours}h`;
  return `${hours}h ${mins}m`;
}

/**
 * Format a runtime that may be null
 * Returns null if the input is null, otherwise formats the runtime
 *
 * @example
 * formatRuntimeOptional(150) // "2h 30m"
 * formatRuntimeOptional(null) // null
 */
export function formatRuntimeOptional(minutes: number | null): string | null {
  if (minutes === null) return null;
  return formatRuntime(minutes);
}
