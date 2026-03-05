"use client";

import { useEffect, useState, useMemo } from "react";
import { useTimeFormat } from "@/contexts/DisplayPreferencesContext";

interface TimeAgoProps {
  date: string | Date;
  className?: string;
  /** Show exact time for deadlines within this many hours (default: 48) */
  showTimeWithinHours?: number;
  /** Spell out days/weeks/months instead of abbreviations (default: false) */
  spelledOut?: boolean;
}

function getTimeDisplay(
  date: Date,
  showTimeWithinHours: number = 48,
  spelledOut: boolean = false,
  formatTimeFn: (date: Date) => string
): string {
  const now = new Date();
  const diffMs = date.getTime() - now.getTime();
  const diffInSeconds = Math.floor(diffMs / 1000);
  const diffInMinutes = Math.floor(diffInSeconds / 60);
  const diffInHours = Math.floor(diffInMinutes / 60);
  const diffInDays = Math.floor(diffInHours / 24);

  // For past dates (negative diff)
  if (diffMs < 0) {
    const absDiffSeconds = Math.abs(diffInSeconds);
    const absDiffMinutes = Math.abs(diffInMinutes);
    const absDiffHours = Math.abs(diffInHours);
    const absDiffDays = Math.abs(diffInDays);

    if (absDiffSeconds < 60) return "now";
    if (absDiffMinutes < 60) return `${absDiffMinutes}m ago`;
    if (absDiffHours < 24) return `${absDiffHours}h ago`;
    if (absDiffDays < 7) {
      return spelledOut
        ? `${absDiffDays} ${absDiffDays === 1 ? "day" : "days"} ago`
        : `${absDiffDays}d ago`;
    }
    const absDiffWeeks = Math.floor(absDiffDays / 7);
    if (absDiffWeeks < 4) {
      return spelledOut
        ? `${absDiffWeeks} ${absDiffWeeks === 1 ? "week" : "weeks"} ago`
        : `${absDiffWeeks}w ago`;
    }
    const absDiffMonths = Math.floor(absDiffDays / 30);
    return spelledOut
      ? `${absDiffMonths} ${absDiffMonths === 1 ? "month" : "months"} ago`
      : `${absDiffMonths}mo ago`;
  }

  // For future dates within the threshold, show exact time
  if (diffInHours < showTimeWithinHours) {
    const time = formatTimeFn(date);

    // Check if it's today
    const isToday = date.toDateString() === now.toDateString();
    if (isToday) {
      if (diffInMinutes < 60) {
        return `in ${diffInMinutes}m · ${time}`;
      }
      return `in ${diffInHours}h · ${time}`;
    }

    // Check if it's tomorrow
    const tomorrow = new Date(now);
    tomorrow.setDate(tomorrow.getDate() + 1);
    const isTomorrow = date.toDateString() === tomorrow.toDateString();
    if (isTomorrow) {
      return `Tomorrow · ${time}`;
    }

    // Within 48h but not today/tomorrow
    return `in ${diffInHours}h · ${time}`;
  }

  // For future dates beyond threshold, show relative time only
  if (diffInDays < 7) {
    return spelledOut
      ? `in ${diffInDays} ${diffInDays === 1 ? "day" : "days"}`
      : `in ${diffInDays}d`;
  }
  const diffInWeeks = Math.floor(diffInDays / 7);
  if (diffInWeeks < 4) {
    return spelledOut
      ? `in ${diffInWeeks} ${diffInWeeks === 1 ? "week" : "weeks"}`
      : `in ${diffInWeeks}w`;
  }
  const diffInMonths = Math.floor(diffInDays / 30);
  return spelledOut
    ? `in ${diffInMonths} ${diffInMonths === 1 ? "month" : "months"}`
    : `in ${diffInMonths}mo`;
}

export function TimeAgo({
  date,
  className,
  showTimeWithinHours = 48,
  spelledOut = false,
}: TimeAgoProps) {
  const dateObj = useMemo(() => (typeof date === "string" ? new Date(date) : date), [date]);
  const { formatTime } = useTimeFormat();

  // Calculate initial value that will be consistent
  const initialTimeDisplay = getTimeDisplay(dateObj, showTimeWithinHours, spelledOut, formatTime);
  const [timeDisplay, setTimeDisplay] = useState(initialTimeDisplay);

  useEffect(() => {
    // Update on mount to get accurate client time
    setTimeDisplay(getTimeDisplay(dateObj, showTimeWithinHours, spelledOut, formatTime));

    // Update every minute
    const interval = setInterval(() => {
      setTimeDisplay(getTimeDisplay(dateObj, showTimeWithinHours, spelledOut, formatTime));
    }, 60000);

    return () => clearInterval(interval);
  }, [dateObj, showTimeWithinHours, spelledOut, formatTime]);

  return (
    <span className={className} suppressHydrationWarning>
      {timeDisplay}
    </span>
  );
}
