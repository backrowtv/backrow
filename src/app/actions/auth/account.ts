"use server";

/**
 * Account Management Actions
 *
 * Functions for managing user account settings (email, deletion).
 */

import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { handleActionError } from "@/lib/errors/handler";

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
      emailRedirectTo: `${process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000"}/auth/callback`,
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

export async function deleteAccount() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { error: "You must be signed in to delete your account" };
  }

  // Check if user owns any clubs (producer)
  const { data: ownedClubs, error: clubsError } = await supabase
    .from("clubs")
    .select("id, name")
    .eq("producer_id", user.id)
    .limit(1);

  if (clubsError) {
    return handleActionError(clubsError, "deleteAccount");
  }

  if (ownedClubs && ownedClubs.length > 0) {
    return {
      error: `You cannot delete your account because you own the club "${ownedClubs[0]?.name}". Please transfer ownership or archive the club first.`,
    };
  }

  // Delete user data from database tables
  // Note: Most tables have ON DELETE SET NULL, but we'll clean up explicitly where needed

  // Delete from club_members (composite PK, needs explicit delete)
  const { error: membersError } = await supabase
    .from("club_members")
    .delete()
    .eq("user_id", user.id);

  if (membersError) {
    handleActionError(membersError, { action: "deleteAccount", silent: true });
  }

  // Delete from generic_ratings (composite PK, needs explicit delete)
  const { error: ratingsError } = await supabase
    .from("generic_ratings")
    .delete()
    .eq("user_id", user.id);

  if (ratingsError) {
    handleActionError(ratingsError, { action: "deleteAccount", silent: true });
  }

  // Delete from subscriptions if exists
  const { error: subsError } = await supabase.from("subscriptions").delete().eq("user_id", user.id);

  if (subsError) {
    handleActionError(subsError, { action: "deleteAccount", silent: true });
  }

  // Delete from theme_pool
  const { error: themesError } = await supabase.from("theme_pool").delete().eq("added_by", user.id);

  if (themesError) {
    handleActionError(themesError, { action: "deleteAccount", silent: true });
  }

  // Delete from nomination_guesses
  const { error: guessesError } = await supabase
    .from("nomination_guesses")
    .delete()
    .eq("user_id", user.id);

  if (guessesError) {
    handleActionError(guessesError, { action: "deleteAccount", silent: true });
  }

  // Delete from blocked_users (both as blocker and blocked)
  const { error: blockedError } = await supabase
    .from("blocked_users")
    .delete()
    .or(`blocked_by.eq.${user.id},user_id.eq.${user.id}`);

  if (blockedError) {
    handleActionError(blockedError, { action: "deleteAccount", silent: true });
  }

  // Delete from club_notes
  const { error: notesError } = await supabase.from("club_notes").delete().eq("user_id", user.id);

  if (notesError) {
    handleActionError(notesError, { action: "deleteAccount", silent: true });
  }

  // Delete the user from public.users table
  const { error: deleteUserError } = await supabase.from("users").delete().eq("id", user.id);

  if (deleteUserError) {
    return handleActionError(deleteUserError, "deleteAccount");
  }

  // Sign out the user
  await supabase.auth.signOut();

  // Revalidate and redirect
  revalidatePath("/", "layout");
  redirect("/");

  // Note: The auth user record in Supabase Auth will remain but cannot sign in
  // since the public.users record is deleted. To fully delete the auth user,
  // you would need to use the Supabase Admin API with a service role key.
  // This can be done via a database trigger or scheduled cleanup job.

  return { success: true };
}
