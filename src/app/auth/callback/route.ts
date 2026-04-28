import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { ensureUser } from "@/lib/users/ensureUser";
import { autoJoinFeaturedClub } from "@/lib/users/autoJoinFeatured";
import { NextRequest } from "next/server";
import { consumeRedirectCookie, isValidRedirect } from "@/lib/auth/redirect";

/**
 * OAuth Callback Handler
 *
 * Handles OAuth redirects (Google, Discord; Apple coming soon) and magic-link /
 * email-confirmation flows. Creates/updates the user in the database and
 * redirects to the destination from the `next` param or the redirect cookie.
 */
export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get("code");
  const error = requestUrl.searchParams.get("error");
  const errorDescription = requestUrl.searchParams.get("error_description");

  // Handle OAuth errors (user denied access, etc.)
  if (error) {
    console.error("OAuth error:", error, errorDescription);
    const errorMessage = errorDescription || error || "OAuth authentication failed";
    redirect(`/sign-in?error=${encodeURIComponent(errorMessage)}`);
  }

  // If no code, redirect to sign-in
  if (!code) {
    redirect("/sign-in?error=No authorization code received");
  }

  const supabase = await createClient();

  // Sign out any existing session before exchanging the code. Without this,
  // a user signed in as Account B who clicks a confirmation/magic link for
  // Account A can end up with ambiguous cookie state — and in some clients
  // never actually completes the sign-in as Account A. Clearing first makes
  // the flow deterministic: the new session always reflects whoever the link
  // was issued to.
  await supabase.auth.signOut();

  // Exchange code for session
  const { data: authData, error: authError } = await supabase.auth.exchangeCodeForSession(code);

  if (authError) {
    console.error("Error exchanging code for session:", authError);
    redirect(
      `/sign-in?error=${encodeURIComponent(authError.message || "Failed to complete sign-in")}`
    );
  }

  if (!authData.user) {
    redirect("/sign-in?error=No user data received from OAuth provider");
  }

  const user = authData.user;
  const email = user.email;

  if (!email) {
    redirect("/sign-in?error=No email address received from OAuth provider");
  }

  // Ensure user exists in public.users table
  try {
    await ensureUser(supabase, user.id, email);
    await autoJoinFeaturedClub(supabase, user.id);

    // Optionally update user metadata from OAuth provider
    if (user.user_metadata) {
      const updateData: {
        display_name?: string;
        avatar_url?: string;
      } = {};

      // Use OAuth provider's display name if available
      if (user.user_metadata.full_name || user.user_metadata.name) {
        updateData.display_name = user.user_metadata.full_name || user.user_metadata.name;
      }

      // Use OAuth provider's avatar if available
      if (user.user_metadata.avatar_url || user.user_metadata.picture) {
        updateData.avatar_url = user.user_metadata.avatar_url || user.user_metadata.picture;
      }

      // Update user profile if we have new data
      if (Object.keys(updateData).length > 0) {
        try {
          const { error: updateError } = await supabase
            .from("users")
            .update(updateData)
            .eq("id", user.id);

          if (updateError) {
            // Log but don't fail - user can still sign in
            console.error("Error updating user profile from OAuth:", updateError);
          }
        } catch (err) {
          // Log but don't fail - user can still sign in
          console.error("Error updating user profile from OAuth:", err);
        }
      }
    }
  } catch (userError) {
    // Log error but don't fail - user can still sign in
    console.error("Error ensuring user exists:", userError);
  }

  // Prefer the `next` query param (set by `authCallbackUrl(next)` in email
  // flows — survives cross-device confirmation clicks). Fall back to the
  // redirect cookie (set before OAuth / magic-link flows). Always consume the
  // cookie so it doesn't linger.
  const nextParam = requestUrl.searchParams.get("next");
  const cookieDestination = await consumeRedirectCookie();
  const destination = nextParam && isValidRedirect(nextParam) ? nextParam : cookieDestination;
  redirect(destination);
}
