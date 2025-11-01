/**
 * Zod schemas for server action input validation
 *
 * These schemas provide runtime validation and type safety for server action inputs.
 * Use the parse* functions to validate FormData and parameters.
 */

import { z } from "zod";

// =============================================================================
// Common Schemas
// =============================================================================

/**
 * UUID schema - validates UUID format
 */
export const UUIDSchema = z.string().uuid("Invalid ID format");

/**
 * Non-empty string schema - validates string is not empty after trimming
 */
export const NonEmptyStringSchema = z.string().min(1, "This field is required");

/**
 * Optional ISO date string schema
 */
export const OptionalDateStringSchema = z.string().datetime().nullable().optional();

// =============================================================================
// Announcement Schemas
// =============================================================================

export const CreateAnnouncementSchema = z.object({
  clubId: UUIDSchema,
  title: NonEmptyStringSchema.max(200, "Title must be 200 characters or less"),
  message: NonEmptyStringSchema.max(5000, "Message must be 5000 characters or less"),
  expiresAt: OptionalDateStringSchema,
});

export const CreateRichAnnouncementSchema = z.object({
  clubId: UUIDSchema,
  title: NonEmptyStringSchema.max(200, "Title must be 200 characters or less"),
  contentHtml: z
    .string()
    .min(1, "Content is required")
    .refine((val) => val !== "<p></p>", "Content is required"),
  imageUrl: z.string().url("Invalid image URL").nullable().optional(),
  imageOpacity: z.coerce.number().min(0).max(1).default(0.3),
  expiresAt: OptionalDateStringSchema,
});

export const UpdateAnnouncementSchema = z.object({
  announcementId: UUIDSchema,
  title: NonEmptyStringSchema.max(200, "Title must be 200 characters or less"),
  message: NonEmptyStringSchema.max(5000, "Message must be 5000 characters or less"),
  expiresAt: OptionalDateStringSchema,
});

export const DeleteAnnouncementSchema = z.object({
  announcementId: UUIDSchema,
});

// =============================================================================
// Discussion Thread Schemas
// =============================================================================

export const ThreadTagTypeSchema = z.enum([
  "movie",
  "actor",
  "director",
  "composer",
  "festival",
  "general",
]);

export const TagInputSchema = z.object({
  tag_type: ThreadTagTypeSchema,
  tmdb_id: z.number().int().positive().nullable().optional(),
  person_tmdb_id: z.number().int().positive().nullable().optional(),
  festival_id: z.string().uuid().nullable().optional(),
});

export const CreateThreadSchema = z.object({
  clubId: UUIDSchema,
  title: NonEmptyStringSchema.max(300, "Title must be 300 characters or less"),
  content: NonEmptyStringSchema.max(50000, "Content must be 50000 characters or less"),
  isSpoiler: z.boolean().default(false),
  tags: z.array(TagInputSchema).max(10, "Maximum 10 tags allowed").optional(),
  // Legacy fields
  threadType: z.enum(["movie", "person", "festival", "custom"]).nullable().optional(),
  tmdbId: z.number().int().positive().nullable().optional(),
  personName: z.string().max(200).nullable().optional(),
  personType: z.enum(["actor", "director", "composer"]).nullable().optional(),
  personTmdbId: z.number().int().positive().nullable().optional(),
  festivalId: z.string().uuid().nullable().optional(),
});

// =============================================================================
// Discussion Comment Schemas
// =============================================================================

export const CreateCommentSchema = z.object({
  threadId: UUIDSchema,
  content: NonEmptyStringSchema.max(20000, "Content must be 20000 characters or less"),
  parentId: z.string().uuid().nullable().optional(),
  isSpoiler: z.boolean().default(false),
});

// =============================================================================
// Feedback Schemas
// =============================================================================

export const FeedbackTypeSchema = z.enum(["bug", "feature"]);

export const AddFeedbackItemSchema = z.object({
  type: FeedbackTypeSchema,
  title: NonEmptyStringSchema.max(200, "Title must be 200 characters or less"),
  description: z
    .string()
    .max(1000, "Description must be 1000 characters or less")
    .nullable()
    .optional(),
});

export const VoteFeedbackSchema = z.object({
  feedbackId: UUIDSchema,
});

// =============================================================================
// Type Exports
// =============================================================================

