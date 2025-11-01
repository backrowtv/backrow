/**
 * Merges preference values with a three-level fallback: incoming → current → default.
 * Eliminates repetitive `incoming.x ?? current.x ?? default` chains.
 *
 * Each key in `defaults` defines the shape. For each key:
 * 1. Use the value from `incoming` if present and not nullish
 * 2. Fall back to the value from `current` if present and not nullish
 * 3. Fall back to the default value
 */
export function mergePreferences<T extends Record<string, unknown>>(
  incoming: Partial<T> | Record<string, unknown> | undefined | null,
  current: Partial<T> | Record<string, unknown> | undefined | null,
  defaults: T
): T {
  const result = {} as T;
  for (const key in defaults) {
    const incomingVal = incoming?.[key];
    const currentVal = current?.[key];
    (result as Record<string, unknown>)[key] = incomingVal ?? currentVal ?? defaults[key];
  }
  return result;
}

/**
 * Like mergePreferences but with a key mapping for camelCase → snake_case conversion.
 * Each entry in `mapping` is [snakeKey, camelKey, defaultValue].
 *
 * incoming uses camelCase keys, current/output use snake_case keys.
 */
export function mergePreferencesMapped(
  incoming: Record<string, unknown> | undefined | null,
  current: Record<string, unknown> | undefined | null,
  mapping: ReadonlyArray<readonly [string, string, unknown]>
): Record<string, unknown> {
  const result: Record<string, unknown> = {};
  for (const [snakeKey, camelKey, defaultVal] of mapping) {
    result[snakeKey] = incoming?.[camelKey] ?? current?.[snakeKey] ?? defaultVal;
  }
  return result;
}
