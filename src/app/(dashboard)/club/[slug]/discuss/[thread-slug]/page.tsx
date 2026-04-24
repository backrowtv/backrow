import { createClient } from "@/lib/supabase/server";
import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "@phosphor-icons/react/dist/ssr";
import { Section, Container } from "@/components/ui/section";
import { Button } from "@/components/ui/button";
import { resolveClub, resolveThread } from "@/lib/clubs/resolveClub";
import { ClubNavigation } from "@/components/clubs/ClubNavigation";
import { DiscussionThread } from "@/components/discussions";
import { getThreadById } from "@/app/actions/discussions";
import { getSpoilerStatesForThreads } from "@/app/actions/discussions/spoiler-utils";
import { getDiscussionPreferences } from "@/app/actions/discussion-preferences";

interface ThreadPageProps {
  params: Promise<{ slug: string; "thread-slug": string }>;
}

export default async function ThreadPage({ params }: ThreadPageProps) {
  const resolvedParams = await params;
  const identifier = resolvedParams.slug;
  const threadIdentifier = resolvedParams["thread-slug"];
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

  // Check if user is a member
  const { data: membership } = await supabase
    .from("club_members")
    .select("role, preferences")
    .eq("club_id", clubId)
    .eq("user_id", user.id)
    .maybeSingle();

  if (!membership) {
    redirect("/clubs");
  }

  const memberPrefs = (membership.preferences as Record<string, unknown>) || {};
  const disableSpoilerGate = memberPrefs.disable_spoiler_warnings === true;

  // Get club name
  const { data: club } = await supabase.from("clubs").select("name").eq("id", clubId).single();

  // Resolve thread by slug or ID
  const threadResolution = await resolveThread(supabase, clubId, threadIdentifier);
  if (!threadResolution) {
    notFound();
  }

  // Get full thread data
  const threadResult = await getThreadById(threadResolution.id);

  if ("error" in threadResult) {
    notFound();
  }

  const thread = threadResult.data;

  // Verify thread belongs to this club (double-check)
  if (thread.club_id !== clubId) {
    notFound();
  }

  const [discussionPreferences, spoilerStates] = await Promise.all([
    getDiscussionPreferences(),
    getSpoilerStatesForThreads([thread], user.id, { disableGate: disableSpoilerGate }),
  ]);
  const spoilerState = spoilerStates[thread.id];

  const isAdmin = membership?.role === "producer" || membership?.role === "director";
  const isProducer = membership?.role === "producer" || false;
  const clubSlug = clubResolution.slug || clubId;

  // If accessed by ID but has a slug, redirect to slug URL for SEO
  const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
    threadIdentifier
  );
  if (isUUID && threadResolution.slug) {
    redirect(`/club/${clubSlug}/discuss/${threadResolution.slug}`);
  }

  return (
    <>
      <ClubNavigation
        clubSlug={clubSlug}
        clubName={club?.name || "Club"}
        isAdmin={isAdmin}
        isProducer={isProducer}
      />
      <Section variant="default" fullWidth>
        <Container size="md" className="!p-4 md:!p-6">
          {/* Back link */}
          <Link href={`/club/${clubSlug}/discuss`}>
            <Button variant="ghost" size="sm" className="mb-4 -ml-2">
              <ArrowLeft className="w-4 h-4 mr-1" />
              Back to Discussions
            </Button>
          </Link>

          {/* Thread */}
          <DiscussionThread
            thread={thread}
            spoilerState={spoilerState}
            currentUserId={user.id}
            isAdmin={isAdmin}
            showFullContent={true}
            clubSlug={clubSlug}
            discussionPreferences={discussionPreferences}
          />
        </Container>
      </Section>
    </>
  );
}
