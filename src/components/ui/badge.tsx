import * as React from "react";
import { cn } from "@/lib/utils";

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?:
    | "default"
    | "primary"
    | "secondary"
    | "outline"
    | "success"
    | "danger"
    | "warning"
    | "spoiler";
  size?: "sm" | "md";
}

const Badge = React.forwardRef<HTMLSpanElement, BadgeProps>(
  ({ className, variant = "default", size = "md", ...props }, ref) => {
    const baseStyles = "inline-flex items-center rounded-md font-medium whitespace-nowrap";

    const variants = {
      default: "bg-[var(--primary)] text-[var(--primary-foreground)]",
      primary: "bg-[var(--primary)] text-[var(--primary-foreground)]",
      secondary: "bg-[var(--secondary)] text-[var(--secondary-foreground)]",
      outline: "border border-[var(--border)] text-[var(--text-primary)] bg-transparent",
      success:
        "bg-[var(--active-success-bg)] text-[var(--active-success-text)] border border-[var(--active-success-bg)]",
      danger:
        "bg-[var(--active-error-bg)] text-[var(--active-error-text)] border border-[var(--active-error-bg)]",
      warning:
        "bg-[var(--active-warning-bg)] text-[var(--active-warning-text)] border border-[var(--active-warning-bg)]",
      // Spoiler variant with high contrast amber styling
      spoiler: "bg-amber-600 text-white border border-amber-600",
    };

    const sizes = {
      sm: "px-1.5 py-0.5 text-[10px]",
      md: "px-2 py-0.5 text-xs",
    };

    return (
      <span
        ref={ref}
        className={cn(baseStyles, variants[variant], sizes[size], className)}
        {...props}
      />
    );
  }
);
Badge.displayName = "Badge";

export { Badge };
