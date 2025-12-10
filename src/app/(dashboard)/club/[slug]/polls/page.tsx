import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { ChartBar, Plus } from "@phosphor-icons/react/dist/ssr";
import { Button } from "@/components/ui/button";
import { resolveClub } from "@/lib/clubs/resolveClub";
import { ClubNavigation } from "@/components/clubs/ClubNavigation";
import { PollsList } from "@/components/clubs/PollsList";
import { PastPollsList } from "@/components/clubs/PastPollsList";
import { CreatePollModal } from "@/components/clubs/CreatePollModal";
import { PaginationControls } from "@/components/ui/pagination";
import { getPollsWithVotes } from "@/app/actions/clubs/polls";
import { Spinner } from "@/components/ui/spinner";

interface PollsPageProps {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ page?: string }>;
}

const POLLS_PER_PAGE = 10;

export default async function PollsPage({ params, searchParams }: PollsPageProps) {
  const identifier = (await params).slug;
  const { page: pageParam } = await searchParams;
  const currentPage = Math.max(1, parseInt(pageParam || "1", 10));

  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/sign-in");

  // Resolve club by slug or ID
  const clubResolution = await resolveClub(supabase, identifier);
  if (!clubResolution) redirect("/clubs");

  const clubId = clubResolution.id;
  const clubSlug = clubResolution.slug || clubId;

  // Check membership
  const { data: membership } = await supabase
    .from("club_members")
    .select("role")
    .eq("club_id", clubId)
    .eq("user_id", user.id)
    .maybeSingle();

  if (!membership) {
    redirect(`/club/${clubSlug}`);
  }

  const isAdmin = membership?.role === "producer" || membership?.role === "director";
  const isProducer = membership?.role === "producer" || false;

  // Get club info
  const { data: club } = await supabase.from("clubs").select("name").eq("id", clubId).single();

  // Fetch active polls
  const { data: activePolls } = await getPollsWithVotes(clubId, { active: true });

  // Fetch past polls with pagination
  const offset = (currentPage - 1) * POLLS_PER_PAGE;
  const { data: pastPolls, total: totalPastPolls } = await getPollsWithVotes(clubId, {
    active: false,
    limit: POLLS_PER_PAGE,
    offset,
  });

  const totalPages = Math.ceil(totalPastPolls / POLLS_PER_PAGE);

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
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-lg font-semibold text-[var(--club-accent,var(--text-primary))]">
                Polls
              </h1>
              <p className="text-xs text-[var(--text-muted)]">
                {activePolls?.length || 0} active · {totalPastPolls} past
              </p>
            </div>
            {isAdmin && (
              <>
                {/* Desktop: full button */}
                <div className="hidden md:block">
                  <CreatePollModal clubId={clubId} />
                </div>
                {/* Mobile: compact circle button */}
                <div className="md:hidden">
                  <CreatePollModal
                    clubId={clubId}
                    trigger={
                      <Button size="icon-sm" variant="club-accent" className="rounded-full">
                        <Plus className="h-3.5 w-3.5" />
                      </Button>
                    }
                  />
                </div>
              </>
            )}
          </div>
          {/* Active Polls Section */}
          <section className="mb-8">
            <Suspense
              fallback={
                <div className="flex items-center justify-center py-8">
                  <Spinner size="md" />
                </div>
              }
            >
              {activePolls && activePolls.length > 0 ? (
                <PollsList
                  clubId={clubId}
                  polls={activePolls.map((poll) => ({
                    id: poll.id,
                    question: poll.question,
                    options: poll.options,
                    created_at: poll.created_at,
                    expires_at: poll.expires_at,
                    user: poll.user,
                  }))}
                  isAdmin={isAdmin}
                />
              ) : (
                <div className="text-center py-8 rounded-xl border border-dashed border-[var(--border)] bg-[var(--card)]">
                  <ChartBar className="h-10 w-10 mx-auto mb-3 text-[var(--text-muted)] opacity-50" />
                  <p className="text-sm text-[var(--text-muted)]">No active polls right now</p>
                  {isAdmin && (
                    <p className="text-xs text-[var(--text-muted)] mt-1">
                      Create a poll to gather member opinions
                    </p>
                  )}
                </div>
              )}
            </Suspense>
          </section>

          {/* Past Polls Section */}
          <section>
            {(pastPolls?.length ?? 0) > 0 && (
              <h2 className="text-sm font-semibold text-[var(--text-muted)] mb-3">Past Polls</h2>
            )}
            <Suspense
              fallback={
                <div className="flex items-center justify-center py-8">
                  <Spinner size="md" />
                </div>
              }
            >
              <PastPollsList polls={pastPolls || []} emptyMessage="No past polls yet" />
            </Suspense>

            {/* Pagination */}
            {totalPages > 1 && (
              <PaginationControls
                currentPage={currentPage}
                totalPages={totalPages}
                basePath={`/club/${clubSlug}/polls`}
              />
            )}
          </section>
        </div>
      </div>
    </>
  );
}
