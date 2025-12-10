import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { resolveClub } from "@/lib/clubs/resolveClub";
import { ClubNotificationSettingsForm } from "@/components/clubs/ClubNotificationSettingsForm";
import { MobileBackButton } from "@/components/profile/MobileBackButton";

interface NotificationsSettingsPageProps {
  params: Promise<{ slug: string }>;
}

export default async function NotificationsSettingsPage({
  params,
}: NotificationsSettingsPageProps) {
  const identifier = (await params).slug;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/sign-in");
  }

  // Resolve club by slug or ID
  const clubResolution = await resolveClub(supabase, identifier);
  if (!clubResolution) redirect("/clubs");

  const clubId = clubResolution.id;

  // Check membership (any member can set their own notification preferences)
  const { data: membership } = await supabase
    .from("club_members")
    .select("role")
    .eq("club_id", clubId)
    .eq("user_id", user.id)
    .maybeSingle();

  if (!membership) {
    redirect(`/club/${clubResolution.slug || clubId}`);
  }

  const clubSlug = clubResolution.slug || clubId;

  // Get user's club notification preferences
  const { data: profile } = await supabase
    .from("users")
    .select("social_links")
    .eq("id", user.id)
    .maybeSingle();

  const socialLinks = (profile?.social_links as Record<string, unknown>) || {};
  const clubPrefs =
    (socialLinks.club_notification_preferences as Record<string, Record<string, unknown>>) || {};
  const preferences = clubPrefs[clubId] || {};

  return (
    <div className="bg-[var(--background)]">
      <div className="max-w-3xl mx-auto px-4 lg:px-6 py-6">
        {/* Mobile Back Button */}
        <MobileBackButton href={`/club/${clubSlug}/settings`} label="Settings" />

        {/* Header - Hidden on mobile since TopNav shows club name */}
        <div className="hidden md:block mb-6">
          <h1 className="text-lg font-semibold text-[var(--club-accent,var(--text-primary))]">
            Notification Settings
          </h1>
          <p className="text-xs text-[var(--text-muted)]">Notification preferences for this club</p>
        </div>

        <ClubNotificationSettingsForm
          clubId={clubId}
          initialPreferences={{
            // Master toggle
            allClubNotifications: (preferences.all_club_notifications as boolean) ?? true,
            // Festival
            festivalUpdates: (preferences.festival_updates as boolean) ?? true,
            newFestivals: (preferences.new_festivals as boolean) ?? true,
            newNominations: (preferences.new_nominations as boolean) ?? true,
            phaseChanges: (preferences.phase_changes as boolean) ?? true,
            deadlineChanges: (preferences.deadline_changes as boolean) ?? true,
            resultsRevealed: (preferences.results_revealed as boolean) ?? true,
            // Endless Festival
            endlessFestival: (preferences.endless_festival as boolean) ?? true,
            // Club
            clubUpdates: (preferences.club_updates as boolean) ?? true,
            announcements: (preferences.announcements as boolean) ?? true,
            // Events
            events: (preferences.events as boolean) ?? true,
            // Polls
            polls: (preferences.polls as boolean) ?? true,
            // Seasons
            seasons: (preferences.seasons as boolean) ?? true,
            // Social
            newMessages: (preferences.new_messages as boolean) ?? true,
            mentions: (preferences.mentions as boolean) ?? true,
          }}
        />
      </div>
    </div>
  );
}
