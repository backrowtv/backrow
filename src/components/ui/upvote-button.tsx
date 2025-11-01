"use client";

import { CaretUp } from "@phosphor-icons/react";
import { cn } from "@/lib/utils";

interface UpvoteButtonProps {
  count: number;
  isVoted: boolean;
  onVote: () => void;
  disabled?: boolean;
  size?: "sm" | "md";
  className?: string;
}

/**
 * Shared upvote button component with consistent styling across the app.
 *
 * Visual states:
 * - Default: muted gray
 * - Hover: secondary text color
 * - Voted: primary color with subtle glow
 */
export function UpvoteButton({
  count,
  isVoted,
  onVote,
  disabled = false,
  size = "md",
  className,
}: UpvoteButtonProps) {
  const sizeClasses = {
    sm: {
      container: "gap-0 px-0 py-0 min-h-[36px]",
      icon: "w-5 h-5",
      text: "text-sm",
    },
    md: {
      container: "gap-0.5 px-1.5 py-1 min-w-[32px] min-h-[40px]",
      icon: "w-6 h-6",
      text: "text-sm",
    },
  };

  const sizes = sizeClasses[size];

  return (
    <button
      onClick={onVote}
      disabled={disabled}
      className={cn(
        "flex flex-col items-center justify-center rounded transition-colors",
        sizes.container,
        // Default state: muted
        "text-[var(--text-muted)]",
        // Hover state: secondary (only when not voted)
        !isVoted && "hover:text-[var(--text-secondary)]",
        // Voted state: primary with glow
        isVoted && "text-[var(--primary)]",
        // Disabled state
        disabled && "opacity-50 cursor-not-allowed",
        // Focus state
        "focus:outline-none focus:ring-2 focus:ring-[var(--primary)]",
        className
      )}
      style={
        isVoted
          ? {
              // Subtle glow using drop-shadow filter (works on both icon and text)
              filter: "drop-shadow(0 0 3px hsl(var(--primary-500) / 0.5))",
            }
          : undefined
      }
      aria-label={isVoted ? "Remove vote" : "Upvote"}
      aria-pressed={isVoted}
    >
      <CaretUp className={sizes.icon} weight={isVoted ? "fill" : "regular"} />
      <span className={cn(sizes.text, "font-semibold tabular-nums leading-none")}>{count}</span>
    </button>
  );
}
