import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { NotificationSettingsForm } from "@/components/profile/NotificationSettingsForm";
import { MobileBackButton } from "@/components/profile/MobileBackButton";

export default async function NotificationSettingsPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/sign-in");
  }

  // Fetch profile and user's clubs in parallel
  const [profileResult, membershipsResult] = await Promise.all([
    supabase.from("users").select("social_links").eq("id", user.id).maybeSingle(),
    supabase.from("club_members").select("club_id").eq("user_id", user.id),
  ]);

  // Parse social_links for notification settings
  const socialLinks = (profileResult.data?.social_links as Record<string, unknown>) || {};
  const notificationPrefs = (socialLinks.notification_preferences as Record<string, unknown>) || {};

  // Fetch club details if user has memberships
  const memberClubIds = membershipsResult.data?.map((m) => m.club_id) || [];
  let userClubs: Array<{
    id: string;
    name: string;
    slug: string | null;
    avatar_icon: string | null;
    avatar_color_index: number | null;
    avatar_border_color_index: number | null;
  }> = [];

  if (memberClubIds.length > 0) {
    const { data: clubs } = await supabase
      .from("clubs")
      .select("id, name, slug, avatar_icon, avatar_color_index, avatar_border_color_index")
      .in("id", memberClubIds)
      .eq("archived", false)
      .order("name");

    userClubs = clubs || [];
  }

  // Parse email-enabled clubs (stored as array of club IDs)
  const emailEnabledClubs = (notificationPrefs.email_enabled_clubs as string[]) || [];

  // Parse per-club email preferences
  const clubNotificationPrefs =
    (socialLinks.club_notification_preferences as Record<string, Record<string, unknown>>) || {};

  const clubEmailPrefs: Record<string, Record<string, boolean>> = {};
  for (const club of userClubs) {
    const cp = clubNotificationPrefs[club.id] || {};
    clubEmailPrefs[club.id] = {
      emailEnabled: (cp.email_enabled as boolean) ?? false,
      emailFestivalUpdates: (cp.email_festival_updates as boolean) ?? false,
      emailNewFestivals: (cp.email_new_festivals as boolean) ?? false,
      emailDeadlineChanges: (cp.email_deadline_changes as boolean) ?? false,
      emailResultsRevealed: (cp.email_results_revealed as boolean) ?? false,
      emailEndlessFestival: (cp.email_endless_festival as boolean) ?? false,
      emailAnnouncements: (cp.email_announcements as boolean) ?? false,
      emailEvents: (cp.email_events as boolean) ?? false,
      emailPolls: (cp.email_polls as boolean) ?? false,
      emailSeasons: (cp.email_seasons as boolean) ?? false,
      emailMentions: (cp.email_mentions as boolean) ?? false,
      emailNewMessages: (cp.email_new_messages as boolean) ?? false,
    };
  }

  const notificationSettings = {
    // Master toggles
    allNotifications: (notificationPrefs.all_notifications as boolean) ?? true,
    allSiteNotifications: (notificationPrefs.all_site_notifications as boolean) ?? true,
    allEmailNotifications: (notificationPrefs.all_email_notifications as boolean) ?? false,
    allPushNotifications: (notificationPrefs.all_push_notifications as boolean) ?? true,
    // Festivals
    newFestivals: (notificationPrefs.new_festivals as boolean) ?? true,
    festivalUpdates: (notificationPrefs.festival_updates as boolean) ?? true,
    deadlineChanges: (notificationPrefs.deadline_changes as boolean) ?? true,
    resultsRevealed: (notificationPrefs.results_revealed as boolean) ?? true,
    // Endless Festival
    endlessFestival: (notificationPrefs.endless_festival as boolean) ?? true,
    // Club Updates
    clubInvites: (notificationPrefs.club_invites as boolean) ?? true,
    clubUpdates: (notificationPrefs.club_updates as boolean) ?? true,
    announcements: (notificationPrefs.announcements as boolean) ?? true,
    // Events
    events: (notificationPrefs.events as boolean) ?? true,
    // Polls
    polls: (notificationPrefs.polls as boolean) ?? true,
    // Seasons
    seasons: (notificationPrefs.seasons as boolean) ?? true,
    // Social
    mentions: (notificationPrefs.mentions as boolean) ?? true,
    newMessages: (notificationPrefs.new_messages as boolean) ?? true,
    badges: (notificationPrefs.badges as boolean) ?? true,
    // Email — global
    emailNotifications: (notificationPrefs.email_notifications as boolean) ?? false,
    digestFrequency:
      (notificationPrefs.digest_frequency as "never" | "daily" | "weekly") || "daily",
    emailEnabledClubs,
    // Email — per-category
    emailNewFestivals: (notificationPrefs.email_new_festivals as boolean) ?? false,
    emailFestivalUpdates: (notificationPrefs.email_festival_updates as boolean) ?? false,
    emailDeadlineChanges: (notificationPrefs.email_deadline_changes as boolean) ?? false,
    emailResultsRevealed: (notificationPrefs.email_results_revealed as boolean) ?? false,
    emailEndlessFestival: (notificationPrefs.email_endless_festival as boolean) ?? false,
    emailClubInvites: (notificationPrefs.email_club_invites as boolean) ?? false,
    emailClubUpdates: (notificationPrefs.email_club_updates as boolean) ?? false,
    emailAnnouncements: (notificationPrefs.email_announcements as boolean) ?? false,
    emailEvents: (notificationPrefs.email_events as boolean) ?? false,
    emailPolls: (notificationPrefs.email_polls as boolean) ?? false,
    emailSeasons: (notificationPrefs.email_seasons as boolean) ?? false,
    emailMentions: (notificationPrefs.email_mentions as boolean) ?? false,
    emailNewMessages: (notificationPrefs.email_new_messages as boolean) ?? false,
    emailBadges: (notificationPrefs.email_badges as boolean) ?? false,
  };

  return (
    <div className="bg-[var(--background)]">
      <div className="max-w-3xl mx-auto px-4 lg:px-6 py-6">
        {/* Mobile Back Button */}
        <MobileBackButton href="/profile/settings" label="Settings" />

        {/* Header - Hidden on mobile since TopNav shows "Profile" */}
        <div className="hidden md:block mb-6">
          <h1 className="text-lg font-semibold text-[var(--text-primary)]">
            Notification Settings
          </h1>
        </div>

        {/* Notification Settings Form */}
        <NotificationSettingsForm
          initialPreferences={notificationSettings}
          userClubs={userClubs}
          initialClubEmailPrefs={clubEmailPrefs}
        />
      </div>
    </div>
  );
}
