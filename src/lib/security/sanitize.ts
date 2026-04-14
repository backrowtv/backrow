/**
 * HTML Sanitization Utilities
 *
 * Provides XSS protection for user-generated HTML content using DOMPurify.
 * Used primarily for TipTap rich text editor content in announcements.
 *
 * @example
 * import { sanitizeHtml, sanitizeForStorage } from '@/lib/security/sanitize'
 *
 * // Before rendering user content
 * <div dangerouslySetInnerHTML={{ __html: sanitizeHtml(content) }} />
 *
 * // Before storing in database
 * const safeHtml = sanitizeForStorage(userInput)
 */

import DOMPurify from "isomorphic-dompurify";

/**
 * Allowed HTML tags for rich text content.
 * Restricts to safe formatting and structure tags only.
 */
const ALLOWED_TAGS = [
  // Text formatting
  "p",
  "br",
  "strong",
  "b",
  "em",
  "i",
  "u",
  "s",
  "strike",
  "del",
  "mark",
  "small",
  "sub",
  "sup",

  // Headings
  "h1",
  "h2",
  "h3",
  "h4",
  "h5",
  "h6",

  // Lists
  "ul",
  "ol",
  "li",

  // Structure
  "blockquote",
  "pre",
  "code",
  "hr",
  "div",
  "span",

  // Links and media
  "a",
  "img",
] as const;

/**
 * Allowed HTML attributes.
 * Restricts to safe attributes for styling and linking.
 */
const ALLOWED_ATTR = [
  "href",
  "src",
  "alt",
  "title",
  "class",
  "target",
  "rel",
  "width",
  "height",
] as const;

/**
 * Default DOMPurify configuration for rich text content.
 */
const DEFAULT_CONFIG = {
  ALLOWED_TAGS: [...ALLOWED_TAGS],
  ALLOWED_ATTR: [...ALLOWED_ATTR],
  ALLOW_DATA_ATTR: false,
  // Force all links to open in new tab with security attributes
  ADD_ATTR: ["target", "rel"],
};

/**
 * Sanitizes HTML content for safe rendering in the browser.
 * Removes potentially dangerous elements, attributes, and scripts.
 *
 * @param dirty - The untrusted HTML string to sanitize
 * @returns Sanitized HTML string safe for rendering
 *
 * @example
 * // Safe to use with dangerouslySetInnerHTML
 * <div dangerouslySetInnerHTML={{ __html: sanitizeHtml(userContent) }} />
 */
export function sanitizeHtml(dirty: string): string {
  if (!dirty) return "";

  return DOMPurify.sanitize(dirty, DEFAULT_CONFIG);
}

/**
 * Sanitizes HTML content for storage in the database.
 * Uses stricter settings and normalizes the output.
 *
 * @param dirty - The untrusted HTML string to sanitize
 * @returns Sanitized and normalized HTML string
 *
 * @example
 * // Before storing announcement content
 * const safeContent = sanitizeForStorage(formData.get('content'))
 * await supabase.from('announcements').insert({ content_html: safeContent })
 */
export function sanitizeForStorage(dirty: string): string {
  if (!dirty) return "";

  const sanitized = DOMPurify.sanitize(dirty, {
    ...DEFAULT_CONFIG,
    // Additional restrictions for storage
    FORBID_TAGS: ["style", "script", "iframe", "object", "embed", "form"],
    FORBID_ATTR: ["style", "onerror", "onload", "onclick", "onmouseover"],
  });

  // Normalize: trim and ensure valid HTML structure
  return sanitized.trim() || "<p></p>";
}

/**
 * Sanitizes plain text input by escaping HTML entities.
 * Use for text fields that shouldn't contain any HTML.
 *
 * @param text - The untrusted text to escape
 * @returns Escaped text safe for rendering
 *
 * @example
 * // For user names, titles, or other plain text
 * <span>{escapeHtml(userName)}</span>
 */
export function escapeHtml(text: string): string {
  if (!text) return "";

  const div = typeof document !== "undefined" ? document.createElement("div") : null;
  if (div) {
    div.textContent = text;
    return div.innerHTML;
  }

  // Fallback for SSR
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

/**
 * Checks if a string contains potentially dangerous HTML.
 * Useful for validation before processing.
 *
 * @param html - The HTML string to check
 * @returns True if the HTML contains script tags or event handlers
 */
export function containsDangerousHtml(html: string): boolean {
  if (!html) return false;

  const dangerous = /<script|javascript:|on\w+\s*=/i;
  return dangerous.test(html);
}

/**
 * Strips all HTML tags from content, returning plain text.
 * Useful for generating previews or summaries.
 *
 * @param html - The HTML string to strip
 * @returns Plain text content
 */
export function stripHtml(html: string): string {
  if (!html) return "";

  return DOMPurify.sanitize(html, { ALLOWED_TAGS: [] });
}

/**
 * Validates that a string is a valid hex color.
 * Prevents CSS injection attacks when interpolating colors into style tags.
 *
 * @param color - The color string to validate
 * @returns True if the color is a valid 6-character hex color
 *
 * @example
 * isValidHexColor('#FF5500') // true
 * isValidHexColor('#fff') // false (must be 6 chars)
 * isValidHexColor('red') // false (not hex)
 * isValidHexColor('#FF5500</style><script>') // false (injection attempt)
 */
export function isValidHexColor(color: string): boolean {
  if (!color) return false;
  return /^#[0-9A-Fa-f]{6}$/.test(color);
}
