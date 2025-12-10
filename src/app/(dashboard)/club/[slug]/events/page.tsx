import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { CalendarBlank, Plus } from "@phosphor-icons/react/dist/ssr";
import { Button } from "@/components/ui/button";
import { resolveClub } from "@/lib/clubs/resolveClub";
import { ClubNavigation } from "@/components/clubs/ClubNavigation";
import { EventsList } from "@/components/events/EventsList";
import { PastEventsList } from "@/components/events/PastEventsList";
import { CreateEventModal } from "@/components/events/CreateEventModal";
import { PaginationControls } from "@/components/ui/pagination";
import { getPastEvents, type ClubEvent, type RSVPStatus } from "@/app/actions/events";
import { Spinner } from "@/components/ui/spinner";

interface EventsPageProps {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ page?: string }>;
}

const EVENTS_PER_PAGE = 10;

export default async function EventsPage({ params, searchParams }: EventsPageProps) {
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

  const now = new Date().toISOString();

  // Fetch upcoming events
  const { data: upcomingEvents } = await supabase
    .from("club_events")
    .select(
      `
      *,
      creator:created_by (id, display_name, avatar_url),
      movie:tmdb_id (tmdb_id, title, poster_url)
    `
    )
    .eq("club_id", clubId)
    .in("status", ["upcoming", "ongoing"])
    .gte("event_date", now)
    .order("event_date", { ascending: true })
    .limit(10);

  // Get user's RSVPs for upcoming events
  const userRsvpMap = new Map<string, RSVPStatus>();
  if (upcomingEvents && upcomingEvents.length > 0) {
    const eventIds = upcomingEvents.map((e) => e.id);

    const { data: rsvps } = await supabase
      .from("club_event_rsvps")
      .select("event_id, status")
      .eq("user_id", user.id)
      .in("event_id", eventIds);

    rsvps?.forEach((r) => {
      userRsvpMap.set(r.event_id, r.status as RSVPStatus);
    });

    // Get RSVP counts
    const { data: allRsvps } = await supabase
      .from("club_event_rsvps")
      .select("event_id, status")
      .in("event_id", eventIds);

    upcomingEvents.forEach((event: ClubEvent) => {
      const eventRsvps = allRsvps?.filter((r) => r.event_id === event.id) || [];
      event.rsvp_counts = {
        going: eventRsvps.filter((r) => r.status === "going").length,
        maybe: eventRsvps.filter((r) => r.status === "maybe").length,
        not_going: eventRsvps.filter((r) => r.status === "not_going").length,
      };
    });
  }

  // Transform upcoming events
  const transformedUpcomingEvents: ClubEvent[] = (upcomingEvents || []).map((event) => ({
    ...event,
    creator: Array.isArray(event.creator) ? event.creator[0] : event.creator,
    movie: Array.isArray(event.movie) ? event.movie[0] : event.movie,
  }));

  // Fetch cancelled events for admins
  let cancelledEvents: ClubEvent[] = [];
  if (isAdmin) {
    const { data: cancelled } = await supabase
      .from("club_events")
      .select(
        `
        *,
        creator:created_by (id, display_name, avatar_url),
        movie:tmdb_id (tmdb_id, title, poster_url)
      `
      )
      .eq("club_id", clubId)
      .eq("status", "cancelled")
      .order("event_date", { ascending: false })
      .limit(20);

    cancelledEvents = (cancelled || []).map((event) => ({
      ...event,
      creator: Array.isArray(event.creator) ? event.creator[0] : event.creator,
      movie: Array.isArray(event.movie) ? event.movie[0] : event.movie,
    })) as ClubEvent[];
  }

  // Fetch past events with pagination
  const offset = (currentPage - 1) * EVENTS_PER_PAGE;
  const { data: pastEvents, total: totalPastEvents } = await getPastEvents(clubId, {
    limit: EVENTS_PER_PAGE,
    offset,
  });

  const totalPages = Math.ceil(totalPastEvents / EVENTS_PER_PAGE);

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
          {/* Header - Desktop only */}
          <div className="hidden md:flex items-center justify-between mb-6">
            <div>
              <h1 className="text-lg font-semibold text-[var(--club-accent,var(--text-primary))]">
                Events
              </h1>
              <p className="text-xs text-[var(--text-muted)]">
                {transformedUpcomingEvents.length} upcoming · {totalPastEvents} past
                {isAdmin && cancelledEvents.length > 0 && ` · ${cancelledEvents.length} cancelled`}
              </p>
            </div>
            {isAdmin && <CreateEventModal clubId={clubId} />}
          </div>
          {/* Upcoming Events Section */}
          <section className="mb-8">
            {/* Mobile-only compact create button */}
            {isAdmin && (
              <div className="flex justify-end mb-3 md:hidden">
                <CreateEventModal
                  clubId={clubId}
                  trigger={
                    <Button size="icon-sm" variant="club-accent" className="rounded-full">
                      <Plus className="h-3.5 w-3.5" />
                    </Button>
                  }
                />
              </div>
            )}
            <Suspense
              fallback={
                <div className="flex items-center justify-center py-8">
                  <Spinner size="md" />
                </div>
              }
            >
              {transformedUpcomingEvents.length > 0 ? (
                <EventsList
                  events={transformedUpcomingEvents}
                  clubSlug={clubSlug}
                  userRsvps={userRsvpMap}
                  isAdmin={isAdmin}
                />
              ) : (
                <div className="text-center py-8 rounded-xl border border-dashed border-[var(--border)] bg-[var(--card)]">
                  <CalendarBlank className="h-10 w-10 mx-auto mb-3 text-[var(--text-muted)] opacity-50" />
                  <p className="text-sm text-[var(--text-muted)]">No upcoming events</p>
                  {isAdmin && (
                    <p className="text-xs text-[var(--text-muted)] mt-1">
                      Schedule an event to bring members together
                    </p>
                  )}
                </div>
              )}
            </Suspense>
          </section>

          {/* Past Events Section */}
          <section>
            {(pastEvents?.length ?? 0) > 0 && (
              <h2 className="text-sm font-semibold text-[var(--text-muted)] mb-3">Past Events</h2>
            )}
            <Suspense
              fallback={
                <div className="flex items-center justify-center py-8">
                  <Spinner size="md" />
                </div>
              }
            >
              <PastEventsList
                events={pastEvents || []}
                emptyMessage="No past events yet"
                isAdmin={isAdmin}
              />
            </Suspense>

            {/* Pagination */}
            {totalPages > 1 && (
              <PaginationControls
                currentPage={currentPage}
                totalPages={totalPages}
                basePath={`/club/${clubSlug}/events`}
              />
            )}
          </section>

          {/* Cancelled Events Section (Admin Only) */}
          {isAdmin && cancelledEvents.length > 0 && (
            <section className="mt-8">
              <Suspense
                fallback={
                  <div className="flex items-center justify-center py-8">
                    <Spinner size="md" />
                  </div>
                }
              >
                <EventsList
                  events={cancelledEvents}
                  clubSlug={clubSlug}
                  isAdmin={isAdmin}
                  emptyMessage="No cancelled events"
                />
              </Suspense>
            </section>
          )}
        </div>
      </div>
    </>
  );
}
