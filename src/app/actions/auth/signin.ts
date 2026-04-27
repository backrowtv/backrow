"use server";

/**
 * Sign In Actions
 *
 * Functions for signing in users via various methods.
 */

import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { ensureUser } from "@/lib/users/ensureUser";
import { actionRateLimit } from "@/lib/security/action-rate-limit";
import { isValidEmail } from "@/lib/security/validators";
import { resolveRedirect, setRedirectCookie } from "@/lib/auth/redirect";
import { authCallbackUrl } from "@/lib/seo/absolute-url";

export async function signIn(prevState: unknown, formData: FormData) {
  const rateCheck = await actionRateLimit("signIn", { limit: 5, windowMs: 60_000 });
  if (!rateCheck.success) return { error: rateCheck.error };

  const supabase = await createClient();

  const email = formData.get("email") as string;
  const password = formData.get("password") as string;

  // Validate inputs
  if (!email || !password) {
    return { error: "Email and password are required" };
  }

  const { data: signInData, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) {
    // Check if error is due to email not being verified
    if (error.message?.includes("email") && error.message?.includes("confirm")) {
      return {
        error:
          'Please verify your email address before signing in. Check your inbox for the verification email, or click "Resend verification email" if you need a new one.',
        needsVerification: true,
      };
    }
    return { error: error.message };
  }

  // Ensure user exists in public.users table (for users created before this fix)
  if (signInData.user) {
    try {
      await ensureUser(supabase, signInData.user.id, email);
    } catch (userError) {
      // Log error but don't fail signin
      console.error("Failed to ensure user profile:", userError);
    }
  }

  // Resolve redirect destination from form data
  const destination = await resolveRedirect(formData);

  // Revalidate and redirect
  // Note: redirect() throws, so this never returns normally
  revalidatePath("/", "layout");
  redirect(destination);
}

// Test helper: Quick sign in for testing (dev only)
export async function signInTestUser(prevState: unknown, formData: FormData) {
  // Only allow in development
  if (process.env.NODE_ENV === "production") {
    return { error: "Test sign-in is only available in development" };
  }

  // Additional check: require feature flag
  if (process.env.NEXT_PUBLIC_ENABLE_TEST_AUTH !== "true") {
    return { error: "Test auth is disabled. Set NEXT_PUBLIC_ENABLE_TEST_AUTH=true to enable." };
  }

  const supabase = await createClient();

  const email = formData.get("email") as string;
  const password = formData.get("password") as string;

  if (!email || !password) {
    return { error: "Email and password are required" };
  }

  const { data: signInData, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) {
    return { error: error.message };
  }

  // Ensure user exists in public.users table
  if (signInData.user) {
    try {
      await ensureUser(supabase, signInData.user.id, email);
    } catch (userError) {
      console.error("Failed to ensure user profile:", userError);
    }
  }

  revalidatePath("/", "layout");
  return { success: true, message: `Signed in as ${email}` };
}

export async function signInWithMagicLink(prevState: unknown, formData: FormData) {
  const rateCheck = await actionRateLimit("magicLink", { limit: 5, windowMs: 60_000 });
  if (!rateCheck.success) return { error: rateCheck.error };

  const supabase = await createClient();

  const email = formData.get("email") as string;

  // Validate input
  if (!email) {
    return { error: "Email is required" };
  }

  if (!isValidEmail(email)) {
    return { error: "Please enter a valid email address" };
  }

  // Store redirect destination in cookie (cookie survives magic-link click on
  // the same device) AND pass it through `next=` on the callback URL (survives
  // cross-device clicks). Callback prefers `next=` when valid.
  const postAuthRedirect = formData.get("redirectTo") as string | null;
  if (postAuthRedirect) {
    await setRedirectCookie(postAuthRedirect);
  }

  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: {
      emailRedirectTo: authCallbackUrl(postAuthRedirect),
    },
  });

  if (error) {
    return { error: error.message };
  }

  // Always return success message (don't reveal if email exists)
  return {
    success: true,
    message: "Check your email for a magic link to sign in. The link will expire in 1 hour.",
  };
}

export async function signOut() {
  const supabase = await createClient();

  const { error } = await supabase.auth.signOut();

  if (error) {
    // For sign out, we'll still redirect even on error
    // but log it for debugging
    console.error("Sign out error:", error);
  }

  // Revalidate and redirect
  // Note: redirect() throws, so this never returns normally
  revalidatePath("/", "layout");
  redirect("/");
}

// Test helper: Sign out without redirect (dev only)
export async function signOutTest() {
  // Only allow in development
  if (process.env.NODE_ENV === "production") {
    return { error: "Test sign-out is only available in development" };
  }

  // Additional check: require feature flag
  if (process.env.NEXT_PUBLIC_ENABLE_TEST_AUTH !== "true") {
    return { error: "Test auth is disabled. Set NEXT_PUBLIC_ENABLE_TEST_AUTH=true to enable." };
  }

  const supabase = await createClient();

  const { error } = await supabase.auth.signOut();

  if (error) {
    return { error: error.message };
  }

  revalidatePath("/", "layout");
  return { success: true, message: "Signed out successfully" };
}
