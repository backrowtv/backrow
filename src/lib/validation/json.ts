/**
 * Safe JSON Parsing Utilities
 *
 * Type-safe helpers for parsing JSON strings with proper error handling.
 * These replace unsafe `JSON.parse()` calls with fallback support.
 */

/**
 * Safely parse a JSON string with a fallback value.
 * Returns the fallback if the input is null, undefined, empty, or invalid JSON.
 *
 * @example
 * const settings = safeJsonParse<Settings>(jsonString, defaultSettings)
 */
export function safeJsonParse<T>(value: string | null | undefined, fallback: T): T {
  if (value === null || value === undefined || value.trim() === '') {
    return fallback
  }

  try {
    return JSON.parse(value) as T
  } catch {
    return fallback
  }
}

/**
 * Safely parse a JSON string, returning null on failure.
 *
 * @example
 * const data = safeJsonParseOrNull<UserData>(jsonString)
 * if (data) {
 *   // use data
 * }
 */
export function safeJsonParseOrNull<T>(value: string | null | undefined): T | null {
  if (value === null || value === undefined || value.trim() === '') {
    return null
  }

  try {
    return JSON.parse(value) as T
  } catch {
    return null
  }
}

/**
 * Safely parse a JSON string with validation.
 * Returns the parsed value only if it passes the validator function.
 *
 * @example
 * const count = safeJsonParseWithValidator(
 *   jsonString,
 *   (v): v is number => typeof v === 'number' && v >= 0,
 *   0
 * )
 */
export function safeJsonParseWithValidator<T>(
  value: string | null | undefined,
  validator: (parsed: unknown) => parsed is T,
  fallback: T
): T {
  if (value === null || value === undefined || value.trim() === '') {
    return fallback
  }

  try {
    const parsed = JSON.parse(value)
    return validator(parsed) ? parsed : fallback
  } catch {
    return fallback
  }
}

/**
 * Type guard for checking if a value is an array of a specific type.
 *
 * @example
 * const isStringArray = isArrayOf<string>((item): item is string => typeof item === 'string')
 * const strings = safeJsonParseWithValidator(json, isStringArray, [])
 */
export function isArrayOf<T>(
  itemValidator: (item: unknown) => item is T
): (value: unknown) => value is T[] {
  return (value): value is T[] => {
    if (!Array.isArray(value)) {
      return false
    }
    return value.every(itemValidator)
  }
}

/**
 * Type guard for checking if a value is a string.
 */
export function isString(value: unknown): value is string {
  return typeof value === 'string'
}

/**
 * Type guard for checking if a value is a number.
 */
export function isNumber(value: unknown): value is number {
  return typeof value === 'number' && !isNaN(value)
}

/**
 * Type guard for checking if a value is a boolean.
 */
export function isBoolean(value: unknown): value is boolean {
  return typeof value === 'boolean'
}

/**
 * Type guard for checking if a value is a record/object.
 */
export function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

/**
 * Parse JSON from localStorage with fallback.
 * Handles all localStorage edge cases (null, invalid JSON, SSR).
 *
 * @example
 * const prefs = parseLocalStorageJson<UserPrefs>('userPrefs', defaultPrefs)
 */
export function parseLocalStorageJson<T>(key: string, fallback: T): T {
  if (typeof window === 'undefined') {
    return fallback
  }

  try {
    const value = localStorage.getItem(key)
    return safeJsonParse(value, fallback)
  } catch {
    // localStorage access can fail in private browsing mode
    return fallback
  }
}

/**
 * Safely store JSON to localStorage.
 * Returns true if successful, false if failed.
 *
 * @example
 * const success = setLocalStorageJson('userPrefs', prefs)
 */
export function setLocalStorageJson<T>(key: string, value: T): boolean {
  if (typeof window === 'undefined') {
    return false
  }

  try {
    localStorage.setItem(key, JSON.stringify(value))
    return true
  } catch {
    // localStorage can fail if quota exceeded or in private browsing
    return false
  }
}
