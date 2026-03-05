/**
 * Calendar Types
 *
 * Shared type definitions for unified calendar components.
 */

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

export interface Deadline {
  type: "nomination" | "watch_rate" | "results";
  date: Date;
  festival: Festival;
}

export interface CalendarDay {
  date: Date;
  isCurrentMonth: boolean;
  isToday: boolean;
  festivals: Festival[];
  activeFestivals: Festival[];
  events: ClubEvent[];
  deadlines: Deadline[];
}

export interface UnifiedCalendarProps {
  mode: "global" | "club";
  clubs: Club[];
  seasons: Season[];
  festivals: Festival[];
  events: ClubEvent[];
  currentClubSlug?: string;
  className?: string;
}

export interface ClubColor {
  bg: string;
  border: string;
  text: string;
}

export interface UpcomingItem {
  type: "event" | "deadline";
  date: Date;
  title: string;
  subtitle: string;
  club?: Club;
  link: string;
  urgent: boolean;
  deadlineType?: Deadline["type"];
}

export interface TimelineData {
  daysInMonth: number;
  startOfMonth: Date;
  endOfMonth: Date;
  festivals: Festival[];
}
