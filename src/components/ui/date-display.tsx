"use client";

import { useEffect, useState, startTransition } from "react";

interface DateDisplayProps {
  date: Date | string;
  format?: "date" | "datetime" | "time" | "relative";
  className?: string;
}

/**
 * Client-side date display component to prevent hydration mismatches
 * Only formats dates after component mounts on the client
 */
export function DateDisplay({ date, format = "date", className = "" }: DateDisplayProps) {
  const [formatted, setFormatted] = useState<string>("");
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    startTransition(() => {
      setMounted(true);
    });
    // Append T00:00:00 to date-only strings (YYYY-MM-DD) to prevent UTC timezone shift
    const dateStr =
      typeof date === "string" && /^\d{4}-\d{2}-\d{2}$/.test(date) ? date + "T00:00:00" : date;
    const d = typeof dateStr === "string" ? new Date(dateStr) : dateStr;

    startTransition(() => {
      switch (format) {
        case "date":
          setFormatted(d.toLocaleDateString());
          break;
        case "datetime":
          setFormatted(
            d.toLocaleString([], {
              month: "numeric",
              day: "numeric",
              year: "numeric",
              hour: "numeric",
              minute: "2-digit",
            })
          );
          break;
        case "time":
          setFormatted(
            d.toLocaleTimeString([], {
              hour: "2-digit",
              minute: "2-digit",
            })
          );
          break;
        case "relative":
          const now = new Date();
          const diffMs = now.getTime() - d.getTime();
          const diffSecs = Math.floor(diffMs / 1000);
          const diffMins = Math.floor(diffSecs / 60);
          const diffHours = Math.floor(diffMins / 60);
          const diffDays = Math.floor(diffHours / 24);

          if (diffSecs < 60) {
            setFormatted("just now");
          } else if (diffMins < 60) {
            setFormatted(`${diffMins}m ago`);
          } else if (diffHours < 24) {
            setFormatted(`${diffHours}h ago`);
          } else if (diffDays < 7) {
            setFormatted(`${diffDays}d ago`);
          } else {
            setFormatted(d.toLocaleDateString());
          }
          break;
      }
    });
  }, [date, format]);

  // Return empty string during SSR to prevent hydration mismatch
  if (!mounted) {
    return <span className={className} suppressHydrationWarning />;
  }

  return <span className={className}>{formatted}</span>;
}
