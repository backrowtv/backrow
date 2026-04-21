"use server";

/**
 * Account Management Actions
 *
 * Functions for managing user account settings (email).
 *
 * Account deletion is handled by POST /api/account/delete (soft-delete +
 * 30-day grace + async hard-delete job). Do not re-add a deletion server
 * action here — the lifecycle lives in src/app/api/account/delete/route.ts
 * and src/lib/jobs/handlers/account-hard-delete.ts.
 */

import { createClient } from "@/lib/supabase/server";
import { authCallbackUrl } from "@/lib/seo/absolute-url";

export async function changeEmail(prevState: unknown, formData: FormData) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { error: "You must be signed in to change your email" };
  }

  const newEmail = formData.get("newEmail") as string;

  // Validate input
  if (!newEmail) {
    return { error: "Email is required" };
  }

  // Validate email format
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(newEmail)) {
    return { error: "Please enter a valid email address" };
  }

  // Check if email is the same as current
  if (newEmail.toLowerCase() === user.email?.toLowerCase()) {
    return { error: "New email must be different from your current email" };
  }

  // Update email - Supabase will send confirmation email to the new address
  const { error: updateError } = await supabase.auth.updateUser(
    {
      email: newEmail,
    },
    {
      emailRedirectTo: authCallbackUrl(),
    }
  );

  if (updateError) {
    // Handle common errors
    if (
      updateError.message?.includes("already registered") ||
      updateError.message?.includes("already in use")
    ) {
      return { error: "This email address is already in use by another account" };
    }
    return { error: updateError.message || "Failed to change email" };
  }

  return {
    success: true,
    message:
      "A confirmation email has been sent to your new email address. Please check your inbox and click the link to confirm the change.",
  };
}
