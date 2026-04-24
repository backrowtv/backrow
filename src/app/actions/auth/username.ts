"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { actionRateLimit } from "@/lib/security/action-rate-limit";
import { requireVerifiedEmail } from "@/lib/security/require-verified-email";
import { invalidateUser } from "@/lib/cache/invalidate";
import { USERNAME_CHANGE_COOLDOWN_DAYS, validateUsername } from "./username-validation";

/**
 * Claim an explicit username for an OAuth user who landed in the app with an
 * email-derived handle. Called by the /welcome/username picker.
 * Clears the auto-derived flag so the middleware stops redirecting them.
 */
export async function claimUsername(prevState: unknown, formData: FormData) {
  const rate = await actionRateLimit("claimUsername", { limit: 10, windowMs: 60_000 });
  if (!rate.success) return { error: rate.error };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "You must be signed in to choose a username" };

  const verify = requireVerifiedEmail(user);
  if (!verify.ok) return { error: verify.error };

  const result = validateUsername(formData.get("username") as string | null);
  if (!result.ok) return { error: result.error };
  const { username } = result;

  const { error: updateError } = await supabase
    .from("users")
    .update({
      username,
      username_auto_derived: false,
      username_last_changed_at: new Date().toISOString(),
    })
    .eq("id", user.id);

  if (updateError?.code === "23505" && updateError.message?.includes("username")) {
    return { error: "That username is already taken. Please choose another." };
  }
  if (updateError) return { error: "Could not update username. Please try again." };

  invalidateUser(user.id);
  revalidatePath("/", "layout");
  return { success: true };
}

/**
 * Change username from profile settings. Enforces a 6-month cooldown between
 * changes (tracked via users.username_last_changed_at). Returns a structured
 * error with `nextChangeAt` when the cooldown is active so the UI can show
 * the unlock date.
 */
export async function changeUsername(prevState: unknown, formData: FormData) {
  const rate = await actionRateLimit("changeUsername", { limit: 5, windowMs: 60_000 });
  if (!rate.success) return { error: rate.error };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "You must be signed in to change your username" };

  const verify = requireVerifiedEmail(user);
  if (!verify.ok) return { error: verify.error };

  const result = validateUsername(formData.get("username") as string | null);
  if (!result.ok) return { error: result.error };
  const { username } = result;

  const { data: profile } = await supabase
    .from("users")
    .select("username, username_last_changed_at, username_auto_derived")
    .eq("id", user.id)
    .maybeSingle();

  if (!profile) return { error: "Profile not found" };
  if (profile.username === username) return { error: "That's already your username" };

  // Cooldown applies only to users who have already picked an explicit
  // username before (username_auto_derived has been false at some point and
  // username_last_changed_at has been set). First-time explicit picks —
  // e.g. a user who was flagged as auto-derived and still hasn't chosen —
  // shouldn't be blocked.
  if (profile.username_last_changed_at && !profile.username_auto_derived) {
    const last = new Date(profile.username_last_changed_at);
    const nextChange = new Date(last);
    nextChange.setDate(nextChange.getDate() + USERNAME_CHANGE_COOLDOWN_DAYS);
    if (new Date() < nextChange) {
      return {
        error: `You can change your username again on ${nextChange.toLocaleDateString("en-US", {
          month: "long",
          day: "numeric",
          year: "numeric",
        })}.`,
        nextChangeAt: nextChange.toISOString(),
      };
    }
  }

  const { error: updateError } = await supabase
    .from("users")
    .update({
      username,
      username_auto_derived: false,
      username_last_changed_at: new Date().toISOString(),
    })
    .eq("id", user.id);

  if (updateError?.code === "23505" && updateError.message?.includes("username")) {
    return { error: "That username is already taken. Please choose another." };
  }
  if (updateError) return { error: "Could not update username. Please try again." };

  invalidateUser(user.id);
  revalidatePath("/profile/settings/account");
  return { success: true, username };
}
