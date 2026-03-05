import { createClient } from "@/lib/supabase/server";
import { Card } from "@/components/ui/card";
import Link from "next/link";
import Image from "next/image";
import { DateDisplay } from "@/components/ui/date-display";
import { FormattedDate } from "@/components/ui/formatted-date";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

interface UpcomingDate {
  id: string;
  type: "nomination" | "watch" | "rating" | "festival_start";
  date: string;
  festival_id: string;
  festival_slug: string | null;
  festival_theme: string | null;
  club_id: string;
  club_slug: string | null;
  club_name: string | null;
  club_picture_url: string | null;
  phase: string;
  is_user_member: boolean;
}

async function getUpcomingDates(userId: string): Promise<UpcomingDate[]> {
  const supabase = await createClient();

  // Get user's club memberships
  const { data: memberships } = await supabase
    .from("club_members")
    .select("club_id")
    .eq("user_id", userId);

  if (!memberships || memberships.length === 0) {
    return [];
  }

  const clubIds = memberships.map((m) => m.club_id);
  const now = new Date();
  const sevenDaysFromNow = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

  // Get festivals with dates in next 7 days
  const { data: festivals } = await supabase
    .from("festivals")
    .select(
      `
      id,
      slug,
      theme,
      phase,
      nomination_deadline,
      watch_deadline,
      rating_deadline,
      start_date,
      club_id,
      clubs:club_id (
        name,
        slug,
        picture_url
      )
    `
    )
    .in("club_id", clubIds)
    .in("status", ["idle", "nominating", "watching"]);

  if (!festivals) {
    return [];
  }

  const upcomingDates: UpcomingDate[] = [];

  for (const festival of festivals) {
    const clubsRelation = Array.isArray(festival.clubs) ? festival.clubs[0] : festival.clubs;
    const club = clubsRelation as {
      name?: string | null;
      slug?: string | null;
      picture_url?: string | null;
    } | null;
    const clubName = club?.name || null;
    const clubSlug = club?.slug;
    const clubPictureUrl = club?.picture_url || null;
    const festivalSlug = festival.slug;

    // Skip if slugs are missing
    if (!clubSlug || !festivalSlug) {
      console.error("getUpcomingDates: Missing slugs", {
        clubSlug,
        festivalSlug,
        clubId: festival.club_id,
        festivalId: festival.id,
      });
      continue;
    }

    // Check each deadline type
    if (festival.nomination_deadline) {
      const deadlineDate = new Date(festival.nomination_deadline);
      if (deadlineDate >= now && deadlineDate <= sevenDaysFromNow) {
        upcomingDates.push({
          id: `${festival.id}-nomination`,
          type: "nomination",
          date: festival.nomination_deadline,
          festival_id: festival.id,
          festival_slug: festivalSlug,
          festival_theme: festival.theme,
          club_id: festival.club_id,
          club_slug: clubSlug,
          club_name: clubName,
          club_picture_url: clubPictureUrl,
          phase: festival.phase,
          is_user_member: true, // Already filtered by club membership
        });
      }
    }

    if (festival.watch_deadline) {
      const deadlineDate = new Date(festival.watch_deadline);
      if (deadlineDate >= now && deadlineDate <= sevenDaysFromNow) {
        upcomingDates.push({
          id: `${festival.id}-watch`,
          type: "watch",
          date: festival.watch_deadline,
          festival_id: festival.id,
          festival_slug: festivalSlug,
          festival_theme: festival.theme,
          club_id: festival.club_id,
          club_slug: clubSlug,
          club_name: clubName,
          club_picture_url: clubPictureUrl,
          phase: festival.phase,
          is_user_member: true,
        });
      }
    }

    if (festival.rating_deadline) {
      const deadlineDate = new Date(festival.rating_deadline);
      if (deadlineDate >= now && deadlineDate <= sevenDaysFromNow) {
        upcomingDates.push({
          id: `${festival.id}-rating`,
          type: "rating",
          date: festival.rating_deadline,
          festival_id: festival.id,
          festival_slug: festivalSlug,
          festival_theme: festival.theme,
          club_id: festival.club_id,
          club_slug: clubSlug,
          club_name: clubName,
          club_picture_url: clubPictureUrl,
          phase: festival.phase,
          is_user_member: true,
        });
      }
    }

    // Festival start date
    if (festival.start_date) {
      const startDate = new Date(festival.start_date);
      if (startDate >= now && startDate <= sevenDaysFromNow) {
        upcomingDates.push({
          id: `${festival.id}-start`,
          type: "festival_start",
          date: festival.start_date,
          festival_id: festival.id,
          festival_slug: festivalSlug,
          festival_theme: festival.theme,
          club_id: festival.club_id,
          club_slug: clubSlug,
          club_name: clubName,
          club_picture_url: clubPictureUrl,
          phase: festival.phase,
          is_user_member: true,
        });
      }
    }
  }

  // Sort by date
  return upcomingDates.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
}

