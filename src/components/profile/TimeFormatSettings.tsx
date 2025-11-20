"use client";

import { useState, useEffect } from "react";
import { useDisplayPreferences } from "@/contexts/DisplayPreferencesContext";
import { Clock, Calendar } from "@phosphor-icons/react";
import { cn } from "@/lib/utils";

export function CompactTimeFormatToggle() {
  const { timeFormat, setTimeFormat } = useDisplayPreferences();

  return (
    <div className="flex rounded-lg border border-[var(--border)] overflow-hidden">
      {(["12h", "24h"] as const).map((fmt) => (
        <button
          key={fmt}
          type="button"
          onClick={() => setTimeFormat(fmt)}
          className={cn(
            "px-3 py-1 text-xs font-medium transition-colors",
            timeFormat === fmt
              ? "bg-[var(--primary)] text-[var(--primary-foreground)]"
              : "bg-[var(--surface-2)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
          )}
        >
          {fmt === "12h" ? "12h" : "24h"}
        </button>
      ))}
    </div>
  );
}

export function CompactDateFormatToggle() {
  const { dateFormat, setDateFormat } = useDisplayPreferences();

  return (
    <div className="flex rounded-lg border border-[var(--border)] overflow-hidden">
      {(["MDY", "DMY", "YMD"] as const).map((fmt) => (
        <button
          key={fmt}
          type="button"
          onClick={() => setDateFormat(fmt)}
          className={cn(
            "px-2.5 py-1 text-xs font-medium transition-colors",
            dateFormat === fmt
              ? "bg-[var(--primary)] text-[var(--primary-foreground)]"
              : "bg-[var(--surface-2)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
          )}
        >
          {fmt}
        </button>
      ))}
    </div>
  );
}

export function TimeFormatSettings() {
  const { timeFormat, setTimeFormat } = useDisplayPreferences();
  const [examples, setExamples] = useState({ h12: "", h24: "" });

  useEffect(() => {
    const now = new Date();
    setExamples({
      h12: now.toLocaleTimeString("en-US", {
        hour: "numeric",
        minute: "2-digit",
        hour12: true,
      }),
      h24: now.toLocaleTimeString("en-GB", {
        hour: "2-digit",
        minute: "2-digit",
        hour12: false,
      }),
    });
  }, []);

  const example12h = examples.h12;
  const example24h = examples.h24;

  return (
    <div className="space-y-3">
      <p className="text-xs text-[var(--text-muted)]">
        Choose how times are displayed throughout the app
      </p>

      <div className="grid grid-cols-2 gap-3">
        {/* 12-hour option */}
        <button
          type="button"
          onClick={() => setTimeFormat("12h")}
          className={`p-3 rounded-lg border-2 transition-all text-left ${
            timeFormat === "12h"
              ? "border-[var(--primary)] bg-[var(--primary)]/10"
              : "border-[var(--border)] hover:border-[var(--border-hover)] bg-[var(--surface-2)]"
          }`}
        >
          <div className="flex items-center gap-2 mb-1">
            <Clock className="w-4 h-4 text-[var(--text-muted)]" />
            <span className="text-sm font-medium text-[var(--text-primary)]">12-hour</span>
          </div>
          <span className="text-xs text-[var(--text-muted)]">{example12h}</span>
        </button>

        {/* 24-hour option */}
        <button
          type="button"
          onClick={() => setTimeFormat("24h")}
          className={`p-3 rounded-lg border-2 transition-all text-left ${
            timeFormat === "24h"
              ? "border-[var(--primary)] bg-[var(--primary)]/10"
              : "border-[var(--border)] hover:border-[var(--border-hover)] bg-[var(--surface-2)]"
          }`}
        >
          <div className="flex items-center gap-2 mb-1">
            <Clock className="w-4 h-4 text-[var(--text-muted)]" />
            <span className="text-sm font-medium text-[var(--text-primary)]">24-hour</span>
          </div>
          <span className="text-xs text-[var(--text-muted)]">{example24h}</span>
        </button>
      </div>
    </div>
  );
}

export function DateFormatSettings() {
  const { dateFormat, setDateFormat } = useDisplayPreferences();

  // Example date: January 15, 2025
  const _exampleDate = new Date(2025, 0, 15);

  const formats = [
    {
      id: "MDY" as const,
      label: "Month-Day-Year",
      example: "Jan 15, 2025",
      region: "US, Canada",
    },
    {
      id: "DMY" as const,
      label: "Day-Month-Year",
      example: "15 Jan 2025",
      region: "UK, Europe, Australia",
    },
    {
      id: "YMD" as const,
      label: "Year-Month-Day",
      example: "2025 Jan 15",
      region: "Japan, China, Korea",
    },
  ];

  return (
    <div className="space-y-3">
      <p className="text-xs text-[var(--text-muted)]">
        Choose how dates are displayed throughout the app
      </p>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {formats.map((format) => (
          <button
            key={format.id}
            type="button"
            onClick={() => setDateFormat(format.id)}
            className={`p-3 rounded-lg border-2 transition-all text-left ${
              dateFormat === format.id
                ? "border-[var(--primary)] bg-[var(--primary)]/10"
                : "border-[var(--border)] hover:border-[var(--border-hover)] bg-[var(--surface-2)]"
            }`}
          >
            <div className="flex items-center gap-2 mb-1">
              <Calendar className="w-4 h-4 text-[var(--text-muted)]" />
              <span className="text-sm font-medium text-[var(--text-primary)]">{format.label}</span>
            </div>
            <span className="text-xs text-[var(--text-muted)] block">{format.example}</span>
            <span className="text-[10px] text-[var(--text-disabled)]">{format.region}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
