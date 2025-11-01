"use client";

import { cn } from "@/lib/utils";

interface ProgressProps {
  value: number; // 0-100
  className?: string;
  showLabel?: boolean;
  size?: "sm" | "md" | "lg";
  variant?: "default" | "success" | "warning" | "danger";
}

export function Progress({
  value,
  className,
  showLabel = false,
  size = "md",
  variant = "default",
}: ProgressProps) {
  const clampedValue = Math.min(100, Math.max(0, value));

  const sizeClasses = {
    sm: "h-1",
    md: "h-2",
    lg: "h-3",
  };

  return (
    <div
      className={cn("w-full", className)}
      role="progressbar"
      aria-valuenow={Math.round(clampedValue)}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-label={`Progress: ${Math.round(clampedValue)}%`}
    >
      {showLabel && (
        <div className="flex justify-between text-sm mb-2 text-[var(--text-muted)]">
          <span>Progress</span>
          <span>{Math.round(clampedValue)}%</span>
        </div>
      )}
      <div
        className={cn(
          "w-full rounded-full overflow-hidden bg-[var(--surface-1)]",
          sizeClasses[size]
        )}
      >
        <div
          className={cn("h-full rounded-full transition-all duration-500 ease-out")}
          style={{
            width: `${clampedValue}%`,
            backgroundColor:
              variant === "default"
                ? "var(--primary)"
                : variant === "success"
                  ? "var(--success)"
                  : variant === "warning"
                    ? "var(--warning)"
                    : "var(--error)",
          }}
        />
      </div>
    </div>
  );
}

interface CircularProgressProps {
  value: number; // 0-100
  size?: number;
  strokeWidth?: number;
  className?: string;
  showLabel?: boolean;
  variant?: "default" | "success" | "warning" | "danger";
}

export function CircularProgress({
  value,
  size = 64,
  strokeWidth = 6,
  className,
  showLabel = false,
  variant = "default",
}: CircularProgressProps) {
  const clampedValue = Math.min(100, Math.max(0, value));
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const offset = circumference - (clampedValue / 100) * circumference;

  return (
    <div className={cn("relative inline-flex items-center justify-center", className)}>
      <svg width={size} height={size} className="transform -rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke="var(--surface-1)"
          strokeWidth={strokeWidth}
          fill="none"
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={
            variant === "default"
              ? "var(--primary)"
              : variant === "success"
                ? "var(--success)"
                : variant === "warning"
                  ? "var(--warning)"
                  : "var(--error)"
          }
          strokeWidth={strokeWidth}
          fill="none"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
          className="transition-all duration-500 ease-out"
        />
      </svg>
      {showLabel && (
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="text-sm font-semibold text-[var(--text-primary)]">
            {Math.round(clampedValue)}%
          </span>
        </div>
      )}
    </div>
  );
}
