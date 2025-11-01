/**
 * Validation Utilities
 *
 * Type-safe validation helpers for form data and JSON parsing.
 */

// FormData validation
export {
  FormFieldError,
  getRequiredString,
  getOptionalString,
  getRequiredNumber,
  getOptionalNumber,
  getBoolean,
  getOptionalBoolean,
  getJsonField,
  getRequiredJsonField,
  getEnumField,
  getRequiredEnumField,
} from './form-data'

// JSON parsing
export {
  safeJsonParse,
  safeJsonParseOrNull,
  safeJsonParseWithValidator,
  isArrayOf,
  isString,
  isNumber,
  isBoolean,
  isRecord,
  parseLocalStorageJson,
  setLocalStorageJson,
} from './json'
