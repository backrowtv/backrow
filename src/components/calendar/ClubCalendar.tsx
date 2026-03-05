import { createClient } from "@/lib/supabase/server";
import Link from "next/link";
import {
  TimelineItemCompact,
  TimelineCompactList,
  type TimelineItemCompactData,
  type TimelineItemType,
} from "@/components/timeline/TimelineItemCompact";

interface ClubCalendarProps {
  clubId: string;
  userId: string;
  excludeType?: "nomination_deadline" | "watch_rate_deadline" | "festival_start" | null;
  showClubInfo?: boolean; // Hide club avatar/name when already on club page
}

export async function ClubCalendar({
  clubId,
  userId: _userId,
  excludeType,
  showClubInfo = true,
}: ClubCalendarProps) {
  const supabase = await createClient();

  // Get club info including avatar data
  const { data: club } = await supabase
    .from("clubs")
    .select(
      "slug, name, picture_url, settings, avatar_icon, avatar_color_index, avatar_border_color_index"
    )
    .eq("id", clubId)
    .single();

  if (!club?.slug) {
    return null;
  }

  const clubSlug = club.slug;
  const clubName = club.name;
  const clubAvatarUrl = club.picture_url;
  const clubAvatarIcon = club.avatar_icon;
  const clubAvatarColorIndex = club.avatar_color_index;
  const clubAvatarBorderColorIndex = club.avatar_border_color_index;

  const now = new Date();
  const ninetyDaysFromNow = new Date(now.getTime() + 90 * 24 * 60 * 60 * 1000);

  // Fetch festivals with upcoming deadlines
  const { data: festivals } = await supabase
    .from("festivals")
    .select(
      `
      id,
      slug,
      theme,
      phase,
      status,
      nomination_deadline,
      watch_deadline,
      rating_deadline,
      start_date
    `
    )
    .eq("club_id", clubId)
    .in("status", ["idle", "nominating", "watching", "rating"]);

  // Fetch upcoming events
  const { data: events } = await supabase
    .from("club_events")
    .select("id, title, event_date, event_type")
    .eq("club_id", clubId)
    .in("status", ["upcoming", "ongoing"])
    .gte("event_date", now.toISOString())
    .lte("event_date", ninetyDaysFromNow.toISOString())
    .order("event_date", { ascending: true })
    .limit(5);

  const upcomingItems: TimelineItemCompactData[] = [];

  // Add festival deadlines
  if (festivals) {
    for (const festival of festivals) {
      const festivalSlug = festival.slug;
      if (!festivalSlug) continue;

      const link = `/club/${clubSlug}/festival/${festivalSlug}`;
      const theme = festival.theme || "Festival";

      // Nomination deadline - only show when festival is in theme_selection phase
      if (
        festival.nomination_deadline &&
        excludeType !== "nomination_deadline" &&
        festival.phase === "theme_selection"
      ) {
        const deadline = new Date(festival.nomination_deadline);
        if (deadline > now && deadline <= ninetyDaysFromNow) {
          upcomingItems.push({
            id: `${festival.id}-nom`,
            type: "nomination_deadline" as TimelineItemType,
            date: festival.nomination_deadline,
            title: theme,
            clubName,
            clubSlug,
            clubAvatarUrl,
            clubAvatarIcon,
            clubAvatarColorIndex,
            clubAvatarBorderColorIndex,
            link,
            showClubInfo,
          });
        }
      }

      // Combined Watch & Rate deadline - use the later of the two dates
      // Only show if not excluded
      if (excludeType !== "watch_rate_deadline") {
        const watchDeadline = festival.watch_deadline ? new Date(festival.watch_deadline) : null;
        const ratingDeadline = festival.rating_deadline ? new Date(festival.rating_deadline) : null;

        // Use the later deadline (rating is typically the one that matters)
        const effectiveDeadline = ratingDeadline || watchDeadline;
        const effectiveDateStr = festival.rating_deadline || festival.watch_deadline;

        if (
          effectiveDeadline &&
          effectiveDateStr &&
          effectiveDeadline > now &&
          effectiveDeadline <= ninetyDaysFromNow
        ) {
          upcomingItems.push({
            id: `${festival.id}-watch-rate`,
            type: "watch_rate_deadline" as TimelineItemType,
            date: effectiveDateStr,
            title: theme,
            clubName,
            clubSlug,
            clubAvatarUrl,
            clubAvatarIcon,
            clubAvatarColorIndex,
            clubAvatarBorderColorIndex,
            link,
            showClubInfo,
          });
        }
      }

      // Festival start
      if (festival.start_date && festival.status === "idle" && excludeType !== "festival_start") {
        const startDate = new Date(festival.start_date);
        if (startDate > now && startDate <= ninetyDaysFromNow) {
          upcomingItems.push({
            id: `${festival.id}-start`,
            type: "festival_start" as TimelineItemType,
            date: festival.start_date,
            title: theme,
            clubName,
            clubSlug,
            clubAvatarUrl,
            clubAvatarIcon,
            clubAvatarColorIndex,
            clubAvatarBorderColorIndex,
            link,
            showClubInfo,
          });
        }
      }
    }
  }

  // Add events
  if (events) {
    for (const event of events) {
      upcomingItems.push({
        id: `event-${event.id}`,
        type: "event" as TimelineItemType,
        date: event.event_date,
        title: event.title,
        subtitle: event.event_type === "watch_party" ? "Watch Party" : "Event",
        clubName,
        clubSlug,
        clubAvatarUrl,
        clubAvatarIcon,
        clubAvatarColorIndex,
        clubAvatarBorderColorIndex,
        link: `/club/${clubSlug}`,
        eventType: event.event_type as TimelineItemCompactData["eventType"],
        showClubInfo,
      });
    }
  }

  // Sort by date
  upcomingItems.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

  // Take first 5 items
  const displayItems = upcomingItems.slice(0, 5);

  if (displayItems.length === 0) {
    return (
      <p className="text-sm text-[var(--text-muted)] text-center py-4">
        No upcoming deadlines or events
      </p>
    );
  }

  return (
    <div>
      <TimelineCompactList>
        {displayItems.map((item) => (
          <TimelineItemCompact key={item.id} item={item} />
        ))}
      </TimelineCompactList>

      {upcomingItems.length > 5 && (
        <Link
          href={`/club/${clubSlug}/upcoming`}
          className="block text-xs text-[var(--text-muted)] hover:text-[var(--primary)] transition-colors pt-2 pl-[60px]"
        >
          +{upcomingItems.length - 5} more →
        </Link>
      )}
    </div>
  );
}
