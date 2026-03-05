import { createClient } from "@/lib/supabase/server";
import { redirect, notFound } from "next/navigation";
import { Section, Container } from "@/components/ui/section";
import { resolveClub, resolveThread } from "@/lib/clubs/resolveClub";
import { ClubNavigation } from "@/components/clubs/ClubNavigation";
import { DiscussionComment, ContinuedThreadContext } from "@/components/discussions";
import { getCommentSubtree } from "@/app/actions/discussions/comments";
import { getDiscussionPreferences } from "@/app/actions/discussion-preferences";

interface ContinuedThreadPageProps {
  params: Promise<{
    slug: string;
    "thread-slug": string;
    commentId: string;
  }>;
}

export default async function ContinuedThreadPage({ params }: ContinuedThreadPageProps) {
  const resolvedParams = await params;
  const identifier = resolvedParams.slug;
  const threadIdentifier = resolvedParams["thread-slug"];
  const commentId = resolvedParams.commentId;
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
    .select("role")
    .eq("club_id", clubId)
    .eq("user_id", user.id)
    .maybeSingle();

  if (!membership) {
    redirect("/clubs");
  }

  // Get club name
  const { data: club } = await supabase.from("clubs").select("name").eq("id", clubId).single();

  // Resolve thread by slug or ID
  const threadResolution = await resolveThread(supabase, clubId, threadIdentifier);
  if (!threadResolution) {
    notFound();
  }

  // Get the comment subtree and discussion preferences in parallel
  const [subtreeResult, discussionPreferences] = await Promise.all([
    getCommentSubtree(commentId),
    getDiscussionPreferences(),
  ]);

  if ("error" in subtreeResult) {
    notFound();
  }

  const { anchor, threadTitle, threadSlug, clubSlug, parentComment } = subtreeResult.data;

  // Verify the comment belongs to the resolved thread
  if (subtreeResult.data.threadId !== threadResolution.id) {
    notFound();
  }

  const isAdmin = membership?.role === "producer" || membership?.role === "director";
  const isProducer = membership?.role === "producer" || false;
  const resolvedClubSlug = clubResolution.slug || clubId;
  const resolvedThreadSlug = threadSlug || threadResolution.id;

  return (
    <>
      <ClubNavigation
        clubSlug={resolvedClubSlug}
        clubName={club?.name || "Club"}
        isAdmin={isAdmin}
        isProducer={isProducer}
      />
      <Section variant="default" fullWidth>
        <Container size="md" className="!p-4 md:!p-6">
          {/* Navigation context */}
          <ContinuedThreadContext
            threadTitle={threadTitle}
            threadSlug={resolvedThreadSlug}
            clubSlug={clubSlug}
            parentCommentAuthor={parentComment?.authorName}
            parentCommentSnippet={parentComment?.contentSnippet}
          />

          {/* Comment subtree - rendered at depth 0 for full width */}
          <div className="rounded-lg border border-[var(--border)] bg-[var(--card)] p-3 sm:p-4">
            <DiscussionComment
              comment={anchor}
              threadId={subtreeResult.data.threadId}
              currentUserId={user.id}
              depth={0}
              clubSlug={clubSlug}
              threadSlug={resolvedThreadSlug}
              discussionPreferences={discussionPreferences}
            />
          </div>
        </Container>
      </Section>
    </>
  );
}
