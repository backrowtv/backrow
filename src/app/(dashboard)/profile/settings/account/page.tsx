import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { AccountSettingsAccordion } from "@/components/profile/AccountSettingsAccordion";
import { MobileBackButton } from "@/components/profile/MobileBackButton";

export default async function AccountSettingsPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/sign-in");
  }

  // Get user profile with all settings data
  const { data: profile } = await supabase
    .from("users")
    .select(
      "created_at, social_links, display_name, show_watch_providers, username, username_last_changed_at"
    )
    .eq("id", user.id)
    .maybeSingle();

  // Get user's email from auth
  const {
    data: { user: authUser },
  } = await supabase.auth.getUser();
  const email = authUser?.email || "";

  // Parse social_links for various settings
  const socialLinks = (profile?.social_links as Record<string, unknown>) || {};

  // Account settings - linked accounts (all 11 platforms + visibility flags)
  const linkedAccounts = {
    letterboxd: (socialLinks.letterboxd as string) || "",
    letterboxd_visible: (socialLinks.letterboxd_visible as boolean) !== false,
    imdb: (socialLinks.imdb as string) || "",
    imdb_visible: (socialLinks.imdb_visible as boolean) !== false,
    trakt: (socialLinks.trakt as string) || "",
    trakt_visible: (socialLinks.trakt_visible as boolean) !== false,
    tmdb: (socialLinks.tmdb as string) || "",
    tmdb_visible: (socialLinks.tmdb_visible as boolean) !== false,
    youtube: (socialLinks.youtube as string) || "",
    youtube_visible: (socialLinks.youtube_visible as boolean) !== false,
    twitter: (socialLinks.twitter as string) || "",
    twitter_visible: (socialLinks.twitter_visible as boolean) !== false,
    instagram: (socialLinks.instagram as string) || "",
    instagram_visible: (socialLinks.instagram_visible as boolean) !== false,
    reddit: (socialLinks.reddit as string) || "",
    reddit_visible: (socialLinks.reddit_visible as boolean) !== false,
    discord: (socialLinks.discord as string) || "",
    discord_visible: (socialLinks.discord_visible as boolean) !== false,
    tiktok: (socialLinks.tiktok as string) || "",
    tiktok_visible: (socialLinks.tiktok_visible as boolean) !== false,
  };

  // Privacy settings
  const privacySettings = {
    showProfilePopup: (socialLinks.show_profile_popup as boolean) ?? true,
  };

  // Watch settings
  const showWatchProviders = profile?.show_watch_providers ?? true;

  return (
    <div className="bg-[var(--background)]">
      <div className="max-w-3xl mx-auto px-4 lg:px-6 py-6">
        {/* Mobile Back Button */}
        <MobileBackButton href="/profile/settings" label="Settings" />

        {/* Header - Hidden on mobile since TopNav shows "Profile" */}
        <div className="hidden md:block mb-6">
          <h1 className="text-lg font-semibold text-[var(--text-primary)]">Account Settings</h1>
        </div>

        {/* Accordion Sections */}
        <AccountSettingsAccordion
          // Account props
          email={email}
          createdAt={profile?.created_at || new Date().toISOString()}
          socialLinks={linkedAccounts}
          displayName={profile?.display_name || ""}
          username={profile?.username || ""}
          usernameLastChangedAt={profile?.username_last_changed_at || null}
          // Privacy props
          privacySettings={privacySettings}
          // Watch props
          showWatchProviders={showWatchProviders}
        />
      </div>
    </div>
  );
}
