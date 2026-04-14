"use client";

import { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import {
  CaretLeft,
  CaretRight,
  CalendarBlank as CalendarIcon,
  FilmReel,
  Star,
  Play,
  Users,
  Trophy,
  Clock,
  MapPin,
  Funnel,
} from "@phosphor-icons/react/dist/ssr";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { EmptyState } from "@/components/shared/EmptyState";

// Types
export interface Club {
  id: string;
  name: string;
  slug: string;
}

export interface Season {
  id: string;
  name: string;
  subtitle?: string | null;
  start_date: string;
  end_date: string;
  club_id: string;
  club?: Club;
}

export interface Festival {
  id: string;
  slug: string;
  theme: string | null;
  status: string;
  phase: string;
  start_date: string | null;
  nomination_deadline: string | null;
  watch_deadline: string | null;
  rating_deadline: string | null;
  results_date: string | null;
  season_id: string | null;
  club_id: string;
  club?: Club;
}

export interface ClubEvent {
  id: string;
  title: string;
  description: string | null;
  event_type: "watch_party" | "discussion" | "meetup" | "custom";
  event_date: string;
  end_date: string | null;
  status: string;
  location: string | null;
  club_id: string;
  club?: Club;
  rsvp_counts?: {
    going: number;
    maybe: number;
    not_going: number;
  };
}

interface Deadline {
  type: "nomination" | "watch_rate" | "results";
  date: Date;
  festival: Festival;
}

interface CalendarDay {
  date: Date;
  isCurrentMonth: boolean;
  isToday: boolean;
  festivals: Festival[];
  activeFestivals: Festival[];
  events: ClubEvent[];
  deadlines: Deadline[];
}

interface UnifiedCalendarProps {
  mode: "global" | "club";
  clubs: Club[];
  seasons: Season[];
  festivals: Festival[];
  events: ClubEvent[];
  currentClubSlug?: string; // For club mode linking
  className?: string;
}

// Club colors for multi-club view
const CLUB_COLORS = [
  { bg: "bg-emerald-600", border: "border-emerald-600", text: "text-white" },
  { bg: "bg-blue-600", border: "border-blue-600", text: "text-white" },
  { bg: "bg-purple-600", border: "border-purple-600", text: "text-white" },
  { bg: "bg-amber-600", border: "border-amber-600", text: "text-white" },
  { bg: "bg-rose-600", border: "border-rose-600", text: "text-white" },
  { bg: "bg-cyan-600", border: "border-cyan-600", text: "text-white" },
  { bg: "bg-orange-600", border: "border-orange-600", text: "text-white" },
  { bg: "bg-pink-600", border: "border-pink-600", text: "text-white" },
];

const MONTHS = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

function getEventIcon(type: ClubEvent["event_type"]) {
  switch (type) {
    case "watch_party":
      return <Play className="w-3 h-3" />;
    case "discussion":
      return <Users className="w-3 h-3" />;
    case "meetup":
      return <MapPin className="w-3 h-3" />;
    case "custom":
    default:
      return <CalendarIcon className="w-3 h-3" />;
  }
}

function getDeadlineIcon(type: Deadline["type"]) {
  switch (type) {
    case "nomination":
      return <FilmReel className="w-3 h-3" />;
    case "watch_rate":
      return <Star className="w-3 h-3" />;
    case "results":
      return <Trophy className="w-3 h-3" />;
  }
}

function getDeadlineLabel(type: Deadline["type"]): string {
  switch (type) {
    case "nomination":
      return "Nomination Deadline";
    case "watch_rate":
      return "Watch & Rate Deadline";
    case "results":
      return "Results Reveal";
  }
}

function getDeadlineShortLabel(type: Deadline["type"]): string {
  switch (type) {
    case "nomination":
      return "Nominate";
    case "watch_rate":
      return "Watch & Rate";
    case "results":
      return "Results";
  }
}

function formatDate(date: Date): string {
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function formatTime(date: Date): string {
  return date.toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
  });
}

function isSameDay(date1: Date, date2: Date): boolean {
  return (
    date1.getFullYear() === date2.getFullYear() &&
    date1.getMonth() === date2.getMonth() &&
    date1.getDate() === date2.getDate()
  );
}

