"use server";

import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import type { Provider } from "@supabase/supabase-js";
import { setRedirectCookie } from "@/lib/auth/redirect";

type OAuthProvider = "google" | "meta" | "twitter" | "apple" | "discord";

interface SignInWithOAuthResult {
  error?: string;
  url?: string;
}

/**
 * Initiates OAuth sign-in flow for the specified provider
 *
 * @param provider - OAuth provider ('google' | 'meta' | 'twitter' | 'apple' | 'discord')
 * @returns Object with error message or redirect URL
 */
export async function signInWithOAuth(provider: OAuthProvider, postAuthRedirect?: string): Promise<SignInWithOAuthResult> {
  const supabase = await createClient();

  // Map provider names to Supabase provider identifiers
  // Note: Supabase uses 'facebook' for Meta/Facebook and 'twitter' for Twitter/X
  const providerMap: Record<OAuthProvider, Provider> = {
    google: "google",
    meta: "facebook", // Meta/Facebook uses 'facebook' in Supabase
    twitter: "twitter", // Twitter/X uses 'twitter' in Supabase
    apple: "apple",
    discord: "discord",
  };

  const supabaseProvider = providerMap[provider];

  if (!supabaseProvider) {
    return { error: `Unsupported OAuth provider: ${provider}` };
  }

  // Get the callback URL
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";
  const redirectTo = `${siteUrl}/auth/callback`;

  // Initiate OAuth flow
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: supabaseProvider,
    options: {
      redirectTo,
      // Request additional scopes if needed
      scopes: getProviderScopes(provider),
      // Pass query params for provider-specific options
      queryParams: getProviderQueryParams(provider),
    },
  });

  if (error) {
    console.error(`OAuth error for ${provider}:`, error);

    // Provide user-friendly error messages
    let userMessage = error.message || `Failed to initiate ${provider} sign-in.`;

    // Handle specific error cases
    if (error.message?.includes("not enabled") || error.message?.includes("disabled")) {
      userMessage = `${provider.charAt(0).toUpperCase() + provider.slice(1)} sign-in is not enabled. Please contact support.`;
    } else if (error.message?.includes("redirect")) {
      userMessage = `Invalid redirect URL. Please try again.`;
    } else if (error.message?.includes("network") || error.message?.includes("timeout")) {
      userMessage = `Network error. Please check your connection and try again.`;
    }

    return { error: userMessage };
  }

  // If URL is returned, redirect to OAuth provider
  if (data.url) {
    // Store redirect destination in cookie for auth callback
    if (postAuthRedirect) {
      await setRedirectCookie(postAuthRedirect);
    }
    // Redirect throws, so this never returns normally
    redirect(data.url);
  }

  return { error: "No redirect URL received from OAuth provider" };
}

/**
 * Get OAuth scopes for the specified provider
 */
function getProviderScopes(provider: OAuthProvider): string {
  switch (provider) {
    case "google":
      return "email profile";
    case "meta":
      return "email public_profile";
    case "twitter":
      // Twitter OAuth 2.0 - Supabase handles scopes automatically
      return "email";
    case "apple":
      return "email name";
    case "discord":
      return "email identify";
    default:
      return "email";
  }
}

/**
 * Get provider-specific query parameters
 */
function getProviderQueryParams(provider: OAuthProvider): Record<string, string> {
  switch (provider) {
    case "meta":
      // Meta/Facebook specific params
      return {
        auth_type: "rerequest", // Re-request permissions if denied
      };
    default:
      return {};
  }
}
