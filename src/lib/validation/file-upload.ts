/**
 * File Upload Validation Utilities
 *
 * Centralized file validation for uploads across the application.
 * Ensures consistent file size limits, type checking, and HEIC support.
 */

/**
 * Allowed image MIME types
 * Note: HEIC/HEIF are included for iPhone photo compatibility
 */
export const IMAGE_MIME_TYPES = [
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/gif',
  'image/webp',
  'image/heic',
  'image/heif',
] as const

/**
 * Allowed image file extensions
 */
export const IMAGE_EXTENSIONS = [
  '.jpg',
  '.jpeg',
  '.png',
  '.gif',
  '.webp',
  '.heic',
  '.heif',
] as const

/**
 * File upload configuration by context
 * Different contexts may have different size limits
 */
export const FILE_UPLOAD_CONFIG = {
  /** Club avatar, background, or picture uploads */
  club: {
    maxSizeBytes: 15 * 1024 * 1024, // 15MB
    maxSizeMB: 15,
    allowedTypes: IMAGE_MIME_TYPES,
    allowedExtensions: IMAGE_EXTENSIONS,
  },
  /** User avatar uploads */
  avatar: {
    maxSizeBytes: 15 * 1024 * 1024, // 15MB
    maxSizeMB: 15,
    allowedTypes: IMAGE_MIME_TYPES,
    allowedExtensions: IMAGE_EXTENSIONS,
  },
  /** Announcement image uploads (smaller limit) */
  announcement: {
    maxSizeBytes: 5 * 1024 * 1024, // 5MB
    maxSizeMB: 5,
    allowedTypes: IMAGE_MIME_TYPES,
    allowedExtensions: IMAGE_EXTENSIONS,
  },
  /** Background image uploads (smaller limit) */
  background: {
    maxSizeBytes: 5 * 1024 * 1024, // 5MB
    maxSizeMB: 5,
    allowedTypes: IMAGE_MIME_TYPES,
    allowedExtensions: IMAGE_EXTENSIONS,
  },
  /** Festival poster uploads */
  festival: {
    maxSizeBytes: 15 * 1024 * 1024, // 15MB
    maxSizeMB: 15,
    allowedTypes: IMAGE_MIME_TYPES,
    allowedExtensions: IMAGE_EXTENSIONS,
  },
} as const

export type FileUploadContext = keyof typeof FILE_UPLOAD_CONFIG

export interface FileValidationResult {
  valid: boolean
  error?: string
}

/**
 * Validates a file for upload
 *
 * @param file - The file to validate
 * @param context - The upload context (determines size limits)
 * @returns Validation result with error message if invalid
 */
export function validateFileUpload(
  file: File,
  context: FileUploadContext = 'club'
): FileValidationResult {
  const config = FILE_UPLOAD_CONFIG[context]

  // Check file size
  if (file.size > config.maxSizeBytes) {
    return {
      valid: false,
      error: `File size must be less than ${config.maxSizeMB}MB`,
    }
  }

  // Check file type - some browsers don't set MIME type correctly (especially HEIC)
  // So we check both MIME type AND file extension, accepting if either is valid
  const allowedTypes = config.allowedTypes as readonly string[]
  const hasValidMimeType = file.type && allowedTypes.includes(file.type.toLowerCase())

  const fileName = file.name.toLowerCase()
  const allowedExtensions = config.allowedExtensions as readonly string[]
  const hasValidExtension = allowedExtensions.some((ext) =>
    fileName.endsWith(ext)
  )

  // Accept if EITHER mime type OR extension is valid
  // This handles browsers that don't correctly report HEIC/HEIF mime types
  if (!hasValidMimeType && !hasValidExtension) {
    return {
      valid: false,
      error: 'File must be an image (JPEG, PNG, GIF, WebP, or HEIC)',
    }
  }

  return { valid: true }
}

/**
 * Checks if a file is a valid image type (without size check)
 * Useful for quick type validation before upload
 */
export function isValidImageType(file: File): boolean {
  const allowedTypes = IMAGE_MIME_TYPES as readonly string[]
  return allowedTypes.includes(file.type)
}

/**
 * Gets human-readable allowed file types string
 */
export function getAllowedTypesString(): string {
  return 'JPEG, PNG, GIF, WebP, or HEIC'
}

/**
 * Gets the max file size for a context in human-readable format
 */
export function getMaxFileSizeString(context: FileUploadContext = 'club'): string {
  return `${FILE_UPLOAD_CONFIG[context].maxSizeMB}MB`
}
