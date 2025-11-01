"use client";

import { CaretLeft, CaretRight } from "@phosphor-icons/react";
import { cn } from "@/lib/utils";

interface ScrollNavButtonProps {
  direction: "left" | "right";
  onClick: () => void;
  disabled?: boolean;
  size?: "sm" | "md";
  className?: string;
}

export function ScrollNavButton({
  direction,
  onClick,
  disabled = false,
  size = "md",
  className,
}: ScrollNavButtonProps) {
  const Icon = direction === "left" ? CaretLeft : CaretRight;

  const sizeClasses = {
    sm: "p-0.5",
    md: "p-1",
  };

  const iconSizes = {
    sm: "w-2.5 h-2.5",
    md: "w-3 h-3",
  };

  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={cn(
        "rounded-full transition-all duration-200 ease-out",
        "hover:scale-110 hover:opacity-90 shadow-sm backdrop-blur-sm",
        "disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100",
        "opacity-70",
        sizeClasses[size],
        className
      )}
      style={{
        backgroundColor: "var(--surface-1)",
        color: "var(--text-primary)",
        border: "1px solid var(--border)",
      }}
      aria-label={direction === "left" ? "Scroll left" : "Scroll right"}
    >
      <Icon className={iconSizes[size]} weight="bold" />
    </button>
  );
}