function getHoursUntil(dateStr: string): number {
  const now = new Date();
  const targetDate = new Date(dateStr);
  const diffTime = targetDate.getTime() - now.getTime();
  return Math.floor(diffTime / (1000 * 60 * 60));
}

function getDaysUntil(dateStr: string): number {
  const now = new Date();
  const targetDate = new Date(dateStr);
  const diffTime = targetDate.getTime() - now.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  return diffDays;
}

function formatTimeOfDay(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleTimeString([], {
    hour: "numeric",
    minute: "2-digit",
  });
}

function _getPersonalizedMessage(item: UpcomingDate): string {
  const hoursUntil = getHoursUntil(item.date);
  const daysUntil = getDaysUntil(item.date);
  const time = formatTimeOfDay(item.date);

  if (hoursUntil < 0) {
    return "Past deadline";
  }

  // Within 48 hours - show exact time
  if (hoursUntil < 48) {
    const now = new Date();
    const targetDate = new Date(item.date);
    const isToday = targetDate.toDateString() === now.toDateString();
    const tomorrow = new Date(now);
    tomorrow.setDate(tomorrow.getDate() + 1);
    const isTomorrow = targetDate.toDateString() === tomorrow.toDateString();

    if (isToday) {
      if (hoursUntil < 1) {
        const minutesUntil = Math.max(
          0,
          Math.floor((targetDate.getTime() - now.getTime()) / (1000 * 60))
        );
        switch (item.type) {
          case "nomination":
            return `Due in ${minutesUntil} min at ${time}!`;
          case "watch":
            return `Watch due in ${minutesUntil} min at ${time}!`;
          case "rating":
            return `Rating due in ${minutesUntil} min at ${time}!`;
          case "festival_start":
            return `Starts in ${minutesUntil} min at ${time}!`;
        }
      }
      switch (item.type) {
        case "nomination":
          return `Due today at ${time}`;
        case "watch":
          return `Watch deadline today at ${time}`;
        case "rating":
          return `Rating due today at ${time}`;
        case "festival_start":
          return `Starts today at ${time}`;
      }
    }

    if (isTomorrow) {
      switch (item.type) {
        case "nomination":
          return `Due tomorrow at ${time}`;
        case "watch":
          return `Watch deadline tomorrow at ${time}`;
        case "rating":
          return `Rating due tomorrow at ${time}`;
        case "festival_start":
          return `Starts tomorrow at ${time}`;
      }
    }

    // Within 48h but not today/tomorrow
    switch (item.type) {
      case "nomination":
        return `Due in ${hoursUntil}h at ${time}`;
      case "watch":
        return `Watch deadline in ${hoursUntil}h at ${time}`;
      case "rating":
        return `Rating due in ${hoursUntil}h at ${time}`;
      case "festival_start":
        return `Starts in ${hoursUntil}h at ${time}`;
    }
  }

  // Beyond 48 hours
  switch (item.type) {
    case "nomination":
      return `Your nomination due in ${daysUntil} days`;
    case "watch":
      return `Watch deadline in ${daysUntil} days`;
    case "rating":
      return `Your rating due in ${daysUntil} days`;
    case "festival_start":
      return `Festival starts in ${daysUntil} days`;
  }
}

function getTypeLabel(type: UpcomingDate["type"]): string {
  switch (type) {
    case "nomination":
      return "Nominations Due";
    case "watch":
      return "Watch Deadline";
    case "rating":
      return "Ratings Due";
    case "festival_start":
      return "Festival Starts";
  }
}

