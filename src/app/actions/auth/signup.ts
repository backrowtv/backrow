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
import { actionRateLimit } from "@/lib/security/action-rate-limit";
import { requireHuman } from "@/lib/security/botid";
import { sendEmail } from "@/lib/email/resend";
import { welcomeEmailHtml } from "@/lib/email/templates/render";
import { resolveRedirect } from "@/lib/auth/redirect";

export async function signUp(prevState: unknown, formData: FormData) {
  const rateCheck = await actionRateLimit("signUp", { limit: 5, windowMs: 60_000 });
  if (!rateCheck.success) return { error: rateCheck.error };

  const human = await requireHuman();
  if (!human.ok) return { error: human.error };

  const supabase = await createClient();

  const email = formData.get("email") as string;
  const password = formData.get("password") as string;
  const username = formData.get("username") as string | null;

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
      emailRedirectTo: `${process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000"}/auth/callback`,
      // Allow unverified emails for development
      data: {
        email_verified: false,
      },
    },
  });

  if (error) {
    return { error: error.message };
  }

  // Create user in public.users table if signup was successful
  if (signUpData.user) {
    try {
      // First ensure user exists (creates basic profile)
      await ensureUser(supabase, signUpData.user.id, email);

      // Send welcome email (fire-and-forget)
      welcomeEmailHtml({ userName: username || undefined })
        .then((html) => sendEmail({ to: email, subject: "Welcome to BackRow!", html }))
        .catch((err) => console.error("Welcome email failed:", err));

      // Update username if provided
      if (username && username.length >= 3) {
        const { error: updateError } = await supabase
          .from("users")
          .update({ username })
          .eq("id", signUpData.user.id);

        if (updateError?.code === "23505" && updateError.message?.includes("username")) {
          return { error: "That username is already taken. Please choose another." };
        }
      }

      // Auto-join BackRow Featured club
      const { data: featuredClub } = await supabase
        .from("clubs")
        .select("id")
        .eq("slug", "backrow-featured")
        .single();

      if (featuredClub) {
        await supabase
          .from("club_members")
          .upsert(
            { club_id: featuredClub.id, user_id: signUpData.user.id, role: "critic" },
            { onConflict: "club_id,user_id" }
          );
      }
    } catch (userError) {
      // Log error but don't fail signup - user can still sign in
      console.error("Failed to create user profile:", userError);
    }
  }

  // Resolve redirect destination from form data
  const destination = await resolveRedirect(formData);

  // Revalidate and redirect
  // Note: redirect() throws, so this never returns normally
  revalidatePath("/", "layout");
  redirect(destination);
}
