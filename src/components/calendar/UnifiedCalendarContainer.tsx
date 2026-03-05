import { createClient } from "@/lib/supabase/server";
import { UnifiedCalendar, Club, Season, Festival, ClubEvent } from "./UnifiedCalendar";
import { CalendarBlank } from "@phosphor-icons/react/dist/ssr";
import { EmptyState } from "@/components/shared/EmptyState";

interface UnifiedCalendarContainerProps {
  mode: "global" | "club";
  userId: string;
  clubId?: string; // Required for club mode
  clubSlug?: string; // Required for club mode
}

export async function UnifiedCalendarContainer({
  mode,
  userId,
  clubId,
  clubSlug,
}: UnifiedCalendarContainerProps) {
  const supabase = await createClient();

  let clubs: Club[] = [];
  let clubIds: string[] = [];

  if (mode === "global") {
    // Fetch all clubs user belongs to
    const { data: memberships, error: membershipError } = await supabase
      .from("club_members")
      .select(
        `
        club_id,
        clubs:club_id (
          id,
          name,
          slug
        )
      `
      )
      .eq("user_id", userId);

    if (membershipError) {
      console.error("Error fetching memberships:", membershipError);
    }

    if (memberships) {
      clubs = memberships
        .map((m) => {
          const clubData = m.clubs as unknown as { id: string; name: string; slug: string } | null;
          return clubData
            ? {
                id: clubData.id,
                name: clubData.name,
                slug: clubData.slug,
              }
            : null;
        })
        .filter((c): c is Club => c !== null);
      clubIds = clubs.map((c) => c.id);
    }
  } else if (clubId) {
    // Single club mode
    const { data: club, error: clubError } = await supabase
      .from("clubs")
      .select("id, name, slug")
      .eq("id", clubId)
      .single();

    if (clubError) {
      console.error("Error fetching club:", clubError);
    }

    if (club) {
      clubs = [{ id: club.id, name: club.name, slug: club.slug }];
      clubIds = [club.id];
    }
  }

  if (clubIds.length === 0) {
    return (
      <EmptyState
        icon={CalendarBlank}
        title="No clubs found"
        message={mode === "global" ? "Join a club to see calendar data here." : "Club not found."}
        variant="inline"
      />
    );
  }

  // Fetch seasons for all clubs
  const { data: seasonsData, error: seasonsError } = await supabase
    .from("seasons")
    .select("id, name, subtitle, start_date, end_date, club_id")
    .in("club_id", clubIds)
    .order("start_date", { ascending: false });

  if (seasonsError) {
    console.error("Error fetching seasons:", seasonsError);
  }

  // Fetch festivals for all clubs
  const { data: festivalsData, error: festivalsError } = await supabase
    .from("festivals")
    .select(
      `
      id,
      slug,
      theme,
      status,
      phase,
      start_date,
      nomination_deadline,
      watch_deadline,
      rating_deadline,
      results_date,
      season_id,
      club_id
    `
    )
    .in("club_id", clubIds)
    .in("status", ["idle", "nominating", "watching", "rating", "completed"])
    .order("start_date", { ascending: false });

  if (festivalsError) {
    console.error("Error fetching festivals:", festivalsError);
  }

  // Fetch events for all clubs
  const { data: eventsData, error: eventsError } = await supabase
    .from("club_events")
    .select(
      `
      id,
      title,
      description,
      event_type,
      event_date,
      end_date,
      status,
      location,
      club_id
    `
    )
    .in("club_id", clubIds)
    .in("status", ["upcoming", "ongoing"])
    .order("event_date", { ascending: true });

  if (eventsError) {
    console.error("Error fetching events:", eventsError);
  }

  // Fetch RSVPs for events to get counts
  let eventsWithRsvps: ClubEvent[] = [];
  if (eventsData && eventsData.length > 0) {
    const eventIds = eventsData.map((e) => e.id);
    const { data: rsvpsData } = await supabase
      .from("club_event_rsvps")
      .select("event_id, status")
      .in("event_id", eventIds);

    const rsvpCounts = new Map<string, { going: number; maybe: number; not_going: number }>();
    eventIds.forEach((id) => {
      rsvpCounts.set(id, { going: 0, maybe: 0, not_going: 0 });
    });

    rsvpsData?.forEach((rsvp) => {
      const counts = rsvpCounts.get(rsvp.event_id);
      if (counts) {
        if (rsvp.status === "going") counts.going++;
        else if (rsvp.status === "maybe") counts.maybe++;
        else if (rsvp.status === "not_going") counts.not_going++;
      }
    });

    // Map clubs to events
    const clubMap = new Map(clubs.map((c) => [c.id, c]));

    eventsWithRsvps = eventsData.map((event) => ({
      ...event,
      event_type: event.event_type as ClubEvent["event_type"],
      club: clubMap.get(event.club_id),
      rsvp_counts: rsvpCounts.get(event.id),
    }));
  }

  // Map clubs to festivals and seasons
  const clubMap = new Map(clubs.map((c) => [c.id, c]));

  const seasons: Season[] = (seasonsData || []).map((s) => ({
    ...s,
    club: clubMap.get(s.club_id),
  }));

  const festivals: Festival[] = (festivalsData || []).map((f) => ({
    ...f,
    club: clubMap.get(f.club_id),
  }));

  const events: ClubEvent[] = eventsWithRsvps;

  // Show empty state if no data at all
  if (seasons.length === 0 && festivals.length === 0 && events.length === 0) {
    return (
      <EmptyState
        icon={CalendarBlank}
        title="No calendar data yet"
        message={
          mode === "global"
            ? "Calendar events will appear here once your clubs have festivals or events scheduled."
            : "Calendar events will appear here once you have seasons, festivals, or events scheduled."
        }
        variant="inline"
      />
    );
  }

  return (
    <UnifiedCalendar
      mode={mode}
      clubs={clubs}
      seasons={seasons}
      festivals={festivals}
      events={events}
      currentClubSlug={clubSlug}
    />
  );
}
