import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { CombinedNavigationSettings } from "@/components/profile/CombinedNavigationSettings";
import { MovieLinkSettings } from "@/components/profile/MovieLinkSettings";
import {
  CompactTimeFormatToggle,
  CompactDateFormatToggle,
} from "@/components/profile/TimeFormatSettings";
import { MobileBackButton } from "@/components/profile/MobileBackButton";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import { ThemeSelector } from "@/components/profile/ThemeSelector";
import { DiscussionSettings } from "@/components/profile/DiscussionSettings";
import {
  getNavPreferences,
  getSidebarPreferences,
  getUserClubsForNav,
  getMovieLinkPreferences,
} from "@/app/actions/navigation-preferences";
import { getDiscussionPreferences } from "@/app/actions/discussion-preferences";

export const metadata = {
  title: "Display Settings | BackRow",
  description: "Customize your display preferences",
};

export default async function DisplaySettingsPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/sign-in");
  }

  // Load preferences and user's clubs in parallel
  const [
    mobilePreferences,
    sidebarPreferences,
    userClubs,
    movieLinkPreferences,
    discussionPreferences,
  ] = await Promise.all([
    getNavPreferences(),
    getSidebarPreferences(),
    getUserClubsForNav(),
    getMovieLinkPreferences(),
    getDiscussionPreferences(),
  ]);

  return (
    <div className="bg-[var(--background)]">
      <div className="max-w-3xl mx-auto px-4 lg:px-6 py-6 space-y-4">
        {/* Mobile Back Button */}
        <MobileBackButton href="/profile/settings" label="Settings" />

        {/* Header - Hidden on mobile since TopNav shows "Profile" */}
        <div className="hidden md:block">
          <h1 className="text-lg font-semibold text-[var(--text-primary)]">Display Settings</h1>
        </div>

        {/* Movie Page Links */}
        <div>
          <h2 className="text-sm font-medium text-[var(--text-primary)] mb-2 md:hidden">
            Movie Page Links
          </h2>
          <div className="p-3 rounded-xl bg-[var(--surface-1)] border border-[var(--border)]">
            <h2 className="text-sm font-medium text-[var(--text-primary)] mb-2 hidden md:block">
              Movie Page Links
            </h2>
            <MovieLinkSettings initialPreferences={movieLinkPreferences} />
          </div>
        </div>

        {/* Discussions */}
        <div>
          <h2 className="text-sm font-medium text-[var(--text-primary)] mb-2 md:hidden">
            Discussions
          </h2>
          <div className="p-3 rounded-xl bg-[var(--surface-1)] border border-[var(--border)]">
            <h2 className="text-sm font-medium text-[var(--text-primary)] mb-2 hidden md:block">
              Discussions
            </h2>
            <DiscussionSettings initialPreferences={discussionPreferences} />
          </div>
        </div>

        {/* Appearance */}
        <div>
          <h2 className="text-sm font-medium text-[var(--text-primary)] mb-2 md:hidden">
            Appearance
          </h2>
          <div className="p-3 rounded-xl bg-[var(--surface-1)] border border-[var(--border)]">
            <h2 className="text-sm font-medium text-[var(--text-primary)] mb-2 hidden md:block">
              Appearance
            </h2>

            {/* Theme row */}
            <div className="flex items-center justify-between py-2">
              <p className="text-sm font-medium text-[var(--text-primary)]">Light / Dark</p>
              <ThemeToggle />
            </div>

            <div className="border-t border-[var(--border)]" />

            {/* Color theme selector */}
            <div className="py-2">
              <p className="text-sm font-medium text-[var(--text-primary)] mb-2">Color theme</p>
              <ThemeSelector />
            </div>

            <div className="border-t border-[var(--border)]" />

            {/* Time format row */}
            <div className="flex items-center justify-between py-2">
              <p className="text-sm font-medium text-[var(--text-primary)]">Time format</p>
              <CompactTimeFormatToggle />
            </div>

            <div className="border-t border-[var(--border)]" />

            {/* Date format row */}
            <div className="flex items-center justify-between py-2">
              <p className="text-sm font-medium text-[var(--text-primary)]">Date format</p>
              <CompactDateFormatToggle />
            </div>
          </div>
        </div>

        {/* Navigation */}
        <div>
          <h2 className="text-sm font-medium text-[var(--text-primary)] mb-2 md:hidden">
            Navigation
          </h2>
          <div className="p-3 rounded-xl bg-[var(--surface-1)] border border-[var(--border)]">
            <h2 className="text-sm font-medium text-[var(--text-primary)] mb-2 hidden md:block">
              Navigation
            </h2>
            <CombinedNavigationSettings
              mobilePreferences={mobilePreferences}
              sidebarPreferences={sidebarPreferences}
              userClubs={userClubs}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
