import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { resolveClub } from "@/lib/clubs/resolveClub";
import { ClubNavigation } from "@/components/clubs/ClubNavigation";
import { MobileBackButton } from "@/components/profile/MobileBackButton";
import { ImportHistoryWizard } from "./ImportHistoryWizard";

interface ImportHistoryPageProps {
  params: Promise<{ slug: string }>;
}

export default async function ImportHistoryPage({ params }: ImportHistoryPageProps) {
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

  if (!isAdmin) {
    redirect(`/club/${clubSlug}`);
  }

  // Get club info
  const { data: club } = await supabase.from("clubs").select("name").eq("id", clubId).single();

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
          <MobileBackButton href={`/club/${clubSlug}/manage`} label="Manage" />

          <div className="hidden lg:block mb-6">
            <h1 className="text-lg font-semibold text-[var(--club-accent,var(--text-primary))]">
              Import Watch History
            </h1>
            <p className="text-xs text-[var(--text-muted)]">
              Add movies your club watched before joining BackRow
            </p>
          </div>

          <ImportHistoryWizard clubId={clubId} clubSlug={clubSlug} />
        </div>
      </div>
    </>
  );
}
