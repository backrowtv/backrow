import { createClient } from "@/lib/supabase/server";
import { CalendarDots } from "@phosphor-icons/react/dist/ssr";
import { TimelineView, Club } from "./TimelineView";
import { type TimelineItem, isUrgent } from "./timeline-utils";
import { EmptyState } from "@/components/shared/EmptyState";

interface TimelineContainerProps {
  mode: "global" | "club";
  userId: string;
  clubId?: string; // Required for club mode
  clubSlug?: string; // Required for club mode
}

export async function TimelineContainer({
  mode,
  userId,
  clubId,
  clubSlug: _clubSlug,
}: TimelineContainerProps) {
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
          slug,
          picture_url,
          avatar_icon,
          avatar_color_index,
          avatar_border_color_index
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
          const clubData = m.clubs as unknown as {
            id: string;
            name: string;
            slug: string;
            picture_url?: string | null;
            avatar_icon?: string | null;
            avatar_color_index?: number | null;
            avatar_border_color_index?: number | null;
          } | null;
          if (!clubData) return null;
          const club: Club = {
            id: clubData.id,
            name: clubData.name,
            slug: clubData.slug,
            picture_url: clubData.picture_url,
            avatar_icon: clubData.avatar_icon,
            avatar_color_index: clubData.avatar_color_index,
            avatar_border_color_index: clubData.avatar_border_color_index,
          };
          return club;
        })
        .filter((c): c is Club => c !== null);
      clubIds = clubs.map((c) => c.id);
    }
  } else if (clubId) {
    // Single club mode
    const { data: club, error: clubError } = await supabase
      .from("clubs")
      .select(
        "id, name, slug, picture_url, settings, avatar_icon, avatar_color_index, avatar_border_color_index"
      )
      .eq("id", clubId)
      .single();

    if (clubError) {
      console.error("Error fetching club:", clubError);
    }

    if (club) {
      clubs = [
        {
          id: club.id,
          name: club.name,
          slug: club.slug,
          picture_url: club.picture_url,
          avatar_icon: club.avatar_icon,
          avatar_color_index: club.avatar_color_index,
          avatar_border_color_index: club.avatar_border_color_index,
        },
      ];
      clubIds = [club.id];
    }
  }

  if (clubIds.length === 0) {
    return (
      <EmptyState
        icon={CalendarDots}
        title="No clubs found"
        message={mode === "global" ? "Join a club to see your timeline here." : "Club not found."}
        variant="inline"
      />
    );
  }

  // Fetch festivals for all clubs - include both active and completed
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
      club_id
    `
    )
    .in("club_id", clubIds)
    .in("status", ["idle", "nominating", "watching", "rating", "completed"])
    .order("start_date", { ascending: false });

  if (festivalsError) {
    console.error("Error fetching festivals:", festivalsError);
  }

  // Fetch events for all clubs with RSVP counts
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
      club_id,
      club_event_rsvps(count)
    `
    )
    .in("club_id", clubIds)
    .in("status", ["upcoming", "ongoing", "completed"])
    .order("event_date", { ascending: false });

  if (eventsError) {
    console.error("Error fetching events:", eventsError);
  }

  // Create club lookup map
  const clubMap = new Map(clubs.map((c) => [c.id, c]));

  // Transform data into timeline items
  const timelineItems: TimelineItem[] = [];

  // Helper to get date key (YYYY-MM-DD) for consolidation
  const getDateKey = (dateStr: string) => new Date(dateStr).toISOString().split("T")[0];

  // Process festivals
  if (festivalsData) {
    for (const festival of festivalsData) {
      const club = clubMap.get(festival.club_id);
      if (!club) continue;

      const festivalLink = `/club/${club.slug}/festival/${festival.slug}`;
      const theme = festival.theme || "Festival";

      // Festival start (not consolidated)
      if (festival.start_date) {
        timelineItems.push({
          id: `${festival.id}-start`,
          type: "festival_start",
          date: festival.start_date,
          title: theme,
          subtitle: "Festival begins",
          clubId: club.id,
          clubName: club.name,
          clubSlug: club.slug,
          clubAvatarUrl: club.picture_url,
          clubAvatarIcon: club.avatar_icon,
          clubAvatarColorIndex: club.avatar_color_index,
          clubAvatarBorderColorIndex: club.avatar_border_color_index,
          link: festivalLink,
          urgent: isUrgent(festival.start_date),
        });
      }

      // Nomination deadline (not consolidated)
      if (festival.nomination_deadline) {
        timelineItems.push({
          id: `${festival.id}-nomination`,
          type: "nomination_deadline",
          date: festival.nomination_deadline,
          title: theme,
          subtitle: "Submit your nominations",
          clubId: club.id,
          clubName: club.name,
          clubSlug: club.slug,
          clubAvatarUrl: club.picture_url,
          clubAvatarIcon: club.avatar_icon,
          clubAvatarColorIndex: club.avatar_color_index,
          clubAvatarBorderColorIndex: club.avatar_border_color_index,
          link: festivalLink,
          urgent: isUrgent(festival.nomination_deadline),
        });
      }

      // Consolidate watch/rating/results if they're on the same day
      // Rating deadline is primary when consolidating
      const watchDate = festival.watch_deadline ? getDateKey(festival.watch_deadline) : null;
      const ratingDate = festival.rating_deadline ? getDateKey(festival.rating_deadline) : null;
      const resultsDate = festival.results_date ? getDateKey(festival.results_date) : null;

      // Check which dates match the rating date (if rating exists)
      const watchMatchesRating = watchDate && ratingDate && watchDate === ratingDate;
      const resultsMatchesRating = resultsDate && ratingDate && resultsDate === ratingDate;

      if (festival.rating_deadline) {
        // Build consolidated subtitle
        const consolidatedParts: string[] = [];
        if (watchMatchesRating) consolidatedParts.push("watch deadline");
        if (resultsMatchesRating) consolidatedParts.push("results");

        let subtitle = "Submit your ratings";
        if (consolidatedParts.length > 0) {
          subtitle = `Ratings due · ${consolidatedParts.join(" & ")}`;
        }

        timelineItems.push({
          id: `${festival.id}-rating`,
          type: "rating_deadline",
          date: festival.rating_deadline,
          title: theme,
          subtitle,
          clubId: club.id,
          clubName: club.name,
          clubSlug: club.slug,
          clubAvatarUrl: club.picture_url,
          clubAvatarIcon: club.avatar_icon,
          clubAvatarColorIndex: club.avatar_color_index,
          clubAvatarBorderColorIndex: club.avatar_border_color_index,
          link: festivalLink,
          urgent: isUrgent(festival.rating_deadline),
        });
      }

      // Only add watch deadline if it's NOT on the same day as rating
      if (festival.watch_deadline && !watchMatchesRating) {
        timelineItems.push({
          id: `${festival.id}-watch`,
          type: "watch_deadline",
          date: festival.watch_deadline,
          title: theme,
          subtitle: "Watch movies by this date",
          clubId: club.id,
          clubName: club.name,
          clubSlug: club.slug,
          clubAvatarUrl: club.picture_url,
          clubAvatarIcon: club.avatar_icon,
          clubAvatarColorIndex: club.avatar_color_index,
          clubAvatarBorderColorIndex: club.avatar_border_color_index,
          link: festivalLink,
          urgent: isUrgent(festival.watch_deadline),
        });
      }

      // Only add results if it's NOT on the same day as rating
      if (festival.results_date && !resultsMatchesRating) {
        timelineItems.push({
          id: `${festival.id}-results`,
          type: "results",
          date: festival.results_date,
          title: theme,
          subtitle: "Results revealed",
          clubId: club.id,
          clubName: club.name,
          clubSlug: club.slug,
          clubAvatarUrl: club.picture_url,
          clubAvatarIcon: club.avatar_icon,
          clubAvatarColorIndex: club.avatar_color_index,
          clubAvatarBorderColorIndex: club.avatar_border_color_index,
          link: festivalLink,
          urgent: isUrgent(festival.results_date),
        });
      }
    }
  }

  // Process events
  if (eventsData) {
    for (const event of eventsData) {
      const club = clubMap.get(event.club_id);
      if (!club) continue;

      const eventTypeLabel =
        {
          watch_party: "Watch Party",
          discussion: "Discussion",
          meetup: "Meetup",
          custom: "Event",
        }[event.event_type as string] || "Event";

      // Extract RSVP count from the nested query result
      const rsvpData = event.club_event_rsvps as unknown as { count: number }[] | null;
      const attendeeCount = rsvpData?.[0]?.count ?? 0;

      timelineItems.push({
        id: `event-${event.id}`,
        type: "event",
        date: event.event_date,
        title: event.title,
        subtitle: eventTypeLabel,
        clubId: club.id,
        clubName: club.name,
        clubSlug: club.slug,
        clubAvatarUrl: club.picture_url,
        clubAvatarIcon: club.avatar_icon,
        clubAvatarColorIndex: club.avatar_color_index,
        clubAvatarBorderColorIndex: club.avatar_border_color_index,
        link: `/club/${club.slug}`,
        urgent: isUrgent(event.event_date),
        eventType: event.event_type as "watch_party" | "discussion" | "meetup" | "custom",
        location: event.location,
        attendeeCount,
      });
    }
  }

  // Sort by date (newest first for past, oldest first for upcoming)
  timelineItems.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

  return <TimelineView items={timelineItems} clubs={clubs} mode={mode} />;
}
