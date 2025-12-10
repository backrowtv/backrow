import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { resolveClub } from "@/lib/clubs/resolveClub";
import { ClubNavigation } from "@/components/clubs/ClubNavigation";
import { MobileBackButton } from "@/components/profile/MobileBackButton";
import { TransferOwnershipForm } from "@/components/clubs/TransferOwnershipForm";
import { ArchiveClubButton } from "@/components/clubs/ArchiveClubButton";
import { DeleteClubButton } from "@/components/clubs/DeleteClubButton";
import { WordBlacklist } from "@/components/clubs/WordBlacklist";
import { BlockedUsersList } from "@/components/clubs/BlockedUsersList";
import { CriticInviteToggle } from "@/components/clubs/CriticInviteToggle";
import type { ClubSettings } from "@/types/club-settings";

interface ProducerClubManagementPageProps {
  params: Promise<{ slug: string }>;
}

export default async function ProducerClubManagementPage({
  params,
}: ProducerClubManagementPageProps) {
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

  // Check if user is a member and producer
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

  // Only producers can access this page
  if (!isProducer) {
    redirect(`/club/${clubSlug}`);
  }

  // Get club info
  const { data: club } = await supabase
    .from("clubs")
    .select("name, archived, settings")
    .eq("id", clubId)
    .single();

  const clubSettings = (club?.settings as ClubSettings) || {};

  // Fetch members for ownership transfer
  const { data: members } = await supabase
    .from("club_members")
    .select(
      `
      user_id,
      user:user_id (id, display_name)
    `
    )
    .eq("club_id", clubId)
    .neq("user_id", user.id);

  const memberOptions =
    members?.map((m) => {
      const userData = Array.isArray(m.user) ? m.user[0] : m.user;
      return {
        id: m.user_id,
        display_name: (userData as { display_name: string } | null)?.display_name || "Unknown",
      };
    }) || [];

  // Fetch blacklist words for moderation
  const { data: blacklistWords } = await supabase
    .from("club_word_blacklist")
    .select("id, word")
    .eq("club_id", clubId)
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
              Club Management
            </h1>
            <p className="text-xs text-[var(--text-muted)]">
              Moderation, ownership transfer, and club settings
            </p>
          </div>

          <div className="space-y-6">
            {/* Member Permissions */}
            <section className="space-y-4">
              <h3 className="text-base font-semibold text-[var(--club-accent,var(--text-primary))]">
                Member Permissions
              </h3>
              <p className="text-xs text-[var(--text-muted)]">
                Control what actions members can perform
              </p>
              <CriticInviteToggle
                clubId={clubId}
                initialValue={clubSettings.allow_critics_to_invite || false}
              />
            </section>

            {/* Word Blacklist - Moderation */}
            <section className="border-t border-[var(--border)] pt-6 space-y-4">
              <h3 className="text-base font-semibold text-[var(--club-accent,var(--text-primary))]">
                Word Blacklist
              </h3>
              <p className="text-xs text-[var(--text-muted)]">
                Block specific words from being used in discussions and comments
              </p>
              <WordBlacklist
                clubId={clubId}
                words={(blacklistWords || []).map((w) => ({ id: w.id, word: w.word }))}
              />
            </section>

            {/* Blocked Users - Moderation */}
            <section className="border-t border-[var(--border)] pt-6 space-y-4">
              <h3 className="text-base font-semibold text-[var(--club-accent,var(--text-primary))]">
                Blocked Users
              </h3>
              <p className="text-xs text-[var(--text-muted)]">
                Manage users who are blocked from participating in the club
              </p>
              <BlockedUsersList clubId={clubId} />
            </section>

            {/* Transfer Ownership */}
            <section className="border-t border-[var(--border)] pt-6 space-y-4">
              <h3 className="text-base font-semibold text-[var(--club-accent,var(--text-primary))]">
                Transfer Ownership
              </h3>
              <TransferOwnershipForm clubId={clubId} members={memberOptions} />
            </section>

            {/* Archive Club */}
            <section className="border-t border-[var(--border)] pt-6 space-y-4">
              <h3 className="text-base font-semibold text-[var(--club-accent,var(--text-primary))]">
                Archive Club
              </h3>
              <ArchiveClubButton clubId={clubId} archived={club?.archived || false} />
            </section>

            {/* Delete Club */}
            <section className="border-t border-[var(--border)] pt-6 space-y-4">
              <h3 className="text-base font-semibold text-[var(--club-accent,var(--text-primary))]">
                Delete Club
              </h3>
              <DeleteClubButton clubId={clubId} clubName={club?.name || "Club"} />
            </section>
          </div>
        </div>
      </div>
    </>
  );
}
