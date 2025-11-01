"use client";

import { useState, useEffect, useCallback } from "react";
import FlipClockCountdown from "@leenguyen/react-flip-clock-countdown";
import "@leenguyen/react-flip-clock-countdown/dist/index.css";
import { cn } from "@/lib/utils";

type FlipSize = "default" | "compact";

interface FlipCountdownProps {
  deadline: string;
  label?: string;
  className?: string;
  showDays?: boolean;
  showSeconds?: boolean;
  size?: FlipSize;
}

/**
 * Counts UP from a past deadline, showing how much time has elapsed.
 * Displays as −DD:HH:MM:SS with red styling.
 */
function OverdueCounter({
  deadlineMs,
  label,
  showDays,
  showSeconds,
  size,
}: {
  deadlineMs: number;
  label?: string;
  showDays: boolean;
  showSeconds: boolean;
  size: FlipSize;
}) {
  const computeElapsed = useCallback(() => Math.max(0, Date.now() - deadlineMs), [deadlineMs]);
  const [elapsed, setElapsed] = useState(computeElapsed);

  useEffect(() => {
    setElapsed(computeElapsed());
    const interval = setInterval(() => {
      setElapsed(computeElapsed());
    }, 1000);
    return () => clearInterval(interval);
  }, [computeElapsed]);

  const totalSeconds = Math.floor(elapsed / 1000);
  const days = Math.floor(totalSeconds / 86400);
  const hours = Math.floor((totalSeconds % 86400) / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  const isCompact = size === "compact";
  const blockW = isCompact ? 16 : 24;
  const blockH = isCompact ? 22 : 32;
  const fontSize = isCompact ? 12 : 16;
  const labelFontSize = isCompact ? 7 : 8;

  const segments: { value: number; label: string }[] = [];
  if (showDays) segments.push({ value: days, label: "Days" });
  segments.push({ value: hours, label: "Hours" });
  segments.push({ value: minutes, label: "Min" });
  if (showSeconds) segments.push({ value: seconds, label: "Sec" });

  const pad = (n: number) => String(n).padStart(2, "0");

  return (
    <div className={cn("flex flex-col items-center gap-2")}>
      {label && (
        <span
          className={cn("font-medium", isCompact ? "text-[10px]" : "text-xs")}
          style={{ color: "var(--destructive, #ef4444)" }}
        >
          {label}
        </span>
      )}
      <div className="flex items-center gap-1">
        {/* Negative sign */}
        <span
          className="font-bold self-start"
          style={{
            color: "var(--destructive, #ef4444)",
            fontSize: fontSize + 2,
            lineHeight: `${blockH}px`,
          }}
        >
          −
        </span>
        {segments.map((seg, i) => (
          <div key={seg.label} className="flex items-center gap-1">
            {i > 0 && (
              <span
                className="flex flex-col gap-1 self-start"
                style={{
                  color: "var(--destructive, #ef4444)",
                  fontSize: isCompact ? 10 : 14,
                  lineHeight: `${blockH}px`,
                }}
              >
                :
              </span>
            )}
            <div className="flex flex-col items-center">
              <div className="flex gap-px">
                {pad(seg.value)
                  .split("")
                  .map((digit, di) => (
                    <div
                      key={di}
                      className="relative flex items-center justify-center rounded"
                      style={{
                        width: blockW,
                        height: blockH,
                        fontSize,
                        fontWeight: 700,
                        background:
                          "color-mix(in srgb, var(--destructive, #ef4444) 15%, var(--surface-2))",
                        color: "var(--destructive, #ef4444)",
                        fontVariantNumeric: "tabular-nums",
                        overflow: "hidden",
                      }}
                    >
                      {digit}
                      {/* Flip-board center divider */}
                      <div
                        className="absolute left-0 right-0"
                        style={{
                          top: "50%",
                          height: "1px",
                          background: "rgba(0,0,0,0.15)",
                        }}
                      />
                    </div>
                  ))}
              </div>
              <span
                className="uppercase tracking-wider"
                style={{
                  fontSize: labelFontSize,
                  fontWeight: 500,
                  color: "var(--destructive, #ef4444)",
                  opacity: 0.7,
                }}
              >
                {seg.label}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export function FlipCountdown({
  deadline,
  label,
  className,
  showDays = true,
  showSeconds = true,
  size = "default",
}: FlipCountdownProps) {
  const targetDate = new Date(deadline).getTime();

  // null = not yet determined (SSR/hydration), true/false = client-side determined
  const [expired, setExpired] = useState<boolean | null>(null);

  useEffect(() => {
    const remaining = targetDate - Date.now();
    if (remaining <= 0) {
      setExpired(true);
      return;
    }
    setExpired(false);

    // setTimeout overflows at 2^31-1 ms (~24.8 days) and fires immediately.
    // Use a 1-second interval to safely detect expiry for any deadline duration.
    const interval = setInterval(() => {
      if (targetDate - Date.now() <= 0) {
        setExpired(true);
        clearInterval(interval);
      }
    }, 1000);
    return () => clearInterval(interval);
  }, [targetDate]);

  // During SSR / first paint before useEffect, show nothing to avoid flash
  if (expired === null) {
    return (
      <div className={cn("flex flex-col items-center gap-2 flip-countdown-wrapper", className)}>
        {label && (
          <span
            className={cn("font-medium", size === "compact" ? "text-[10px]" : "text-xs")}
            style={{ color: "var(--text-muted)" }}
          >
            {label}
          </span>
        )}
        {/* Placeholder matching countdown height to prevent layout shift */}
        <div style={{ height: size === "compact" ? 30 : 42 }} />
      </div>
    );
  }

  // Deadline has passed — show the overdue counter counting UP
  if (expired) {
    return (
      <div className={cn("flex flex-col items-center gap-2 flip-countdown-wrapper", className)}>
        <OverdueCounter
          deadlineMs={targetDate}
          label={label}
          showDays={showDays}
          showSeconds={showSeconds}
          size={size}
        />
      </div>
    );
  }

  // Deadline in the future — normal countdown
  const sizeStyles =
    size === "compact"
      ? {
          digitBlockStyle: { width: 16, height: 22, fontSize: 12 },
          labelStyle: { fontSize: 7, fontWeight: 500 },
          separatorStyle: { size: "3px" },
        }
      : {
          digitBlockStyle: { width: 24, height: 32, fontSize: 16 },
          labelStyle: { fontSize: 8, fontWeight: 500 },
          separatorStyle: { size: "4px" },
        };

  const renderMap: [boolean, boolean, boolean, boolean] = [showDays, true, true, showSeconds];

  return (
    <div className={cn("flex flex-col items-center gap-2 flip-countdown-wrapper", className)}>
      {/* Override library CSS to prevent divider from disappearing during flip */}
      <style jsx global>{`
        .flip-countdown-wrapper .fcc__digit-block__divider {
          opacity: 1 !important;
          transition: none !important;
        }
      `}</style>
      {label && (
        <span
          className={cn("font-medium", size === "compact" ? "text-[10px]" : "text-xs")}
          style={{ color: "var(--text-muted)" }}
        >
          {label}
        </span>
      )}
      <FlipClockCountdown
        to={targetDate}
        labels={["Days", "Hours", "Min", "Sec"]}
        labelStyle={{
          ...sizeStyles.labelStyle,
          color: "var(--text-muted)",
          textTransform: "uppercase",
          letterSpacing: "0.05em",
        }}
        digitBlockStyle={{
          ...sizeStyles.digitBlockStyle,
          background: "var(--surface-2)",
          color: "var(--text-primary)",
          borderRadius: 4,
        }}
        dividerStyle={{ color: "rgba(0,0,0,0.15)", height: 0.5 }}
        separatorStyle={{
          color: "var(--text-muted)",
          size: sizeStyles.separatorStyle.size,
        }}
        renderMap={renderMap}
        duration={0.5}
        stopOnHiddenVisibility={true}
        hideOnComplete={false}
      >
        {/* Fallback shown by the library when countdown completes (before our interval detects it) */}
        <span style={{ color: "var(--text-muted)" }} className="text-sm font-medium">
          Time&apos;s up!
        </span>
      </FlipClockCountdown>
    </div>
  );
}
