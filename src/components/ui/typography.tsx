"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

export interface HeadingProps extends React.HTMLAttributes<HTMLHeadingElement> {
  level?: 1 | 2 | 3 | 4 | 5 | 6;
  split?: boolean;
  animate?: boolean;
  variant?: "default" | "display" | "hero";
}

export const Heading = React.forwardRef<HTMLHeadingElement, HeadingProps>(
  (
    {
      className,
      level = 1,
      split = false,
      animate = false,
      variant: _variant = "default",
      children,
      ...props
    },
    ref
  ) => {
    // Typography scale - exact Tailwind classes per BACKROW_LAYOUTS.md
    const getHeadingStyles = (): string => {
      const baseStyles = "text-[var(--text-primary)]";

      switch (level) {
        case 1:
          return cn(baseStyles, "text-2xl font-bold"); // 24px - Page titles
        case 2:
          return cn(baseStyles, "text-xl font-semibold"); // 20px - Section headers
        case 3:
          return cn(baseStyles, "text-lg font-semibold"); // 18px - Card titles
        case 4:
          return cn(baseStyles, "text-base font-semibold"); // 16px - Subsections
        case 5:
          return cn(baseStyles, "text-sm font-semibold");
        case 6:
          return cn(baseStyles, "text-xs font-semibold");
        default:
          return baseStyles;
      }
    };

    const Tag = `h${level}` as "h1" | "h2" | "h3" | "h4" | "h5" | "h6";

    return (
      <Tag
        ref={ref}
        className={cn(
          getHeadingStyles(),
          split && "leading-[0.9]",
          animate && "animate-fade-in",
          className
        )}
        {...props}
      >
        {split && typeof children === "string" ? (
          <span className="block">
            {children.split(" ").map((word, i, arr) => (
              <React.Fragment key={i}>
                <span
                  className={cn("inline-block", animate && "animate-slide-up")}
                  style={{ animationDelay: `${i * 50}ms` }}
                >
                  {word}
                </span>
                {i < arr.length - 1 && <span className="inline-block w-2" />}
              </React.Fragment>
            ))}
          </span>
        ) : (
          children
        )}
      </Tag>
    );
  }
);
Heading.displayName = "Heading";

export interface TextProps extends React.HTMLAttributes<HTMLParagraphElement> {
  size?: "body" | "small" | "tiny" | "sm" | "md" | "lg" | "xl"; // Support both old and new prop names for backward compatibility
  muted?: boolean;
}

export const Text = React.forwardRef<HTMLParagraphElement, TextProps>(
  ({ className, size = "body", muted = false, children, ...props }, ref) => {
    // Typography scale - exact Tailwind classes per BACKROW_LAYOUTS.md
    const getSizeStyles = (): string => {
      // Map old prop names to new ones for backward compatibility
      const normalizedSize =
        size === "md" || size === "lg" || size === "xl" ? "body" : size === "sm" ? "small" : size;

      switch (normalizedSize) {
        case "tiny":
          return "text-xs"; // 12px - Metadata
        case "small":
          return "text-sm"; // 14px - Secondary text
        case "body":
        default:
          return "text-base"; // 16px - Default text
      }
    };

    return (
      <p
        ref={ref}
        className={cn(
          getSizeStyles(),
          muted ? "text-[var(--text-muted)]" : "text-[var(--text-primary)]",
          className
        )}
        {...props}
      >
        {children}
      </p>
    );
  }
);
Text.displayName = "Text";
