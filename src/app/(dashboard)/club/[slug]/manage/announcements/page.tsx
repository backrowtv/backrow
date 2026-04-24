import { Suspense } from "react";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { resolveClub } from "@/lib/clubs/resolveClub";
import { ClubNavigation } from "@/components/clubs/ClubNavigation";
import { MobileBackButton } from "@/components/profile/MobileBackButton";
import { AnnouncementsList } from "@/components/clubs/AnnouncementsList";
import { AnnouncementEditorTabs } from "@/components/clubs/AnnouncementEditorTabs";

interface DirectorAnnouncementsPageProps {
  params: Promise<{ slug: string }>;
}

export default function DirectorAnnouncementsPage(props: DirectorAnnouncementsPageProps) {
  return (
    <Suspense fallback={null}>
      <DirectorAnnouncementsPageContent {...props} />
    </Suspense>
  );
}

async function DirectorAnnouncementsPageContent({ params }: DirectorAnnouncementsPageProps) {
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

  // Check if user is a member and admin
  const { data: membership } = await supabase
    .from("club_members")
    .select("role")
    .eq("club_id", clubId)
    .eq("user_id", user.id)
    .maybeSingle();

  if (!membership) {
    redirect("/clubs");
  }

  const isAdmin = membership?.role === "producer" || membership?.role === "director";
  const isProducer = membership?.role === "producer" || false;

  // Only directors and producers can access this page
  if (!isAdmin) {
    redirect(`/club/${clubSlug}`);
  }

  // Get club info
  const { data: club } = await supabase.from("clubs").select("name").eq("id", clubId).single();

  // Fetch announcements
  const { data: announcements } = await supabase
    .from("club_announcements")
    .select(
      `
      *,
      user:user_id (id, display_name, avatar_url)
    `
    )
    .eq("club_id", clubId)
    .or("expires_at.is.null,expires_at.gt." + new Date().toISOString())
    .order("created_at", { ascending: false });

  return (
    <>
      <ClubNavigation
        clubSlug={clubSlug}
        clubName={club?.name || "Club"}
        isAdmin={isAdmin}
        isProducer={isProducer}
      />
      <div className="bg-[var(--background)]">
        <div className="max-w-3xl mx-auto px-4 lg:px-6 py-6">
          {/* Mobile Back Button */}
          <MobileBackButton href={`/club/${clubSlug}/manage`} label="Manage" />

          {/* Header - Hidden on mobile since TopNav shows club name */}
          <div className="hidden lg:block mb-6">
            <h1 className="text-lg font-semibold text-[var(--club-accent,var(--text-primary))]">
              Announcements
            </h1>
            <p className="text-xs text-[var(--text-muted)]">Post updates and club activities</p>
          </div>

          <div className="space-y-6">
            {/* Editor */}
            <AnnouncementEditorTabs clubId={clubId} />

            {/* Announcements List */}
            <div className="space-y-4">
              <h3 className="text-sm font-semibold text-[var(--text-primary)]">
                Recent Announcements
              </h3>
              <div className="border border-[var(--border)] rounded-lg p-4">
                <AnnouncementsList clubId={clubId} announcements={announcements || []} />
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
