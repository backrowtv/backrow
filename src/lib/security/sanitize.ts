/**
 * HTML Sanitization Utilities
 *
 * Provides XSS protection for user-generated HTML content.
 *
 * Server path: sanitize-html (htmlparser2-backed, no DOM). Runs in every
 *   "use server" action that stores rich-text content.
 * Client path: dompurify (browser-native DOMParser, no jsdom). Runs inside
 *   the TipTap editor for defense-in-depth display.
 *
 * Previous implementation used isomorphic-dompurify which drags jsdom into
 * the server bundle. jsdom is webpack-hostile (ESM-only transitive deps,
 * __dirname-relative fs reads), so we dropped it in favor of two
 * runtime-specific libs with a shared public API. See the plan file at
 * ~/.claude/plans/i-need-you-to-indexed-volcano.md for the full story.
 */

import sanitizeHtmlLib from "sanitize-html";
import DOMPurify from "dompurify";

/**
 * Allowed HTML tags for rich text content.
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
 * Allowed HTML attributes — flat list, applied to every tag.
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
 * Stricter attribute denylist used by sanitizeForStorage. sanitize-html's
 * allow-only model makes this implicit, but we keep the constant for
 * documentation and parity with the old FORBID_ATTR config.
 */
const STORAGE_FORBID_ATTR = ["style", "onerror", "onload", "onclick", "onmouseover"] as const;

/**
 * Stricter tag denylist used by sanitizeForStorage.
 */
const STORAGE_FORBID_TAGS = ["style", "script", "iframe", "object", "embed", "form"] as const;

const SERVER_CONFIG_DEFAULT: sanitizeHtmlLib.IOptions = {
  allowedTags: [...ALLOWED_TAGS],
  allowedAttributes: { "*": [...ALLOWED_ATTR] },
  disallowedTagsMode: "discard",
};

const SERVER_CONFIG_STORAGE: sanitizeHtmlLib.IOptions = {
  ...SERVER_CONFIG_DEFAULT,
  // Explicitly drop these even if ALLOWED_TAGS later broadens.
  exclusiveFilter: (frame) =>
    STORAGE_FORBID_TAGS.includes(frame.tag as (typeof STORAGE_FORBID_TAGS)[number]),
};

function isBrowser(): boolean {
  return typeof window !== "undefined" && typeof window.document !== "undefined";
}

const CLIENT_CONFIG = {
  ALLOWED_TAGS: [...ALLOWED_TAGS],
  ALLOWED_ATTR: [...ALLOWED_ATTR],
  ALLOW_DATA_ATTR: false,
};

/**
 * Sanitizes HTML content for safe rendering in the browser.
 */
export function sanitizeHtml(dirty: string): string {
  if (!dirty) return "";
  if (isBrowser()) {
    return DOMPurify.sanitize(dirty, CLIENT_CONFIG);
  }
  // Server fallback — not used today but kept for API parity.
  return sanitizeHtmlLib(dirty, SERVER_CONFIG_DEFAULT);
}

/**
 * Sanitizes HTML content for storage in the database. Stricter than
 * sanitizeHtml: also removes STORAGE_FORBID_ATTR and STORAGE_FORBID_TAGS.
 */
export function sanitizeForStorage(dirty: string): string {
  if (!dirty) return "";

  const forbidSet = new Set<string>(STORAGE_FORBID_ATTR);
  const storageAttrs = ALLOWED_ATTR.filter((a) => !forbidSet.has(a));

  let sanitized: string;
  if (isBrowser()) {
    sanitized = DOMPurify.sanitize(dirty, {
      ALLOWED_TAGS: [...ALLOWED_TAGS],
      ALLOWED_ATTR: [...storageAttrs],
      ALLOW_DATA_ATTR: false,
      FORBID_TAGS: [...STORAGE_FORBID_TAGS],
      FORBID_ATTR: [...STORAGE_FORBID_ATTR],
    });
  } else {
    sanitized = sanitizeHtmlLib(dirty, {
      ...SERVER_CONFIG_STORAGE,
      allowedAttributes: { "*": [...storageAttrs] },
    });
  }

  return sanitized.trim() || "<p></p>";
}

/**
 * Sanitizes plain text input by escaping HTML entities.
 */
export function escapeHtml(text: string): string {
  if (!text) return "";

  const div = typeof document !== "undefined" ? document.createElement("div") : null;
  if (div) {
    div.textContent = text;
    return div.innerHTML;
  }

  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

/**
 * Checks if a string contains potentially dangerous HTML.
 */
export function containsDangerousHtml(html: string): boolean {
  if (!html) return false;
  const dangerous = /<script|javascript:|on\w+\s*=/i;
  return dangerous.test(html);
}

/**
 * Strips all HTML tags, returning plain text.
 */
export function stripHtml(html: string): string {
  if (!html) return "";
  if (isBrowser()) {
    return DOMPurify.sanitize(html, { ALLOWED_TAGS: [], ALLOWED_ATTR: [] });
  }
  return sanitizeHtmlLib(html, { allowedTags: [], allowedAttributes: {} });
}

export { isValidHexColor } from "./validators";
