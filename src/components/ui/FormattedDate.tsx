"use client";

import { useState, useEffect } from "react";
import { useDateFormat } from "@/contexts/DisplayPreferencesContext";

interface FormattedDateProps {
  date: Date | string;
  className?: string;
  includeYear?: boolean;
  shortMonth?: boolean;
  includeDayOfWeek?: boolean;
}

export function FormattedDate({
  date,
  className,
  includeYear = false,
  shortMonth = true,
  includeDayOfWeek = false,
}: FormattedDateProps) {
  const { formatDate } = useDateFormat();
  const [mounted, setMounted] = useState(false);
  const dateObj = typeof date === "string" ? new Date(date) : date;

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return <span className={className} suppressHydrationWarning />;
  }

  const formattedDate = formatDate(dateObj, { includeYear, shortMonth });

  if (includeDayOfWeek) {
    const dayOfWeek = dateObj.toLocaleDateString("en-US", { weekday: "short" });
    return (
      <span className={className}>
        {dayOfWeek}, {formattedDate}
      </span>
    );
  }

  return <span className={className}>{formattedDate}</span>;
}
