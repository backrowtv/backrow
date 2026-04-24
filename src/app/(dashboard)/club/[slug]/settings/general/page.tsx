import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { ClubForm } from "@/components/clubs/ClubForm";
import { ClubPersonalizationForm } from "@/components/clubs/ClubPersonalizationForm";
import { ClubRubricSelector } from "@/components/clubs/ClubRubricSelector";
import { ClubDashboardPreferences } from "@/components/clubs/ClubDashboardPreferences";
import { SettingsSection } from "@/components/ui/settings-section";
import { resolveClub } from "@/lib/clubs/resolveClub";
import { MobileBackButton } from "@/components/profile/MobileBackButton";
import { Gear, User, SlidersHorizontal } from "@phosphor-icons/react/dist/ssr";
import type { RatingRubric } from "@/types/club-settings";
import type { UserRubric } from "@/app/actions/rubrics.types";

interface GeneralSettingsPageProps {
  params: Promise<{ slug: string }>;
}

export default async function GeneralSettingsPage({ params }: GeneralSettingsPageProps) {
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
  const clubSlug = clubResolution.slug || clubId;

  // Get club
  const { data: club, error: clubError } = await supabase
    .from("clubs")
    .select("*")
    .eq("id", clubId)
    .single();

  if (clubError || !club) {
    redirect("/clubs");
  }

  // Check user's membership and role
  const { data: membership } = await supabase
    .from("club_members")
    .select("role, club_display_name, club_avatar_url, club_bio, preferences")
    .eq("club_id", clubId)
    .eq("user_id", user.id)
    .maybeSingle();

  if (!membership) {
    redirect(`/club/${clubSlug}`);
  }

  const isAdmin = membership.role === "producer" || membership.role === "director";
  const isProducer = membership.role === "producer";

  // For non-admins, we need personalization data
  let personalizationData = null;
  if (!isAdmin) {
    // Get user profile for avatar/bio
    const { data: profile } = await supabase
      .from("users")
      .select("display_name, avatar_url, bio")
      .eq("id", user.id)
      .maybeSingle();

    // Get user's rubrics from user_rubrics table
    const { data: userRubrics } = await supabase
      .from("user_rubrics")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });

    const rubrics: UserRubric[] = (userRubrics || []).map((r) => ({
      id: r.id,
      user_id: r.user_id,
      name: r.name,
      categories: r.categories as RatingRubric[],
      is_default: r.is_default,
      created_at: r.created_at,
      updated_at: r.updated_at,
    }));

    const preferences = (membership.preferences as Record<string, unknown>) || {};
    const defaultRubricId = (preferences.default_rubric_id as string | null) || null;
    const hideClubCard = preferences.hide_club_card === true;
    const disableSpoilerWarnings = preferences.disable_spoiler_warnings === true;

    personalizationData = {
      profile,
      rubrics,
      defaultRubricId,
      hideClubCard,
      disableSpoilerWarnings,
      membership,
    };
  }

  return (
    <div className="bg-[var(--background)]">
      <div className="max-w-3xl mx-auto px-4 lg:px-6 py-6">
        {/* Mobile Back Button */}
        <MobileBackButton href={`/club/${clubSlug}/settings`} label="Settings" />

        {/* Header - Hidden on mobile since TopNav shows club name */}
        <div className="hidden md:block mb-6">
          <h1 className="text-lg font-semibold text-[var(--club-accent,var(--text-primary))]">
            General Settings
          </h1>
          <p className="text-xs text-[var(--text-muted)]">
            {isAdmin ? "Club profile and configuration" : "Your settings for this club"}
          </p>
        </div>

        <div className="space-y-1">
          {/* Club Profile - Only for admins */}
          {isAdmin && (
            <SettingsSection
              title="Club Profile"
              description="Name, description, privacy, and visuals"
              icon={<Gear />}
              defaultOpen
            >
              <ClubForm club={club} isProducer={isProducer} />
            </SettingsSection>
          )}

          {/* Personalization - Only for non-admins (admins have separate route) */}
          {!isAdmin && personalizationData && (
            <>
              <SettingsSection
                title="Your Profile in This Club"
                description="Customize how you appear to other members"
                icon={<User />}
                defaultOpen
              >
                <ClubPersonalizationForm
                  clubId={clubId}
                  initialDisplayName={
                    personalizationData.membership.club_display_name ||
                    personalizationData.profile?.display_name ||
                    ""
                  }
                  globalDisplayName={personalizationData.profile?.display_name || ""}
                />
              </SettingsSection>

              <SettingsSection
                title="Rating Rubric"
                description="Choose which rubric to use when rating movies"
                icon={<Gear />}
              >
                <ClubRubricSelector
                  clubId={clubId}
                  userRubrics={personalizationData.rubrics}
                  defaultRubricId={personalizationData.defaultRubricId}
                />
              </SettingsSection>

              <SettingsSection
                title="Dashboard & Discussions"
                description="Control what shows up on the club dashboard and in discussions"
                icon={<SlidersHorizontal />}
              >
                <ClubDashboardPreferences
                  clubId={clubId}
                  initialShowClubCard={!personalizationData.hideClubCard}
                  initialShowSpoilerWarnings={!personalizationData.disableSpoilerWarnings}
                />
              </SettingsSection>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
