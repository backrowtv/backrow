import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { ClubNavigation } from "@/components/clubs/ClubNavigation";
import { MobileBackButton } from "@/components/profile/MobileBackButton";
import { HomepageFeaturedMovies } from "@/components/festivals";
import { resolveClub } from "@/lib/clubs/resolveClub";
import { Warning } from "@phosphor-icons/react/dist/ssr";
import Link from "next/link";
import { Button } from "@/components/ui/button";

// The official BackRow Featured Club slug
const BACKROW_FEATURED_SLUG = "backrow-featured";

// Admin email that always has access
const ADMIN_EMAIL = "stephen@backrow.tv";

interface HomepageMoviesPageProps {
  params: Promise<{ slug: string }>;
}

export default async function HomepageMoviesPage({ params }: HomepageMoviesPageProps) {
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

  // Check if this is the BackRow Featured Club
  const { data: club } = await supabase
    .from("clubs")
    .select("name, slug, settings")
    .eq("id", clubId)
    .single();

  // Check if user is an admin of this club OR is the site admin
  const { data: membership } = await supabase
    .from("club_members")
    .select("role")
    .eq("club_id", clubId)
    .eq("user_id", user.id)
    .maybeSingle();

  const isClubAdmin = membership?.role === "producer" || membership?.role === "director";
  const isSiteAdmin = user.email === ADMIN_EMAIL;
  const isProducer = membership?.role === "producer" || isSiteAdmin;

  // This page is ONLY for the BackRow Featured Club
  if (club?.slug !== BACKROW_FEATURED_SLUG) {
    return (
      <>
        <ClubNavigation
          clubSlug={clubSlug}
          clubName={club?.name || "Club"}
          isAdmin={isClubAdmin || isSiteAdmin}
          isProducer={isProducer}
        />
        <div className="bg-[var(--background)]">
          <div className="max-w-3xl mx-auto px-4 lg:px-6 py-6">
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <div className="w-12 h-12 rounded-xl bg-[var(--surface-2)] flex items-center justify-center mb-4">
                <Warning className="h-6 w-6 text-[var(--text-muted)]" />
              </div>
              <h2 className="text-lg font-semibold text-[var(--text-primary)] mb-1">
                Not Available
              </h2>
              <p className="text-sm text-[var(--text-muted)] mb-6 max-w-md">
                Homepage movies can only be managed from the official BackRow Featured Club.
              </p>
              <Link href={`/club/${clubSlug}/manage/festival`}>
                <Button variant="secondary" size="sm">
                  Festival Settings
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </>
    );
  }

  // Must be club admin or site admin
  if (!isClubAdmin && !isSiteAdmin) {
    redirect(`/club/${clubSlug}`);
  }

  // Check if club uses endless festivals
  const clubSettings = club?.settings as Record<string, unknown> | null;
  const isEndlessFestival = clubSettings?.festival_type === "endless";

  if (!isEndlessFestival) {
    return (
      <>
        <ClubNavigation
          clubSlug={clubSlug}
          clubName={club?.name || "Club"}
          isAdmin={isClubAdmin || isSiteAdmin}
          isProducer={isProducer}
        />
        <div className="bg-[var(--background)]">
          <div className="max-w-3xl mx-auto px-4 lg:px-6 py-6">
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <div className="w-12 h-12 rounded-xl bg-[var(--surface-2)] flex items-center justify-center mb-4">
                <Warning className="h-6 w-6 text-[var(--text-muted)]" />
              </div>
              <h2 className="text-lg font-semibold text-[var(--text-primary)] mb-1">
                Not Available
              </h2>
              <p className="text-sm text-[var(--text-muted)] mb-6 max-w-md">
                Homepage movies are only available for Endless Festival clubs.
              </p>
              <Link href={`/club/${clubSlug}/manage/festival`}>
                <Button variant="secondary" size="sm">
                  Festival Settings
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <ClubNavigation
        clubSlug={clubSlug}
        clubName={club?.name || "Club"}
        isAdmin={isClubAdmin || isSiteAdmin}
        isProducer={isProducer}
      />
      <div className="bg-[var(--background)]">
        <div className="max-w-3xl mx-auto px-4 lg:px-6 py-6">
          {/* Mobile Back Button */}
          <MobileBackButton href={`/club/${clubSlug}/manage`} label="Manage" />

          {/* Header - Hidden on mobile since TopNav shows club name */}
          <div className="hidden lg:block mb-6">
            <h1 className="text-lg font-semibold text-[var(--text-primary)]">Homepage Movies</h1>
            <p className="text-xs text-[var(--text-muted)]">
              Manage movies shown on the BackRow homepage
            </p>
          </div>

          {/* Content */}
          <HomepageFeaturedMovies clubId={clubId} clubSlug={clubSlug} />
        </div>
      </div>
    </>
  );
}
