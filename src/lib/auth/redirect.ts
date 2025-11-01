import { cookies } from "next/headers";

const COOKIE_NAME = "post_auth_redirect";
const COOKIE_MAX_AGE = 600; // 10 minutes

/**
 * Validates a redirect path to prevent open redirect attacks.
 * Must start with "/" and not "//" (which browsers treat as protocol-relative URLs).
 */
export function isValidRedirect(path: string): boolean {
  return typeof path === "string" && path.startsWith("/") && !path.startsWith("//");
}

/**
 * Reads and clears the post-auth redirect cookie.
 * Returns the validated redirect path, or "/" if none/invalid.
 */
export async function consumeRedirectCookie(): Promise<string> {
  const cookieStore = await cookies();
  const value = cookieStore.get(COOKIE_NAME)?.value;
  if (value) {
    cookieStore.delete(COOKIE_NAME);
    if (isValidRedirect(value)) {
      return value;
    }
  }
  return "/";
}

/**
 * Sets the post-auth redirect cookie.
 * Used before OAuth/magic link flows that leave the site.
 */
export async function setRedirectCookie(path: string): Promise<void> {
  if (!isValidRedirect(path)) return;
  const cookieStore = await cookies();
  cookieStore.set(COOKIE_NAME, path, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: COOKIE_MAX_AGE,
    path: "/",
  });
}

/**
 * Resolves the redirect destination from formData or cookie.
 * For email/password flows, reads from formData.
 * Falls back to cookie (for OAuth/magic link).
 * Returns "/" if nothing valid is found.
 */
export async function resolveRedirect(formData?: FormData): Promise<string> {
  // Try formData first (email/password flows)
  if (formData) {
    const redirectTo = formData.get("redirectTo") as string | null;
    if (redirectTo && isValidRedirect(redirectTo)) {
      return redirectTo;
    }
  }
  // Fall back to cookie (OAuth/magic link flows)
  return consumeRedirectCookie();
}