function isDateInRange(date: Date, start: Date, end: Date): boolean {
  const d = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const s = new Date(start.getFullYear(), start.getMonth(), start.getDate());
  const e = new Date(end.getFullYear(), end.getMonth(), end.getDate());
  return d >= s && d <= e;
}

function getFestivalEndDate(festival: Festival): Date {
  if (festival.results_date) return new Date(festival.results_date);
  if (festival.rating_deadline) return new Date(festival.rating_deadline);
  if (festival.watch_deadline) return new Date(festival.watch_deadline);
  if (festival.nomination_deadline) return new Date(festival.nomination_deadline);
  return new Date(festival.start_date!);
}

export function UnifiedCalendar({
  mode,
  clubs,
  seasons,
  festivals,
  events,
  currentClubSlug,
  className,
}: UnifiedCalendarProps) {
  const [currentDate, setCurrentDate] = useState(() => new Date());
  const [view, setView] = useState<"month" | "timeline">("month");
  const [selectedClubId, setSelectedClubId] = useState<string>("all");

  const currentMonth = currentDate.getMonth();
  const currentYear = currentDate.getFullYear();

  // Create club color map
  const clubColorMap = useMemo(() => {
    const map = new Map<string, (typeof CLUB_COLORS)[0]>();
    clubs.forEach((club, index) => {
      map.set(club.id, CLUB_COLORS[index % CLUB_COLORS.length]);
    });
    return map;
  }, [clubs]);

  // Filter data by selected club
  const filteredFestivals = useMemo(() => {
    if (selectedClubId === "all") return festivals;
    return festivals.filter((f) => f.club_id === selectedClubId);
  }, [festivals, selectedClubId]);

  const filteredEvents = useMemo(() => {
    if (selectedClubId === "all") return events;
    return events.filter((e) => e.club_id === selectedClubId);
  }, [events, selectedClubId]);

  const _filteredSeasons = useMemo(() => {
    if (selectedClubId === "all") return seasons;
    return seasons.filter((s) => s.club_id === selectedClubId);
  }, [seasons, selectedClubId]);

  // Generate calendar days for current month view
  const calendarDays = useMemo(() => {
    const days: CalendarDay[] = [];
    const today = new Date();

    const firstDay = new Date(currentYear, currentMonth, 1);
    const startDate = new Date(firstDay);
    startDate.setDate(startDate.getDate() - startDate.getDay());

    for (let i = 0; i < 42; i++) {
      const date = new Date(startDate);
      date.setDate(date.getDate() + i);

      const isCurrentMonth = date.getMonth() === currentMonth;
      const isToday = isSameDay(date, today);

      // Find festivals that are ACTIVE on this date (for background highlight)
      const activeFestivals = filteredFestivals.filter((festival) => {
        if (!festival.start_date) return false;
        const start = new Date(festival.start_date);
        const end = getFestivalEndDate(festival);
        return isDateInRange(date, start, end);
      });

      // Find festivals that START on this date (to show the label)
      const dayFestivals = filteredFestivals.filter((festival) => {
        if (!festival.start_date) return false;
        const start = new Date(festival.start_date);
        return isSameDay(date, start);
      });

      // Find events on this date
      const dayEvents = filteredEvents.filter((event) => {
        const eventDate = new Date(event.event_date);
        return isSameDay(date, eventDate);
      });

      // Find deadlines on this date
      const dayDeadlines: Deadline[] = [];
      filteredFestivals.forEach((festival) => {
        if (
          festival.nomination_deadline &&
          isSameDay(date, new Date(festival.nomination_deadline))
        ) {
          dayDeadlines.push({
            type: "nomination",
            date: new Date(festival.nomination_deadline),
            festival,
          });
        }
        const effectiveWatchRateDate = festival.rating_deadline || festival.watch_deadline;
        if (effectiveWatchRateDate && isSameDay(date, new Date(effectiveWatchRateDate))) {
          dayDeadlines.push({
            type: "watch_rate",
            date: new Date(effectiveWatchRateDate),
            festival,
          });
        }
        if (festival.results_date && isSameDay(date, new Date(festival.results_date))) {
          dayDeadlines.push({ type: "results", date: new Date(festival.results_date), festival });
        }
      });

      days.push({
        date,
        isCurrentMonth,
        isToday,
        festivals: dayFestivals,
        activeFestivals,
        events: dayEvents,
        deadlines: dayDeadlines,
      });
    }

    return days;
  }, [currentMonth, currentYear, filteredFestivals, filteredEvents]);

  // Timeline data
  const timelineData = useMemo(() => {
    const startOfMonth = new Date(currentYear, currentMonth, 1);
    const endOfMonth = new Date(currentYear, currentMonth + 1, 0);
    const daysInMonth = endOfMonth.getDate();

    const monthFestivals = filteredFestivals.filter((festival) => {
      if (!festival.start_date) return false;
      const start = new Date(festival.start_date);
      const end = getFestivalEndDate(festival);
      return start <= endOfMonth && end >= startOfMonth;
    });

    return {
      daysInMonth,
      startOfMonth,
      endOfMonth,
      festivals: monthFestivals,
    };
  }, [currentMonth, currentYear, filteredFestivals]);

  // Upcoming items (next 14 days)
  // eslint-disable-next-line react-hooks/preserve-manual-memoization -- Date() inside useMemo is intentional to get current time on each render
  const upcomingItems = useMemo(() => {
    const now = new Date();
    const twoWeeksFromNow = new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000);

    const items: Array<{
      type: "event" | "deadline";
      date: Date;
      title: string;
      subtitle: string;
      club?: Club;
      link: string;
      urgent: boolean;
      deadlineType?: Deadline["type"];
    }> = [];

    // Add events
    filteredEvents.forEach((event) => {
      const eventDate = new Date(event.event_date);
      if (eventDate >= now && eventDate <= twoWeeksFromNow && event.status !== "cancelled") {
        const daysUntil = Math.ceil((eventDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
        const clubSlug = event.club?.slug || currentClubSlug;
        items.push({
          type: "event",
          date: eventDate,
          title: event.title,
          subtitle: event.event_type === "watch_party" ? "Watch Party" : "Event",
          club: event.club,
          link: clubSlug ? `/club/${clubSlug}` : "#",
          urgent: daysUntil <= 2,
        });
      }
    });

    // Add deadlines
    filteredFestivals.forEach((festival) => {
      const clubSlug = festival.club?.slug || currentClubSlug;
      const festivalLink = clubSlug ? `/club/${clubSlug}/festival/${festival.slug}` : "#";

      if (festival.nomination_deadline) {
        const date = new Date(festival.nomination_deadline);
        if (date >= now && date <= twoWeeksFromNow) {
          const daysUntil = Math.ceil((date.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
          items.push({
            type: "deadline",
            date,
            title: festival.theme || "Festival",
            subtitle: "Nomination Deadline",
            club: festival.club,
            link: festivalLink,
            urgent: daysUntil <= 2,
            deadlineType: "nomination",
          });
        }
      }

      const effectiveWatchRateDate = festival.rating_deadline || festival.watch_deadline;
      if (effectiveWatchRateDate) {
        const date = new Date(effectiveWatchRateDate);
        if (date >= now && date <= twoWeeksFromNow) {
          const daysUntil = Math.ceil((date.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
          items.push({
            type: "deadline",
            date,
            title: festival.theme || "Festival",
            subtitle: "Watch & Rate Deadline",
            club: festival.club,
            link: festivalLink,
            urgent: daysUntil <= 2,
            deadlineType: "watch_rate",
          });
        }
      }
    });

    return items.sort((a, b) => a.date.getTime() - b.date.getTime()).slice(0, 8);
  }, [filteredFestivals, filteredEvents, currentClubSlug]);

  const navigateMonth = (direction: "prev" | "next") => {
    setCurrentDate((prev) => {
      const newDate = new Date(prev);
      newDate.setMonth(newDate.getMonth() + (direction === "next" ? 1 : -1));
      return newDate;
    });
  };

  const goToToday = () => {
    setCurrentDate(new Date());
  };

  const getTimelinePosition = (date: Date, startOfMonth: Date, daysInMonth: number) => {
    const day = date.getDate();
    const month = date.getMonth();
    const year = date.getFullYear();

    if (
      year < startOfMonth.getFullYear() ||
      (year === startOfMonth.getFullYear() && month < startOfMonth.getMonth())
    ) {
      return 0;
    }
    if (
      year > startOfMonth.getFullYear() ||
      (year === startOfMonth.getFullYear() && month > startOfMonth.getMonth())
    ) {
      return 100;
    }

    return ((day - 1) / daysInMonth) * 100;
  };

  const getClubLink = (festival: Festival) => {
    const clubSlug = festival.club?.slug || currentClubSlug;
    return clubSlug ? `/club/${clubSlug}/festival/${festival.slug}` : "#";
  };

  return (
    <div className={cn("space-y-4", className)}>
      {/* Header Card */}
      <Card className="border-[var(--border)] bg-[var(--surface-0)]">
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            {/* Month Navigation */}
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-1">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => navigateMonth("prev")}
                  className="h-8 w-8"
                >
                  <CaretLeft className="w-4 h-4" />
                </Button>
                <Button variant="ghost" size="sm" onClick={goToToday} className="text-xs">
                  Today
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => navigateMonth("next")}
                  className="h-8 w-8"
                >
                  <CaretRight className="w-4 h-4" />
                </Button>
              </div>
              <h2 className="text-lg font-semibold text-[var(--text-primary)]">
                {MONTHS[currentMonth]} {currentYear}
              </h2>
            </div>

            <div className="flex items-center gap-2">
              {/* Club Filter (Global Mode Only) */}
              {mode === "global" && clubs.length > 1 && (
                <div className="flex items-center gap-2">
                  <Funnel className="w-3 h-3 text-[var(--text-muted)]" />
                  <select
                    value={selectedClubId}
                    onChange={(e) => setSelectedClubId(e.target.value)}
                    className="h-8 text-xs rounded-lg border border-[var(--border)] bg-[var(--surface-1)] px-2 pr-6 text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/20 focus:border-[var(--primary)] appearance-none cursor-pointer"
                    style={{
                      backgroundImage: `url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3e%3cpath stroke='%236b7280' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='m6 8 4 4 4-4'/%3e%3c/svg%3e")`,
                      backgroundPosition: "right 0.25rem center",
                      backgroundRepeat: "no-repeat",
                      backgroundSize: "1.25rem 1.25rem",
                    }}
                  >
                    <option value="all">All Clubs</option>
                    {clubs.map((club) => (
                      <option key={club.id} value={club.id}>
                        {club.name}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* View Toggle */}
              <div className="flex items-center gap-1 bg-[var(--surface-1)] rounded-lg p-1">
                <Button
                  variant={view === "month" ? "secondary" : "ghost"}
                  size="sm"
                  onClick={() => setView("month")}
                  className="text-xs h-7"
                >
                  Month
                </Button>
                <Button
                  variant={view === "timeline" ? "secondary" : "ghost"}
                  size="sm"
                  onClick={() => setView("timeline")}
                  className="text-xs h-7"
                >
                  Timeline
                </Button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
        {/* Calendar View */}
        <div className="lg:col-span-3">
          {view === "month" ? (
            <Card className="border-[var(--border)] bg-[var(--surface-0)]">
              <CardContent className="p-4">
                {/* Day headers */}
                <div className="grid grid-cols-7 gap-px mb-2">
                  {DAYS.map((day) => (
                    <div
                      key={day}
                      className="text-center text-xs font-medium text-[var(--text-muted)] py-2"
                    >
                      {day}
                    </div>
                  ))}
                </div>

                {/* Calendar grid */}
                <div className="grid grid-cols-7 gap-px bg-[var(--border)] rounded-lg overflow-hidden">
                  {calendarDays.map((day, index) => (
                    <CalendarDayCell
                      key={index}
                      day={day}
                      mode={mode}
                      clubColorMap={clubColorMap}
                      currentClubSlug={currentClubSlug}
                    />
                  ))}
                </div>
              </CardContent>
            </Card>
          ) : (
            <Card className="border-[var(--border)] bg-[var(--surface-0)]">
              <CardContent className="p-4">
                {/* Timeline Header */}
                <div className="flex mb-4">
                  <div className="w-32 shrink-0" />
                  <div className="flex-1 flex">
                    {Array.from({ length: timelineData.daysInMonth }, (_, i) => {
                      const isToday =
                        i + 1 === new Date().getDate() &&
                        currentMonth === new Date().getMonth() &&
                        currentYear === new Date().getFullYear();
                      return (
                        <div
                          key={i}
                          className={cn(
                            "flex-1 text-center text-[10px] py-1 border-l border-[var(--border)]",
                            isToday && "bg-[var(--primary)]/10 font-bold text-[var(--primary)]"
                          )}
                        >
                          {i + 1}
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Festival Timeline Rows */}
                {timelineData.festivals.length > 0 ? (
                  <div className="space-y-2">
                    {timelineData.festivals.map((festival, _index) => {
                      const startDate = new Date(festival.start_date!);
                      const endDate = getFestivalEndDate(festival);
                      const clubColor = clubColorMap.get(festival.club_id) || CLUB_COLORS[0];

                      const startPos = getTimelinePosition(
                        startDate,
                        timelineData.startOfMonth,
                        timelineData.daysInMonth
                      );
                      const endPos = getTimelinePosition(
                        endDate,
                        timelineData.startOfMonth,
                        timelineData.daysInMonth
                      );
                      const width = Math.max(endPos - startPos, 3);

                      return (
                        <div key={festival.id} className="flex items-center">
                          <div className="w-32 shrink-0 pr-2">
                            <div className="text-xs font-medium truncate">
                              {festival.theme || "Festival"}
                            </div>
                            {mode === "global" && festival.club && (
                              <div className="text-[10px] text-[var(--text-muted)] truncate">
                                {festival.club.name}
                              </div>
                            )}
                          </div>
                          <div className="flex-1 h-8 relative bg-[var(--surface-1)] rounded">
                            <TooltipProvider>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Link href={getClubLink(festival)}>
                                    <div
                                      className={cn(
                                        "absolute h-6 top-1 rounded border-2 cursor-pointer transition-all hover:brightness-110",
                                        clubColor.bg,
                                        clubColor.border
                                      )}
                                      style={{
                                        left: `${startPos}%`,
                                        width: `${width}%`,
                                      }}
                                    >
                                      <span
                                        className={cn("text-[10px] px-1 truncate", clubColor.text)}
                                      >
                                        {festival.theme}
                                      </span>
                                    </div>
                                  </Link>
                                </TooltipTrigger>
                                <TooltipContent>
                                  <div className="text-sm">
                                    <div className="font-semibold">
                                      {festival.theme || "Festival"}
                                    </div>
                                    <Badge variant="secondary" className="text-[10px] mt-1">
                                      {festival.phase}
                                    </Badge>
                                    <div className="text-xs mt-1 text-[var(--text-muted)]">
                                      {formatDate(startDate)} - {formatDate(endDate)}
                                    </div>
                                  </div>
                                </TooltipContent>
                              </Tooltip>
                            </TooltipProvider>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <EmptyState
                    icon={CalendarIcon}
                    title="No festivals this month"
                    variant="inline"
                  />
                )}
              </CardContent>
            </Card>
          )}
        </div>

        {/* Upcoming Sidebar */}
        <div className="lg:col-span-1">
          <Card className="border-[var(--border)] bg-[var(--surface-0)]">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2">
                <Clock className="w-4 h-4 text-[var(--text-muted)]" />
                Upcoming
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4 pt-0">
              {upcomingItems.length > 0 ? (
                <div className="space-y-2">
                  {upcomingItems.map((item, index) => {
                    const daysUntil = Math.ceil(
                      (item.date.getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)
                    );
                    const clubColor = item.club ? clubColorMap.get(item.club.id) : undefined;

                    return (
                      <Link key={index} href={item.link}>
                        <div
                          className={cn(
                            "p-2 rounded-lg transition-colors cursor-pointer",
                            item.urgent
                              ? "bg-[var(--destructive)]/10 hover:bg-[var(--destructive)]/20"
                              : "bg-[var(--surface-1)] hover:bg-[var(--surface-2)]"
                          )}
                        >
                          <div className="flex items-start gap-2">
                            <div
                              className={cn(
                                "w-6 h-6 rounded flex items-center justify-center shrink-0 mt-0.5",
                                item.type === "deadline"
                                  ? "bg-[var(--destructive)] text-white"
                                  : "bg-[var(--surface-2)] text-[var(--text-muted)]"
                              )}
                            >
                              {item.type === "deadline" && item.deadlineType ? (
                                getDeadlineIcon(item.deadlineType)
                              ) : (
                                <CalendarIcon className="w-3 h-3" />
                              )}
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="text-xs font-medium truncate">{item.subtitle}</div>
                              <div className="text-[10px] text-[var(--text-muted)] truncate">
                                {item.title}
                              </div>
                              {mode === "global" && item.club && (
                                <div
                                  className={cn(
                                    "text-[10px] truncate",
                                    clubColor?.text || "text-[var(--text-muted)]"
                                  )}
                                >
                                  {item.club.name}
                                </div>
                              )}
                            </div>
                            <Badge
                              variant={item.urgent ? "danger" : "secondary"}
                              className="text-[10px] shrink-0"
                            >
                              {daysUntil === 0
                                ? "Today"
                                : daysUntil === 1
                                  ? "Tomorrow"
                                  : `${daysUntil}d`}
                            </Badge>
                          </div>
                        </div>
                      </Link>
                    );
                  })}
                </div>
              ) : (
                <div className="text-center py-4 text-xs text-[var(--text-muted)]">
                  No upcoming events or deadlines
                </div>
              )}
            </CardContent>
          </Card>

          {/* Legend */}
          <Card className="border-[var(--border)] bg-[var(--surface-0)] mt-4">
            <CardContent className="p-4">
              <div className="text-xs font-medium mb-2 text-[var(--text-muted)]">Legend</div>
              <div className="space-y-1.5 text-[10px]">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded bg-[var(--primary)]/20 border border-[var(--primary)]" />
                  <span>Active Festival</span>
                </div>
                <div className="flex items-center gap-2">
                  <FilmReel className="w-3 h-3 text-[var(--text-muted)]" />
                  <span>Festival Start</span>
                </div>
                <div className="flex items-center gap-2">
                  <Clock className="w-3 h-3 text-[var(--destructive)]" />
                  <span>Deadline</span>
                </div>
                <div className="flex items-center gap-2">
                  <Play className="w-3 h-3 text-[var(--text-muted)]" />
                  <span>Watch Party</span>
                </div>
                <div className="flex items-center gap-2">
                  <MapPin className="w-3 h-3 text-[var(--text-muted)]" />
                  <span>Meetup/Event</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

// Calendar Day Cell Component
function CalendarDayCell({
  day,
  mode,
  clubColorMap,
  currentClubSlug,
}: {
  day: CalendarDay;
  mode: "global" | "club";
  clubColorMap: Map<string, (typeof CLUB_COLORS)[0]>;
  currentClubSlug?: string;
}) {
  const hasActiveFestival = day.activeFestivals.length > 0;
  const primaryFestival = day.activeFestivals[0];
  const clubColor = primaryFestival ? clubColorMap.get(primaryFestival.club_id) : undefined;

  // Check if this is the start of a festival
  const festivalStarts = day.festivals.length > 0;

  // Check if this day is the first of the week OR festival start
  const dayOfWeek = day.date.getDay();
  const showFestivalLabel = hasActiveFestival && (dayOfWeek === 0 || festivalStarts);

  const getClubLink = (festival: Festival) => {
    const clubSlug = festival.club?.slug || currentClubSlug;
    return clubSlug ? `/club/${clubSlug}/festival/${festival.slug}` : "#";
  };

  return (
    <div
      className={cn(
        "min-h-[90px] p-1.5 bg-[var(--surface-0)] transition-colors relative",
        !day.isCurrentMonth && "bg-[var(--surface-1)] opacity-40",
        day.isToday && "ring-2 ring-[var(--primary)] ring-inset z-10",
        hasActiveFestival &&
          day.isCurrentMonth &&
          cn(
            "border-l-2",
            clubColor?.bg || "bg-[var(--primary)]/5",
            clubColor?.border
              ? `border-l-${clubColor.border.split("-")[1]}-500`
              : "border-l-[var(--primary)]"
          )
      )}
      style={
        hasActiveFestival && clubColor
          ? {
              backgroundColor: `color-mix(in srgb, ${
                clubColor.bg.includes("emerald")
                  ? "#10b981"
                  : clubColor.bg.includes("blue")
                    ? "#3b82f6"
                    : clubColor.bg.includes("purple")
                      ? "#8b5cf6"
                      : clubColor.bg.includes("amber")
                        ? "#f59e0b"
                        : clubColor.bg.includes("rose")
                          ? "#f43f5e"
                          : clubColor.bg.includes("cyan")
                            ? "#06b6d4"
                            : clubColor.bg.includes("orange")
                              ? "#f97316"
                              : "#ec4899"
              } 10%, transparent)`,
            }
          : undefined
      }
    >
      {/* Date number */}
      <div
        className={cn(
          "text-xs font-medium mb-1",
          day.isToday && "text-[var(--primary)] font-bold",
          !day.isCurrentMonth && "text-[var(--text-muted)]"
        )}
      >
        {day.date.getDate()}
      </div>

      {/* Content */}
      <div className="space-y-0.5">
        {/* Festival indicator */}
        {showFestivalLabel && primaryFestival && (
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Link href={getClubLink(primaryFestival)}>
                  <div
                    className={cn(
                      "text-[9px] px-1 py-0.5 rounded truncate cursor-pointer flex items-center gap-0.5",
                      clubColor?.bg || "bg-[var(--primary)]/20",
                      clubColor?.text || "text-[var(--primary)]"
                    )}
                  >
                    <FilmReel className="w-2.5 h-2.5 shrink-0" />
                    <span className="truncate">{primaryFestival.theme || "Festival"}</span>
                  </div>
                </Link>
              </TooltipTrigger>
              <TooltipContent>
                <div className="text-xs">
                  <div className="font-semibold">{primaryFestival.theme || "Festival"}</div>
                  {mode === "global" && primaryFestival.club && (
                    <div className="text-[var(--text-muted)]">{primaryFestival.club.name}</div>
                  )}
                  <Badge variant="secondary" className="text-[10px] mt-1">
                    {primaryFestival.phase}
                  </Badge>
                </div>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        )}

        {/* Events */}
        {day.events.slice(0, 1).map((event) => {
          const clubSlug = event.club?.slug || currentClubSlug;
          return (
            <TooltipProvider key={event.id}>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Link href={clubSlug ? `/club/${clubSlug}` : "#"}>
                    <div className="text-[9px] px-1 py-0.5 rounded truncate cursor-pointer flex items-center gap-0.5 bg-[var(--surface-2)] text-[var(--text-secondary)]">
                      {getEventIcon(event.event_type)}
                      <span className="truncate">{event.title}</span>
                    </div>
                  </Link>
                </TooltipTrigger>
                <TooltipContent>
                  <div className="text-xs">
                    <div className="font-semibold">{event.title}</div>
                    <div className="text-[var(--text-muted)]">
                      {formatTime(new Date(event.event_date))}
                    </div>
                    {event.location && (
                      <div className="text-[var(--text-muted)] mt-1 flex items-center gap-1">
                        <MapPin className="w-3 h-3" />
                        {event.location}
                      </div>
                    )}
                  </div>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          );
        })}

        {/* Deadlines */}
        {day.deadlines.slice(0, 1).map((deadline, i) => (
          <TooltipProvider key={`${deadline.festival.id}-${deadline.type}-${i}`}>
            <Tooltip>
              <TooltipTrigger asChild>
                <Link href={getClubLink(deadline.festival)}>
                  <div className="text-[9px] px-1 py-0.5 rounded truncate cursor-pointer flex items-center gap-0.5 bg-[var(--destructive)] text-white">
                    <Clock className="w-2.5 h-2.5 shrink-0" />
                    <span className="truncate">{getDeadlineShortLabel(deadline.type)}</span>
                  </div>
                </Link>
              </TooltipTrigger>
              <TooltipContent>
                <div className="text-xs">
                  <div className="font-semibold">{getDeadlineLabel(deadline.type)}</div>
                  <div className="text-[var(--text-muted)]">
                    {deadline.festival.theme || "Festival"}
                  </div>
                  <div className="text-[var(--text-muted)] mt-1">{formatTime(deadline.date)}</div>
                </div>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        ))}

        {/* More indicator */}
        {(day.events.length > 1 || day.deadlines.length > 1 || day.activeFestivals.length > 1) && (
          <div className="text-[9px] text-[var(--text-muted)] pl-1">
            +
            {day.events.length +
              day.deadlines.length +
              day.activeFestivals.length -
              Math.min(day.events.length, 1) -
              Math.min(day.deadlines.length, 1) -
              (showFestivalLabel ? 1 : 0)}{" "}
            more
          </div>
        )}
      </div>
    </div>
  );
}
