import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { resolveClub } from "@/lib/clubs/resolveClub";
import { ClubNavigation } from "@/components/clubs/ClubNavigation";
import { DiscussClient } from "./discuss-client";
import { getThreadsByClub } from "@/app/actions/discussions";
import { getSpoilerStatesForThreads } from "@/app/actions/discussions/spoiler-utils";
import { PaginationControls } from "@/components/activity/PaginationControls";
import { isEndlessMode } from "@/lib/validation/club-settings";
import type { DiscussionTagType } from "@/app/actions/discussions";

const DEFAULT_PAGE_SIZE = 10;
const VALID_PAGE_SIZES = [10, 25, 50, 100];

interface DiscussPageProps {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ movie?: string; filter?: string; page?: string; size?: string }>;
}

export default async function DiscussPage({ params, searchParams }: DiscussPageProps) {
  const identifier = (await params).slug;
  const resolvedSearchParams = await searchParams;
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

  // If movie query param is present, redirect to that movie's discussion thread
  if (resolvedSearchParams.movie) {
    const tmdbId = parseInt(resolvedSearchParams.movie, 10);
    if (!isNaN(tmdbId)) {
      // Find existing thread for this movie
      const { data: existingThread } = await supabase
        .from("discussion_threads")
        .select("slug, id")
        .eq("club_id", clubId)
        .eq("tmdb_id", tmdbId)
        .maybeSingle();

      if (existingThread) {
        // Redirect to the thread using its slug
        redirect(`/club/${clubSlug}/discuss/${existingThread.slug || existingThread.id}`);
      }
      // If no thread exists, fall through to show the discussions page
    }
  }

  // Get club name + settings
  const { data: club } = await supabase
    .from("clubs")
    .select("name, settings")
    .eq("id", clubId)
    .single();

  const isEndlessFestival = isEndlessMode(club?.settings);

  // Parse filter, page, and size from search params
  const filterParam = resolvedSearchParams.filter;
  const activeFilter: DiscussionTagType | "all" =
    filterParam && ["movie", "actor", "director", "composer", "festival"].includes(filterParam)
      ? (filterParam as DiscussionTagType)
      : "all";
  const currentPage = Math.max(1, parseInt(resolvedSearchParams.page || "1", 10));
  const rawSize = parseInt(resolvedSearchParams.size || "", 10);
  const pageSize = VALID_PAGE_SIZES.includes(rawSize) ? rawSize : DEFAULT_PAGE_SIZE;
  const offset = (currentPage - 1) * pageSize;

  // Get threads with pagination + filtering
  const threadsResult = await getThreadsByClub(clubId, {
    tagType: activeFilter === "all" ? undefined : activeFilter,
    limit: pageSize,
    offset,
  });
  const threads = "data" in threadsResult ? threadsResult.data : [];
  const totalThreads = "data" in threadsResult ? threadsResult.total : 0;
  const totalPages = Math.ceil(totalThreads / pageSize);

  // Build filter params string for pagination (preserve filter param)
  const filterParamsForPagination = activeFilter !== "all" ? `filter=${activeFilter}` : "";

  // Get spoiler states for fetched threads
  const spoilerStates = await getSpoilerStatesForThreads(threads, user.id);

  const isAdmin = membership?.role === "producer" || membership?.role === "director";
  const isProducer = membership?.role === "producer" || false;

  return (
    <>
      <ClubNavigation
        clubSlug={clubSlug}
        clubName={club?.name || "Club"}
        isAdmin={isAdmin}
        isProducer={isProducer}
      />
      <div className="">
        <div className="max-w-3xl mx-auto px-4 lg:px-6 py-6">
          {/* Header - Desktop only */}
          <div className="hidden md:block mb-6">
            <h1 className="text-lg font-semibold text-[var(--club-accent,var(--text-primary))]">
              Discussions
            </h1>
            <p className="text-xs text-[var(--text-muted)]">
              Discuss movies and connect with members
            </p>
          </div>

          <DiscussClient
            threads={threads}
            spoilerStates={spoilerStates}
            clubId={clubId}
            clubSlug={clubSlug}
            currentUserId={user.id}
            activeFilter={activeFilter}
            isEndlessFestival={isEndlessFestival}
          />

          {(totalPages > 1 || pageSize !== DEFAULT_PAGE_SIZE) && (
            <div className="mt-8 pt-4 border-t border-[var(--border)]">
              <PaginationControls
                currentPage={currentPage}
                totalPages={totalPages}
                totalItems={totalThreads}
                pageSize={pageSize}
                basePath={`/club/${clubSlug}/discuss`}
                filterParams={filterParamsForPagination}
                pageSizeOptions={VALID_PAGE_SIZES}
              />
            </div>
          )}
        </div>
      </div>
    </>
  );
}
