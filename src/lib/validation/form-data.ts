/**
 * FormData Validation Utilities
 *
 * Type-safe helpers for extracting and validating form data values.
 * These replace unsafe `formData.get() as string` patterns with proper
 * runtime validation.
 */

/**
 * Error thrown when a required form field is missing or invalid
 */
export class FormFieldError extends Error {
  constructor(fieldName: string, message: string) {
    super(`Form field "${fieldName}": ${message}`)
    this.name = 'FormFieldError'
  }
}

/**
 * Get a required string field from FormData.
 * Throws FormFieldError if the field is missing or empty.
 *
 * @example
 * const name = getRequiredString(formData, 'name')
 */
export function getRequiredString(formData: FormData, fieldName: string): string {
  const value = formData.get(fieldName)

  if (value === null || value === undefined) {
    throw new FormFieldError(fieldName, 'Field is required')
  }

  if (typeof value !== 'string') {
    throw new FormFieldError(fieldName, 'Expected string value')
  }

  const trimmed = value.trim()
  if (trimmed === '') {
    throw new FormFieldError(fieldName, 'Field cannot be empty')
  }

  return trimmed
}

/**
 * Get an optional string field from FormData.
 * Returns null if the field is missing or empty.
 *
 * @example
 * const description = getOptionalString(formData, 'description')
 */
export function getOptionalString(formData: FormData, fieldName: string): string | null {
  const value = formData.get(fieldName)

  if (value === null || value === undefined) {
    return null
  }

  if (typeof value !== 'string') {
    return null
  }

  const trimmed = value.trim()
  return trimmed === '' ? null : trimmed
}

/**
 * Get a required number field from FormData.
 * Throws FormFieldError if the field is missing or not a valid number.
 *
 * @example
 * const count = getRequiredNumber(formData, 'count')
 */
export function getRequiredNumber(formData: FormData, fieldName: string): number {
  const value = formData.get(fieldName)

  if (value === null || value === undefined) {
    throw new FormFieldError(fieldName, 'Field is required')
  }

  if (typeof value !== 'string') {
    throw new FormFieldError(fieldName, 'Expected string value')
  }

  const num = Number(value)
  if (isNaN(num)) {
    throw new FormFieldError(fieldName, 'Expected a valid number')
  }

  return num
}

/**
 * Get an optional number field from FormData.
 * Returns null if the field is missing or not a valid number.
 *
 * @example
 * const limit = getOptionalNumber(formData, 'limit')
 */
export function getOptionalNumber(formData: FormData, fieldName: string): number | null {
  const value = formData.get(fieldName)

  if (value === null || value === undefined) {
    return null
  }

  if (typeof value !== 'string' || value.trim() === '') {
    return null
  }

  const num = Number(value)
  return isNaN(num) ? null : num
}

/**
 * Get a boolean field from FormData.
 * Treats 'true', '1', 'on', 'yes' as true.
 * Returns false for all other values or if missing.
 *
 * @example
 * const isEnabled = getBoolean(formData, 'enabled')
 */
export function getBoolean(formData: FormData, fieldName: string): boolean {
  const value = formData.get(fieldName)

  if (value === null || value === undefined) {
    return false
  }

  if (typeof value !== 'string') {
    return false
  }

  const lower = value.toLowerCase().trim()
  return lower === 'true' || lower === '1' || lower === 'on' || lower === 'yes'
}

/**
 * Get an optional boolean field from FormData.
 * Returns null if the field is missing.
 * Treats 'true', '1', 'on', 'yes' as true.
 * Treats 'false', '0', 'off', 'no' as false.
 *
 * @example
 * const isEnabled = getOptionalBoolean(formData, 'enabled')
 */
export function getOptionalBoolean(formData: FormData, fieldName: string): boolean | null {
  const value = formData.get(fieldName)

  if (value === null || value === undefined) {
    return null
  }

  if (typeof value !== 'string' || value.trim() === '') {
    return null
  }

  const lower = value.toLowerCase().trim()

  if (lower === 'true' || lower === '1' || lower === 'on' || lower === 'yes') {
    return true
  }

  if (lower === 'false' || lower === '0' || lower === 'off' || lower === 'no') {
    return false
  }

  return null
}

/**
 * Get a JSON-parsed field from FormData.
 * Returns null if the field is missing, empty, or invalid JSON.
 *
 * @example
 * const tags = getJsonField<string[]>(formData, 'tags')
 */
export function getJsonField<T>(formData: FormData, fieldName: string): T | null {
  const value = formData.get(fieldName)

  if (value === null || value === undefined) {
    return null
  }

  if (typeof value !== 'string' || value.trim() === '') {
    return null
  }

  try {
    return JSON.parse(value) as T
  } catch {
    return null
  }
}

/**
 * Get a required JSON-parsed field from FormData.
 * Throws FormFieldError if the field is missing or invalid JSON.
 *
 * @example
 * const tags = getRequiredJsonField<string[]>(formData, 'tags')
 */
export function getRequiredJsonField<T>(formData: FormData, fieldName: string): T {
  const value = formData.get(fieldName)

  if (value === null || value === undefined) {
    throw new FormFieldError(fieldName, 'Field is required')
  }

  if (typeof value !== 'string') {
    throw new FormFieldError(fieldName, 'Expected string value')
  }

  if (value.trim() === '') {
    throw new FormFieldError(fieldName, 'Field cannot be empty')
  }

  try {
    return JSON.parse(value) as T
  } catch {
    throw new FormFieldError(fieldName, 'Invalid JSON format')
  }
}

/**
 * Get an enum field from FormData.
 * Returns null if the field is missing or not a valid enum value.
 *
 * @example
 * const role = getEnumField(formData, 'role', ['admin', 'user', 'guest'] as const)
 */
export function getEnumField<T extends readonly string[]>(
  formData: FormData,
  fieldName: string,
  validValues: T
): T[number] | null {
  const value = getOptionalString(formData, fieldName)

  if (value === null) {
    return null
  }

  if (validValues.includes(value)) {
    return value as T[number]
  }

  return null
}

/**
 * Get a required enum field from FormData.
 * Throws FormFieldError if the field is missing or not a valid enum value.
 *
 * @example
 * const role = getRequiredEnumField(formData, 'role', ['admin', 'user', 'guest'] as const)
 */
export function getRequiredEnumField<T extends readonly string[]>(
  formData: FormData,
  fieldName: string,
  validValues: T
): T[number] {
  const value = getRequiredString(formData, fieldName)

  if (!validValues.includes(value)) {
    throw new FormFieldError(fieldName, `Must be one of: ${validValues.join(', ')}`)
  }

  return value as T[number]
}
