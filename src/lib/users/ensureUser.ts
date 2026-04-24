import { SupabaseClient } from "@supabase/supabase-js";

interface EnsureUserOptions {
  /**
   * If provided, the row is created with this username and
   * `username_auto_derived: false` — the caller collected an explicit
   * handle from the signup form / wizard and we should skip the email-prefix
   * derivation. Must already be validated (lowercase, 3–30 chars, [a-z0-9_]).
   *
   * If the username is already taken we fall back to auto-deriving from the
   * email so the signup still succeeds; the caller is responsible for
   * surfacing the collision to the user if it was meaningful. When undefined
   * we always auto-derive and set `username_auto_derived: true` so the
   * middleware routes the user through /welcome/username (OAuth path).
   */
  desiredUsername?: string;
}

/**
 * Ensures a user exists in the public.users table.
 * Creates the user if they don't exist, otherwise returns existing user.
 *
 * Uses retry logic to handle race conditions on username uniqueness.
 */
export async function ensureUser(
  supabase: SupabaseClient,
  authUserId: string,
  email: string,
  options: EnsureUserOptions = {}
) {
  // Check if user already exists
  const { data: existingUser } = await supabase
    .from("users")
    .select("id")
    .eq("id", authUserId)
    .single();

  if (existingUser) {
    return { user: existingUser, created: false };
  }

  // If the caller provided an explicit username, try it first. On unique-
  // violation we fall through to the auto-derived loop. When no explicit
  // username is given we derive from the email prefix.
  const usernameBase = (email.split("@")[0] || `user_${authUserId.slice(0, 8)}`)
    .toLowerCase()
    .replace(/[^a-z0-9_]/g, "_");

  if (options.desiredUsername) {
    const { data: newUser, error } = await supabase
      .from("users")
      .insert({
        id: authUserId,
        email,
        username: options.desiredUsername,
        display_name: options.desiredUsername,
        username_auto_derived: false,
      })
      .select()
      .single();

    if (!error) {
      return { user: newUser, created: true };
    }

    // Unique id conflict: user was created concurrently by another process.
    if (error.code === "23505" && error.message?.includes("users_pkey")) {
      const { data: user } = await supabase
        .from("users")
        .select("id")
        .eq("id", authUserId)
        .single();
      if (user) {
        return { user, created: false };
      }
    }

    // Unique username conflict: silently fall through to the auto-derivation
    // loop so signup still succeeds. The caller should re-check the username
    // they passed in if they want to show a "taken" error.
    if (!(error.code === "23505" && error.message?.includes("username"))) {
      throw error;
    }
  }

  // Retry loop to handle race conditions on username uniqueness
  const maxAttempts = 10;
  let lastError: Error | null = null;

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const username = attempt === 0 ? usernameBase : `${usernameBase}${attempt}`;

    const { data: newUser, error } = await supabase
      .from("users")
      .insert({
        id: authUserId,
        email,
        username,
        display_name: email.split("@")[0] || "User",
        username_auto_derived: true,
      })
      .select()
      .single();

    if (!error) {
      return { user: newUser, created: true };
    }

    if (error.code === "23505" && error.message?.includes("username")) {
      lastError = new Error(`Username ${username} already taken`);
      continue;
    }

    if (error.code === "23505" && error.message?.includes("users_pkey")) {
      const { data: user } = await supabase
        .from("users")
        .select("id")
        .eq("id", authUserId)
        .single();
      if (user) {
        return { user, created: false };
      }
    }

    throw error;
  }

  throw lastError || new Error("Failed to create user after maximum attempts");
}
