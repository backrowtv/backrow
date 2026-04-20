import * as React from "react";
import { cn } from "@/lib/utils";

// Skeleton system - single source of truth for loading placeholders.
//
// Rendering:
// - `pulse` variant adds the `.skeleton` class from globals.css, which sets
//   `background: var(--surface-2)` + a 2.5s opacity pulse. Animation duration,
//   easing, and color all live in CSS — do NOT duplicate them as inline styles.
// - `wave` variant uses the `.animate-shimmer` class (gradient sweep).
// - `none` variant renders a static `var(--surface-2)` fill with no animation.
//
// Accessibility: skeletons are decorative by default (`aria-hidden="true"`).
// For semantic "this region is loading" signaling, wrap a skeleton group in
// `<SkeletonRegion label="Loading X">` — it provides the single SR announcement.

export interface SkeletonProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: "text" | "circular" | "rectangular";
  animation?: "pulse" | "wave" | "none";
}

const Skeleton = React.forwardRef<HTMLDivElement, SkeletonProps>(
  (
    {
      className,
      variant = "rectangular",
      animation = "pulse",
      "aria-hidden": ariaHidden,
      ...props
    },
    ref
  ) => {
    const variantClasses = {
      text: "h-4 rounded",
      circular: "rounded-full",
      rectangular: "rounded-md",
    };

    const animationClasses = {
      pulse: "skeleton",
      wave: "animate-shimmer",
      none: "",
    };

    return (
      <div
        ref={ref}
        aria-hidden={ariaHidden ?? true}
        className={cn(
          "bg-[var(--surface-2)]",
          variantClasses[variant],
          animationClasses[animation],
          className
        )}
        {...props}
      />
    );
  }
);
Skeleton.displayName = "Skeleton";

// ============================================
// Region wrapper
// ============================================

export interface SkeletonRegionProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Short description of what is loading, e.g. "Loading club home". */
  label: string;
  children: React.ReactNode;
}

/**
 * Wraps a group of skeletons with a single polite SR announcement.
 * Use at the top of every `loading.tsx` and around per-component skeleton blocks.
 */
function SkeletonRegion({ label, children, className, ...rest }: SkeletonRegionProps) {
  return (
    <div role="status" aria-live="polite" aria-busy="true" className={className} {...rest}>
      <span className="sr-only">{label}</span>
      {children}
    </div>
  );
}

// ============================================
// Composition helpers
// ============================================

export interface SkeletonTextProps {
  /** Number of lines to render. */
  lines?: number;
  /** Tailwind width class for the last line (defaults to w-3/4 for a natural paragraph shape). */
  lastLineWidth?: string;
  /** Height class applied to every line (default h-3). */
  lineHeight?: string;
  /** Gap between lines (default space-y-1.5). */
  gap?: string;
  className?: string;
}

/** Multi-line text placeholder. Last line is narrower to mimic a real paragraph. */
function SkeletonText({
  lines = 3,
  lastLineWidth = "w-3/4",
  lineHeight = "h-3",
  gap = "space-y-1.5",
  className,
}: SkeletonTextProps) {
  return (
    <div className={cn(gap, className)}>
      {Array.from({ length: lines }).map((_, i) => (
        <Skeleton key={i} className={cn(lineHeight, i === lines - 1 ? lastLineWidth : "w-full")} />
      ))}
    </div>
  );
}

export interface SkeletonListProps {
  /** Number of rows to render. */
  count: number;
  /** Render function for each row. Receives the index. */
  renderItem: (index: number) => React.ReactNode;
  /** Spacing class — either `space-y-*` or `divide-y …` (matches the two real patterns). */
  gap?: string;
  /** When true, uses `divide-y divide-[var(--border)]` and ignores `gap`. */
  divide?: boolean;
  className?: string;
}

/** Repeats a row N times with either `space-y` or `divide-y` separation. */
function SkeletonList({
  count,
  renderItem,
  gap = "space-y-2",
  divide = false,
  className,
}: SkeletonListProps) {
  return (
    <div className={cn(divide ? "divide-y divide-[var(--border)]" : gap, className)}>
      {Array.from({ length: count }).map((_, i) => (
        <React.Fragment key={i}>{renderItem(i)}</React.Fragment>
      ))}
    </div>
  );
}

// Canonical poster sizes — mirror the widths used across the app.
// Heights are derived from aspect-[2/3] so the 2:3 rule cannot drift.
const POSTER_SIZE_CLASSES = {
  xs: "w-20",
  sm: "w-24",
  md: "w-28",
  lg: "w-32",
  xl: "w-48",
} as const;

export interface SkeletonPosterProps {
  size?: keyof typeof POSTER_SIZE_CLASSES;
  className?: string;
}

/** 2:3 poster placeholder at a canonical width. Aspect ratio is locked. */
function SkeletonPoster({ size = "md", className }: SkeletonPosterProps) {
  return (
    <Skeleton
      className={cn(POSTER_SIZE_CLASSES[size], "aspect-[2/3] rounded-lg flex-shrink-0", className)}
    />
  );
}

const AVATAR_SIZE_CLASSES = {
  xs: "w-6 h-6",
  sm: "w-8 h-8",
  md: "w-10 h-10",
  lg: "w-12 h-12",
  xl: "w-16 h-16",
} as const;

export interface SkeletonAvatarProps {
  size?: keyof typeof AVATAR_SIZE_CLASSES;
  /** 'circle' for users (default), 'rounded' for clubs/festivals (rounded-lg). */
  shape?: "circle" | "rounded";
  className?: string;
}

/** Avatar placeholder at a canonical size. Shape defaults to circle. */
function SkeletonAvatar({ size = "md", shape = "circle", className }: SkeletonAvatarProps) {
  return (
    <Skeleton
      className={cn(
        AVATAR_SIZE_CLASSES[size],
        shape === "circle" ? "rounded-full" : "rounded-lg",
        "flex-shrink-0",
        className
      )}
    />
  );
}

export { Skeleton, SkeletonRegion, SkeletonText, SkeletonList, SkeletonPoster, SkeletonAvatar };
