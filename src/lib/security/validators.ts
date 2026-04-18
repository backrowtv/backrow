/**
 * Pure-regex security validators.
 *
 * Lives in its own module (no DOMPurify/jsdom import) so callers can validate
 * user input from server render paths without pulling `isomorphic-dompurify`
 * → `jsdom` into the server bundle.
 */

/**
 * Validates that a string is a valid 6-character hex color.
 * Prevents CSS injection when interpolating colors into <style> tags.
 *
 * @example
 * isValidHexColor('#FF5500') // true
 * isValidHexColor('#fff') // false (must be 6 chars)
 * isValidHexColor('red') // false
 * isValidHexColor('#FF5500</style><script>') // false
 */
export function isValidHexColor(color: string): boolean {
  if (!color) return false;
  return /^#[0-9A-Fa-f]{6}$/.test(color);
}
