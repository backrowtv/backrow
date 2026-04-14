"use client";

import NumberFlow from "@/components/ui/number-flow";

interface RatingBadgeProps {
  rating: number;
  className?: string;
  variant?: "default" | "overlay";
}

export function RatingBadge({ rating, className, variant = "default" }: RatingBadgeProps) {
  const isHighRating = rating >= 8;

  if (variant === "overlay") {
    return (
      <div
        className={`px-2 py-1 rounded-lg font-bold text-xs ${className || ""}`}
        style={{
          backgroundColor: isHighRating ? "var(--primary)" : "rgba(0, 0, 0, 0.7)",
          color: "var(--text-primary)",
        }}
      >
        <NumberFlow value={rating} suffix="/10" />
      </div>
    );
  }

  const badgeClass = isHighRating
    ? "bg-[var(--warning)] text-white border border-[var(--warning)]"
    : "bg-[var(--surface-2)] text-[var(--text-secondary)] border border-[var(--border)]";

  return (
    <div className={`px-2 py-1 rounded text-xs font-semibold ${badgeClass} ${className || ""}`}>
      <NumberFlow value={rating} suffix="/10" />
    </div>
  );
}
