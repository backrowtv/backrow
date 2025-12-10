import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { resolveClub } from "@/lib/clubs/resolveClub";
import { ClubPersonalizationForm } from "@/components/clubs/ClubPersonalizationForm";
import { ClubRubricSelector } from "@/components/clubs/ClubRubricSelector";
import { MobileBackButton } from "@/components/profile/MobileBackButton";
import type { RatingRubric } from "@/types/club-settings";
import type { UserRubric } from "@/app/actions/rubrics.types";

interface PersonalizationSettingsPageProps {
  params: Promise<{ slug: string }>;
}

export default async function PersonalizationSettingsPage({
  params,
}: PersonalizationSettingsPageProps) {
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

  // Check membership (any member can personalize their experience)
  const { data: membership } = await supabase
    .from("club_members")
    .select("club_display_name, role, preferences")
    .eq("club_id", clubId)
    .eq("user_id", user.id)
    .maybeSingle();

  if (!membership) {
    redirect(`/club/${clubResolution.slug || clubId}`);
  }

  const clubSlug = clubResolution.slug || clubId;
  const isAdmin = membership.role === "producer" || membership.role === "director";

  // Non-admins should use the general settings page for personalization
  if (!isAdmin) {
    redirect(`/club/${clubSlug}/settings/general`);
  }

  // Get user profile for display name
  const { data: profile } = await supabase
    .from("users")
    .select("display_name")
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

  // Get default rubric preference from club_members preferences
  const preferences = (membership.preferences as Record<string, unknown>) || {};
  const defaultRubricId = (preferences.default_rubric_id as string | null) || null;

  return (
    <div className="bg-[var(--background)]">
      <div className="max-w-3xl mx-auto px-4 lg:px-6 py-6">
        {/* Mobile Back Button */}
        <MobileBackButton href={`/club/${clubSlug}/settings`} label="Settings" />

        {/* Header - Hidden on mobile since TopNav shows club name */}
        <div className="hidden lg:block mb-6">
          <h1 className="text-lg font-semibold text-[var(--club-accent,var(--text-primary))]">
            Personalization
          </h1>
          <p className="text-xs text-[var(--text-muted)]">Customize how you appear in this club</p>
        </div>

        <div className="space-y-6">
          <ClubPersonalizationForm
            clubId={clubId}
            initialDisplayName={membership.club_display_name || profile?.display_name || ""}
            globalDisplayName={profile?.display_name || ""}
          />

          {/* Default Rubric Selection */}
          <ClubRubricSelector
            clubId={clubId}
            userRubrics={rubrics}
            defaultRubricId={defaultRubricId}
          />
        </div>
      </div>
    </div>
  );
}