export async function UpcomingDates() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return null;
  }

  const upcomingDates = await getUpcomingDates(user.id);

  // Group by day
  const datesByDay = new Map<string, UpcomingDate[]>();

  upcomingDates.forEach((item) => {
    const itemDate = new Date(item.date);
    const dayKey = itemDate.toISOString().split("T")[0];

    if (!datesByDay.has(dayKey)) {
      datesByDay.set(dayKey, []);
    }

    datesByDay.get(dayKey)!.push(item);
  });

  // Get next 7 days
  const next7Days: Date[] = [];
  for (let i = 0; i < 7; i++) {
    const date = new Date();
    date.setDate(date.getDate() + i);
    next7Days.push(date);
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-[var(--text-primary)] uppercase tracking-wide">
          Upcoming (7 Days)
        </h3>
        <Link href="/timeline" className="text-sm text-[var(--primary)]">
          All
        </Link>
      </div>
      <Card className="divide-y divide-[var(--border)] bg-[var(--surface-1)]">
        {upcomingDates.length === 0 ? (
          <p className="text-sm text-[var(--text-muted)] text-center py-4">
            No upcoming events or deadlines
          </p>
        ) : (
          <TooltipProvider>
            <div className="divide-y divide-[var(--border)]">
              {next7Days.map((day) => {
                const dayKey = day.toISOString().split("T")[0];
                const dayItems = datesByDay.get(dayKey) || [];

                if (dayItems.length === 0) {
                  return null;
                }

                const now = new Date();
                const isToday = day.toDateString() === now.toDateString();
                const tomorrowDate = new Date(now);
                tomorrowDate.setDate(tomorrowDate.getDate() + 1);
                const isTomorrow = day.toDateString() === tomorrowDate.toDateString();

                return (
                  <div key={dayKey} className="p-4 hover:bg-[var(--muted)]/50 transition-colors">
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-medium text-[var(--primary)] uppercase tracking-wider">
                          {isToday ? (
                            "Today"
                          ) : isTomorrow ? (
                            "Tomorrow"
                          ) : (
                            <FormattedDate date={day} format="short" />
                          )}
                        </span>
                      </div>
                    </div>
                    <div className="space-y-2">
                      {dayItems.map((item) => {
                        const clubSlug = item.club_slug;
                        const festivalSlug = item.festival_slug;
                        if (!clubSlug || !festivalSlug) {
                          console.error("UpcomingDates: Missing slugs", {
                            clubSlug,
                            festivalSlug,
                            clubId: item.club_id,
                            festivalId: item.festival_id,
                          });
                          return null;
                        }
                        return (
                          <Tooltip key={item.id}>
                            <TooltipTrigger asChild>
                              <Link
                                href={`/club/${clubSlug}/festival/${festivalSlug}`}
                                className="block group"
                              >
                                <div className="flex items-start justify-between">
                                  <div className="flex-1">
                                    <div className="flex items-center gap-2 mb-1">
                                      <span className="text-xs font-semibold text-[var(--primary)]">
                                        {getTypeLabel(item.type)}
                                      </span>
                                      <span className="text-xs text-[var(--text-muted)]">•</span>
                                      {item.club_picture_url ? (
                                        <Image
                                          src={item.club_picture_url}
                                          alt={item.club_name || "Club"}
                                          width={16}
                                          height={16}
                                          className="w-4 h-4 rounded-full object-cover"
                                        />
                                      ) : (
                                        <div className="w-4 h-4 rounded-full bg-[var(--surface-2)] flex items-center justify-center text-[8px] font-medium text-[var(--text-muted)]">
                                          {item.club_name?.[0]?.toUpperCase() || "C"}
                                        </div>
                                      )}
                                      <span className="text-xs text-[var(--text-muted)]">
                                        {item.club_name}
                                      </span>
                                    </div>
                                    <div className="font-semibold mb-1 group-hover:text-[var(--primary)] transition-colors text-sm">
                                      {item.festival_theme || "Untitled Festival"}
                                    </div>
                                  </div>
                                  <div className="text-xs text-[var(--text-muted)] ml-4 whitespace-nowrap">
                                    <DateDisplay date={item.date} format="time" />
                                  </div>
                                </div>
                              </Link>
                            </TooltipTrigger>
                            <TooltipContent>
                              <div className="space-y-1">
                                <p className="font-semibold">
                                  {item.festival_theme || "Untitled Festival"}
                                </p>
                                <p className="text-xs">{item.club_name}</p>
                                <p className="text-xs">
                                  {getTypeLabel(item.type)} deadline:{" "}
                                  <DateDisplay date={item.date} />
                                </p>
                              </div>
                            </TooltipContent>
                          </Tooltip>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          </TooltipProvider>
        )}
      </Card>
    </div>
  );
}