export type CreateAnnouncementInput = z.infer<typeof CreateAnnouncementSchema>;
export type CreateRichAnnouncementInput = z.infer<typeof CreateRichAnnouncementSchema>;
export type UpdateAnnouncementInput = z.infer<typeof UpdateAnnouncementSchema>;
export type CreateThreadInput = z.infer<typeof CreateThreadSchema>;
export type CreateCommentInput = z.infer<typeof CreateCommentSchema>;
export type AddFeedbackItemInput = z.infer<typeof AddFeedbackItemSchema>;

// =============================================================================
// FormData Parsing Helpers
// =============================================================================

/**
 * Parse FormData to a plain object for validation
 * Handles common type coercions (boolean, number)
 */
function parseFormDataToObject(formData: FormData): Record<string, unknown> {
  const obj: Record<string, unknown> = {};

  formData.forEach((value, key) => {
    // Handle boolean strings
    if (value === "true") {
      obj[key] = true;
    } else if (value === "false") {
      obj[key] = false;
    } else if (value === "") {
      obj[key] = null;
    } else {
      obj[key] = value;
    }
  });

  return obj;
}

/**
 * Parse and validate announcement creation FormData
 */
export function parseCreateAnnouncementFormData(formData: FormData):
  | {
      success: true;
      data: CreateAnnouncementInput;
    }
  | { success: false; error: string } {
  const raw = parseFormDataToObject(formData);
  const result = CreateAnnouncementSchema.safeParse(raw);

  if (!result.success) {
    const firstError = result.error.issues[0];
    return { success: false, error: firstError?.message || "Invalid input" };
  }

  return { success: true, data: result.data };
}

/**
 * Parse and validate rich announcement creation FormData
 */
export function parseCreateRichAnnouncementFormData(formData: FormData):
  | {
      success: true;
      data: CreateRichAnnouncementInput;
    }
  | { success: false; error: string } {
  const raw = parseFormDataToObject(formData);
  const result = CreateRichAnnouncementSchema.safeParse(raw);

  if (!result.success) {
    const firstError = result.error.issues[0];
    return { success: false, error: firstError?.message || "Invalid input" };
  }

  return { success: true, data: result.data };
}

/**
 * Parse and validate thread creation FormData
 */
export function parseCreateThreadFormData(formData: FormData):
  | {
      success: true;
      data: CreateThreadInput;
    }
  | { success: false; error: string } {
  const raw = parseFormDataToObject(formData);

  // Handle tags JSON parsing
  const tagsJson = formData.get("tags") as string | null;
  if (tagsJson) {
    try {
      raw.tags = JSON.parse(tagsJson);
    } catch {
      return { success: false, error: "Invalid tags format" };
    }
  }

  // Handle numeric fields
  const tmdbId = formData.get("tmdbId");
  if (tmdbId && typeof tmdbId === "string") {
    raw.tmdbId = parseInt(tmdbId, 10) || null;
  }

  const personTmdbId = formData.get("personTmdbId");
  if (personTmdbId && typeof personTmdbId === "string") {
    raw.personTmdbId = parseInt(personTmdbId, 10) || null;
  }

  const result = CreateThreadSchema.safeParse(raw);

  if (!result.success) {
    const firstError = result.error.issues[0];
    return { success: false, error: firstError?.message || "Invalid input" };
  }

  return { success: true, data: result.data };
}

/**
 * Parse and validate comment creation FormData
 */
export function parseCreateCommentFormData(formData: FormData):
  | {
      success: true;
      data: CreateCommentInput;
    }
  | { success: false; error: string } {
  const raw = parseFormDataToObject(formData);
  const result = CreateCommentSchema.safeParse(raw);

  if (!result.success) {
    const firstError = result.error.issues[0];
    return { success: false, error: firstError?.message || "Invalid input" };
  }

  return { success: true, data: result.data };
}

/**
 * Parse and validate feedback item FormData
 */
export function parseAddFeedbackItemFormData(formData: FormData):
  | {
      success: true;
      data: AddFeedbackItemInput;
    }
  | { success: false; error: string } {
  const raw = parseFormDataToObject(formData);
  const result = AddFeedbackItemSchema.safeParse(raw);

  if (!result.success) {
    const firstError = result.error.issues[0];
    return { success: false, error: firstError?.message || "Invalid input" };
  }

  return { success: true, data: result.data };
}
