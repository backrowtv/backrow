"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

export interface SegmentedControlOption {
  value: string;
  label: string;
  icon?: React.ReactNode;
}

export interface SegmentedControlProps {
  options: SegmentedControlOption[];
  value: string;
  onChange: (value: string) => void;
  size?: "sm" | "md";
  variant?: "default" | "glass";
  className?: string;
}

/**
 * iOS-style segmented control with animated sliding indicator.
 * Single-select only, with ARIA radiogroup semantics.
 */
export function SegmentedControl({
  options,
  value,
  onChange,
  size = "md",
  variant = "default",
  className,
}: SegmentedControlProps) {
  const containerRef = React.useRef<HTMLDivElement>(null);
  const [indicatorStyle, setIndicatorStyle] = React.useState<React.CSSProperties>({});
  const isGlass = variant === "glass";

  // Calculate indicator position based on selected option
  React.useEffect(() => {
    if (!containerRef.current) return;

    const selectedIndex = options.findIndex((opt) => opt.value === value);
    if (selectedIndex === -1) return;

    const buttons = containerRef.current.querySelectorAll<HTMLButtonElement>('[role="radio"]');
    const selectedButton = buttons[selectedIndex];

    if (selectedButton) {
      setIndicatorStyle({
        width: selectedButton.offsetWidth,
        transform: `translateX(${selectedButton.offsetLeft}px)`,
      });
    }
  }, [value, options]);

  // Handle keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent, currentIndex: number) => {
    let newIndex = currentIndex;

    if (e.key === "ArrowLeft" || e.key === "ArrowUp") {
      e.preventDefault();
      newIndex = currentIndex === 0 ? options.length - 1 : currentIndex - 1;
    } else if (e.key === "ArrowRight" || e.key === "ArrowDown") {
      e.preventDefault();
      newIndex = currentIndex === options.length - 1 ? 0 : currentIndex + 1;
    } else if (e.key === "Home") {
      e.preventDefault();
      newIndex = 0;
    } else if (e.key === "End") {
      e.preventDefault();
      newIndex = options.length - 1;
    } else {
      return;
    }

    onChange(options[newIndex].value);

    // Focus the new button
    const buttons = containerRef.current?.querySelectorAll<HTMLButtonElement>('[role="radio"]');
    buttons?.[newIndex]?.focus();
  };

  return (
    <div
      ref={containerRef}
      role="radiogroup"
      className={cn(
        "relative flex items-center",
        isGlass ? "rounded-lg p-0.5" : "rounded-full p-1",
        !isGlass && "bg-[var(--surface-2)]",
        className
      )}
      style={
        isGlass
          ? {
              background: "light-dark(rgba(0,0,0,0.04), rgba(255,255,255,0.1))",
              boxShadow: `
          inset 0 1px 2px 0 light-dark(rgba(0,0,0,0.08), rgba(0,0,0,0.35)),
          0 1px 0 0 light-dark(rgba(255,255,255,0.6), rgba(255,255,255,0.08))
        `,
              border: "1px solid light-dark(rgba(0,0,0,0.06), rgba(255,255,255,0.06))",
            }
          : undefined
      }
    >
      {/* Sliding indicator */}
      <div
        className={cn(
          "absolute left-0 pointer-events-none",
          "transition-all duration-200 ease-out",
          "motion-reduce:transition-none",
          isGlass
            ? "top-[2px] bottom-[2px] rounded-md"
            : "top-1 h-[calc(100%-8px)] rounded-full bg-[var(--background)] shadow-sm"
        )}
        style={{
          ...indicatorStyle,
          ...(isGlass
            ? {
                background: `light-dark(
              linear-gradient(180deg, rgba(255,255,255,1) 0%, rgba(245,245,245,1) 100%),
              linear-gradient(180deg, rgba(255,255,255,0.28) 0%, rgba(255,255,255,0.16) 100%)
            )`,
                boxShadow: `
              inset 0 1px 0 0 light-dark(rgba(255,255,255,1), rgba(255,255,255,0.4)),
              inset 0 -1px 0 0 light-dark(rgba(0,0,0,0.08), rgba(0,0,0,0.3)),
              0 1px 2px 0 light-dark(rgba(0,0,0,0.15), rgba(0,0,0,0.5)),
              0 3px 8px 0 light-dark(rgba(0,0,0,0.08), rgba(0,0,0,0.35)),
              0 0 0 1px light-dark(rgba(0,0,0,0.12), rgba(255,255,255,0.2))
            `,
                willChange: "left, width",
              }
            : {}),
        }}
        aria-hidden="true"
      />

      {/* Options */}
      {options.map((option, index) => {
        const isSelected = value === option.value;

        return (
          <button
            key={option.value}
            role="radio"
            aria-checked={isSelected}
            tabIndex={isSelected ? 0 : -1}
            onClick={() => onChange(option.value)}
            onKeyDown={(e) => handleKeyDown(e, index)}
            className={cn(
              "relative z-10 flex-1",
              "inline-flex items-center justify-center gap-1.5",
              isGlass ? "rounded-md" : "rounded-full",
              "font-medium",
              "transition-colors duration-150",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)] focus-visible:ring-offset-2",
              // Size variants
              size === "sm" && "px-3 py-1.5 text-xs",
              size === "md" && "px-4 py-2 text-sm",
              // Color states
              isSelected
                ? "text-[var(--text-primary)]"
                : "text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
            )}
          >
            {option.icon && <span className="flex-shrink-0 [&>svg]:size-4">{option.icon}</span>}
            <span>{option.label}</span>
          </button>
        );
      })}
    </div>
  );
}
