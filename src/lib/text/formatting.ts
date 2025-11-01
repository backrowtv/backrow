/**
 * Text formatting utilities for handling user-generated content
 * Provides consistent validation, length limits, and HTML stripping
 */

// Character limits for different content types
export const TEXT_LIMITS = {
  COMMENT: 10000,
  THREAD_CONTENT: 20000,
  ANNOUNCEMENT: 5000,
  DIRECT_MESSAGE: 2000,
  PITCH: 500,
  THREAD_TITLE: 200,
} as const

// CSS classes for text overflow handling
export const TEXT_OVERFLOW_CLASSES = {
  breakWords: 'break-words',
  breakAll: 'break-all', // For URLs and long unbroken strings
  truncate: 'truncate',
  lineClamp: (lines: number) => `line-clamp-${lines}`,
} as const

/**
 * Strip HTML tags from content and trim whitespace
 * Useful for length validation and empty content checks
 */
export function stripHtml(html: string): string {
  return html.replace(/<[^>]*>/g, '').trim()
}

/**
 * Check if HTML content is effectively empty
 * (contains only whitespace or empty HTML tags)
 */
export function isContentEmpty(html: string): boolean {
  return stripHtml(html).length === 0
}

/**
 * Get the plain text length of HTML content
 */
export function getContentLength(html: string): number {
  return stripHtml(html).length
}

/**
 * Check if content exceeds the specified limit
 */
export function isOverLimit(html: string, limit: number): boolean {
  return getContentLength(html) > limit
}

/**
 * Get percentage of limit used (0-100+)
 */
export function getLimitPercentage(html: string, limit: number): number {
  return Math.round((getContentLength(html) / limit) * 100)
}

/**
 * Truncate plain text to a max length with ellipsis
 */
export function truncateText(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text
  return text.slice(0, maxLength).trim() + '...'
}

/**
 * Get a preview of HTML content (stripped and truncated)
 */
export function getPreviewText(html: string, maxLength: number = 80): string {
  const stripped = stripHtml(html)
  return truncateText(stripped, maxLength)
}
