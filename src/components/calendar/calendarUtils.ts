/**
 * Calendar Utilities
 *
 * Constants and helper functions for unified calendar components.
 */

import type { Festival, Deadline, ClubColor } from "./calendarTypes";

// Club colors for multi-club view
export const CLUB_COLORS: ClubColor[] = [
  { bg: "bg-emerald-600", border: "border-emerald-600", text: "text-white" },
  { bg: "bg-blue-600", border: "border-blue-600", text: "text-white" },
  { bg: "bg-purple-600", border: "border-purple-600", text: "text-white" },
  { bg: "bg-amber-600", border: "border-amber-600", text: "text-white" },
  { bg: "bg-rose-600", border: "border-rose-600", text: "text-white" },
  { bg: "bg-cyan-600", border: "border-cyan-600", text: "text-white" },
  { bg: "bg-orange-600", border: "border-orange-600", text: "text-white" },
  { bg: "bg-pink-600", border: "border-pink-600", text: "text-white" },
];

export const MONTHS = [
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

export const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export function formatDate(date: Date): string {
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export function formatTime(date: Date): string {
  return date.toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
  });
}

export function isSameDay(date1: Date, date2: Date): boolean {
  return (
    date1.getFullYear() === date2.getFullYear() &&
    date1.getMonth() === date2.getMonth() &&
    date1.getDate() === date2.getDate()
  );
}

export function isDateInRange(date: Date, start: Date, end: Date): boolean {
  const d = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const s = new Date(start.getFullYear(), start.getMonth(), start.getDate());
  const e = new Date(end.getFullYear(), end.getMonth(), end.getDate());
  return d >= s && d <= e;
}

export function getFestivalEndDate(festival: Festival): Date {
  if (festival.results_date) return new Date(festival.results_date);
  if (festival.rating_deadline) return new Date(festival.rating_deadline);
  if (festival.watch_deadline) return new Date(festival.watch_deadline);
  if (festival.nomination_deadline) return new Date(festival.nomination_deadline);
  return new Date(festival.start_date!);
}

export function getDeadlineLabel(type: Deadline["type"]): string {
  switch (type) {
    case "nomination":
      return "Nomination Deadline";
    case "watch_rate":
      return "Watch & Rate Deadline";
    case "results":
      return "Results Reveal";
  }
}

export function getDeadlineShortLabel(type: Deadline["type"]): string {
  switch (type) {
    case "nomination":
      return "Nominate";
    case "watch_rate":
      return "Watch & Rate";
    case "results":
      return "Results";
  }
}

export function getTimelinePosition(date: Date, startOfMonth: Date, daysInMonth: number): number {
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
}

export function getClubColorHex(clubColor: ClubColor): string {
  if (clubColor.bg.includes("emerald")) return "#10b981";
  if (clubColor.bg.includes("blue")) return "#3b82f6";
  if (clubColor.bg.includes("purple")) return "#8b5cf6";
  if (clubColor.bg.includes("amber")) return "#f59e0b";
  if (clubColor.bg.includes("rose")) return "#f43f5e";
  if (clubColor.bg.includes("cyan")) return "#06b6d4";
  if (clubColor.bg.includes("orange")) return "#f97316";
  return "#ec4899"; // pink default
}
