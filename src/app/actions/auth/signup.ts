"use server";

/**
 * Sign Up Actions
 *
 * Functions for user registration.
 */

import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { ensureUser } from "@/lib/users/ensureUser";
import { autoJoinFeaturedClub } from "@/lib/users/autoJoinFeatured";
import { actionRateLimit } from "@/lib/security/action-rate-limit";
import { sendEmail } from "@/lib/email/resend";
import { welcomeEmailHtml } from "@/lib/email/templates/render";
import { isValidRedirect } from "@/lib/auth/redirect";
import { authCallbackUrl } from "@/lib/seo/absolute-url";

/**
 * Resend the signup confirmation email. Called from the /sign-up/confirm page
 * when the user didn't receive / can't find the original email. Re-encodes the
 * `next` destination the same way `signUp` did so the resent link also lands
 * the user on the invite / original target after verification.
 */
export async function resendSignUpConfirmation(prevState: unknown, formData: FormData) {
  const rateCheck = await actionRateLimit("resendSignUpConfirmation", {
    limit: 3,
    windowMs: 60_000,
  });
  if (!rateCheck.success) return { error: rateCheck.error };

  const email = formData.get("email") as string;
  const nextRaw = formData.get("next") as string | null;
  const next = nextRaw && isValidRedirect(nextRaw) ? nextRaw : null;

  if (!email) return { error: "Email is required" };

  const supabase = await createClient();
  const { error } = await supabase.auth.resend({
    type: "signup",
    email,
    options: { emailRedirectTo: authCallbackUrl(next) },
  });

  if (error) return { error: error.message };
  return { success: true, message: "Confirmation email sent. Check your inbox." };
}

export async function signUp(prevState: unknown, formData: FormData) {
  const rateCheck = await actionRateLimit("signUp", { limit: 5, windowMs: 60_000 });
  if (!rateCheck.success) return { error: rateCheck.error };

  const supabase = await createClient();

  const email = formData.get("email") as string;
  const password = formData.get("password") as string;
  const username = formData.get("username") as string | null;
  const redirectToRaw = formData.get("redirectTo") as string | null;
  const redirectTo = redirectToRaw && isValidRedirect(redirectToRaw) ? redirectToRaw : null;

  // Validate inputs
  if (!email || !password) {
    return { error: "Email and password are required" };
  }

  // Validate username
  if (username) {
    if (username.length < 3) {
      return { error: "Username must be at least 3 characters" };
    }
    if (!/^[a-z0-9_]+$/.test(username)) {
      return { error: "Username can only contain lowercase letters, numbers, and underscores" };
    }
  }

  if (password.length < 8) {
    return { error: "Password must be at least 8 characters" };
  }

  // Validate password strength requirements
  const hasUppercase = /[A-Z]/.test(password);
  const hasNumber = /[0-9]/.test(password);
  const hasSpecialChar = /[^A-Za-z0-9]/.test(password);

  if (!hasUppercase || !hasNumber || !hasSpecialChar) {
    return {
      error:
        "Password must contain at least one uppercase letter, one number, and one special character",
    };
  }

  const { data: signUpData, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      emailRedirectTo: authCallbackUrl(redirectTo),
      // Allow unverified emails for development
      data: {
        email_verified: false,
      },
    },
  });

  if (error) {
    return { error: error.message };
  }

  // Supabase's anti-enumeration path: when `signUp()` is called with an email
  // that already exists AND is already confirmed, it returns a success-looking
  // response with `user.identities = []` and does NOT send a new email. Without
  // this check the user would be redirected to /sign-up/confirm and wait forever.
  // Existing unconfirmed accounts still have `identities.length > 0` and Supabase
  // re-sends the confirmation email, so that path is preserved below.
  if (signUpData.user && signUpData.user.identities?.length === 0) {
    return {
      error: "An account with this email already exists. Please sign in instead.",
      alreadyExists: true,
    };
  }

  // Create user in public.users table if signup was successful
  if (signUpData.user) {
    try {
      // Pass the explicit username (if provided and valid) into ensureUser so
      // it's written atomically with `username_auto_derived: false`. Previously
      // we did this as a two-step insert + update, but the update ran before
      // the auth session was fully established and was silently no-op'd by
      // RLS for some users, leaving them flagged as auto-derived and forcing
      // them through /welcome/username even though they had picked a handle.
      const desiredUsername =
        username && username.length >= 3 && /^[a-z0-9_]+$/.test(username) ? username : undefined;

      // Pre-check: if the desired username is already taken, surface that
      // immediately instead of silently falling back to an auto-derived one.
      if (desiredUsername) {
        const { data: taken } = await supabase
          .from("users")
          .select("id")
          .eq("username", desiredUsername)
          .maybeSingle();
        if (taken) {
          return { error: "That username is already taken. Please choose another." };
        }
      }

      await ensureUser(supabase, signUpData.user.id, email, { desiredUsername });

      // Send welcome email (fire-and-forget)
      welcomeEmailHtml({ userName: username || undefined })
        .then((html) => sendEmail({ to: email, subject: "Welcome to BackRow!", html }))
        .catch((err) => console.error("Welcome email failed:", err));

      await autoJoinFeaturedClub(supabase, signUpData.user.id);
    } catch (userError) {
      // Log error but don't fail signup - user can still sign in
      console.error("Failed to create user profile:", userError);
    }
  }

  // Signup requires email confirmation: send the user to a "check your email"
  // screen rather than their original destination. The confirmation link itself
  // carries `?next=<redirectTo>` (via `emailRedirectTo` above), so clicking it
  // lands back on the invite / wherever the user was going.
  revalidatePath("/", "layout");
  const confirmParams = new URLSearchParams({ email });
  if (redirectTo) confirmParams.set("next", redirectTo);
  redirect(`/sign-up/confirm?${confirmParams.toString()}`);
}
