/**
 * Maps technical server/database errors to user-friendly messages.
 * Use this when displaying server action errors in toasts.
 */

const ERROR_PATTERNS: [RegExp, string][] = [
  // Database/trigger errors
  [/record "new" has no field/i, "Something went wrong on our end. Please try again."],
  [/violates unique constraint/i, "This item already exists."],
  [
    /violates foreign key constraint/i,
    "A related item was not found. Please refresh and try again.",
  ],
  [/violates not-null constraint/i, "A required field is missing. Please check your input."],
  [/violates check constraint/i, "The value you entered is not valid."],
  [/duplicate key value/i, "This item already exists."],
  [/null value in column/i, "A required field is missing."],

  // RLS / permission errors
  [/new row violates row-level security/i, "You don't have permission to do this."],
  [/permission denied/i, "You don't have permission to do this."],
  [/not authorized/i, "You don't have permission to do this."],

  // Connection / timeout errors
  [/timeout/i, "The request timed out. Please try again."],
  [/network/i, "There was a network issue. Please check your connection."],
  [/fetch failed/i, "Could not reach the server. Please try again."],
  [/ECONNREFUSED/i, "Could not reach the server. Please try again."],

  // Auth errors
  [/not authenticated/i, "Please sign in to continue."],
  [/jwt expired/i, "Your session has expired. Please sign in again."],
  [/invalid token/i, "Your session has expired. Please sign in again."],

  // Rate limiting
  [/rate limit/i, "Too many requests. Please wait a moment and try again."],
  [/too many requests/i, "Too many requests. Please wait a moment and try again."],
];

/**
 * Convert a technical error message into a user-friendly one.
 * If no pattern matches, returns a generic fallback.
 */
export function friendlyError(error: string | undefined | null, fallback?: string): string {
  if (!error) return fallback || "Something went wrong. Please try again.";

  for (const [pattern, message] of ERROR_PATTERNS) {
    if (pattern.test(error)) return message;
  }

  // If the error is already short and doesn't look technical, pass it through
  if (error.length < 80 && !/[_{}()=]|column|constraint|relation|trigger|function/i.test(error)) {
    return error;
  }

  return fallback || "Something went wrong. Please try again.";
}
