"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import { ScrollNavButton } from "@/components/ui/scroll-nav-button";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";

interface MobileTabsContextValue {
  activeTab: string;
  setActiveTab: (id: string) => void;
}

const MobileTabsContext = React.createContext<MobileTabsContextValue | null>(null);

function useMobileTabs() {
  const context = React.useContext(MobileTabsContext);
  if (!context) {
    throw new Error("useMobileTabs must be used within MobileTabs");
  }
  return context;
}

export interface MobileTabsProps {
  defaultValue: string;
  value?: string;
  onValueChange?: (value: string) => void;
  children: React.ReactNode;
  className?: string;
}

/**
 * Mobile-optimized horizontal scrollable tabs component.
 * Features: Smooth scrolling, underline indicator animation, swipe support.
 */
export function MobileTabs({
  defaultValue,
  value,
  onValueChange,
  children,
  className,
}: MobileTabsProps) {
  const [activeTab, setActiveTabInternal] = React.useState(defaultValue);

  const currentTab = value ?? activeTab;

  const setActiveTab = React.useCallback(
    (id: string) => {
      if (!value) {
        setActiveTabInternal(id);
      }
      onValueChange?.(id);
    },
    [value, onValueChange]
  );

  return (
    <MobileTabsContext.Provider value={{ activeTab: currentTab, setActiveTab }}>
      <div className={cn("w-full", className)}>{children}</div>
    </MobileTabsContext.Provider>
  );
}

export interface MobileTabListProps {
  children: React.ReactNode;
  className?: string;
}

export function MobileTabList({ children, className }: MobileTabListProps) {
  const scrollRef = React.useRef<HTMLDivElement>(null);
  const { activeTab } = useMobileTabs();
  const [canScrollLeft, setCanScrollLeft] = React.useState(false);
  const [canScrollRight, setCanScrollRight] = React.useState(false);

  const checkScrollButtons = React.useCallback(() => {
    const container = scrollRef.current;
    if (!container) return;

    setCanScrollLeft(container.scrollLeft > 0);
    setCanScrollRight(container.scrollLeft < container.scrollWidth - container.clientWidth - 10);
  }, []);

  React.useEffect(() => {
    const container = scrollRef.current;
    if (!container) return;

    checkScrollButtons();
    container.addEventListener("scroll", checkScrollButtons);
    window.addEventListener("resize", checkScrollButtons);

    return () => {
      container.removeEventListener("scroll", checkScrollButtons);
      window.removeEventListener("resize", checkScrollButtons);
    };
  }, [checkScrollButtons]);

  // Auto-scroll to active tab
  React.useEffect(() => {
    if (scrollRef.current) {
      const activeElement = scrollRef.current.querySelector(`[data-tab-id="${activeTab}"]`);
      if (activeElement) {
        activeElement.scrollIntoView({ behavior: "smooth", block: "nearest", inline: "center" });
      }
    }
    // Check scroll buttons after auto-scroll completes
    setTimeout(checkScrollButtons, 300);
  }, [activeTab, checkScrollButtons]);

  const scroll = (direction: "left" | "right") => {
    const container = scrollRef.current;
    if (!container) return;

    const scrollAmount = container.clientWidth * 0.5;
    container.scrollBy({
      left: direction === "left" ? -scrollAmount : scrollAmount,
      behavior: "smooth",
    });
  };

  return (
    <div className="relative border-b border-[var(--border)]">
      {/* Left nav button */}
      {canScrollLeft && (
        <div className="absolute left-1 top-1/2 -translate-y-1/2 z-10">
          <ScrollNavButton direction="left" onClick={() => scroll("left")} size="sm" />
        </div>
      )}

      {/* Right nav button */}
      {canScrollRight && (
        <div className="absolute right-1 top-1/2 -translate-y-1/2 z-10">
          <ScrollNavButton direction="right" onClick={() => scroll("right")} size="sm" />
        </div>
      )}

      <div
        ref={scrollRef}
        className={cn(
          "flex gap-1 px-4 py-2 overflow-x-auto scrollbar-hide",
          canScrollLeft && "pl-8",
          canScrollRight && "pr-8",
          className
        )}
      >
        {children}
      </div>
    </div>
  );
}

export interface MobileTabTriggerProps {
  value: string;
  children: React.ReactNode;
  className?: string;
  disabled?: boolean;
}

export function MobileTabTrigger({ value, children, className, disabled }: MobileTabTriggerProps) {
  const { activeTab, setActiveTab } = useMobileTabs();
  const isActive = activeTab === value;
  const ref = React.useRef<HTMLButtonElement>(null);

  return (
    <button
      ref={ref}
      data-tab-id={value}
      onClick={() => !disabled && setActiveTab(value)}
      disabled={disabled}
      className={cn(
        "relative flex-shrink-0",
        "px-4 py-2.5",
        "text-sm font-medium",
        "rounded-lg",
        "transition-all duration-200",
        "whitespace-nowrap",
        "focus-visible:outline-2 focus-visible:outline-[var(--ring)] focus-visible:outline-offset-2",
        isActive
          ? "text-[var(--text-primary)] font-semibold border-b-2 border-b-[var(--primary)]"
          : "text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--surface-1)]",
        disabled && "opacity-50 cursor-not-allowed",
        className
      )}
      aria-selected={isActive}
      role="tab"
    >
      {children}

      {/* Active indicator */}
      {isActive && (
        <span
          className={cn(
            "absolute bottom-0 left-1/2 -translate-x-1/2",
            "w-8 h-0.5 rounded-full",
            "bg-[var(--primary)]",
            "animate-tab-indicator"
          )}
        />
      )}
    </button>
  );
}

export interface MobileTabContentProps {
  value: string;
  children: React.ReactNode;
  className?: string;
}

export function MobileTabContent({ value, children, className }: MobileTabContentProps) {
  const { activeTab } = useMobileTabs();

  if (activeTab !== value) {
    return null;
  }

  return (
    <div
      className={cn("animate-fade-in", className)}
      role="tabpanel"
      aria-labelledby={`tab-${value}`}
    >
      {children}
    </div>
  );
}

// Alternate pill-style tabs for category selection
export interface MobileTabPillsProps {
  options: Array<{ value: string; label: string; count?: number }>;
  value: string;
  onChange: (value: string) => void;
  className?: string;
}

export function MobileTabPills({ options, value, onChange, className }: MobileTabPillsProps) {
  return (
    <ScrollArea className={cn("w-full -mx-4 px-4", className)}>
      <div className="flex gap-2 pb-2">
        {options.map((option) => (
          <button
            key={option.value}
            onClick={() => onChange(option.value)}
            className={cn(
              "flex-shrink-0",
              "h-9 px-4 rounded-full",
              "text-sm font-medium",
              "transition-all duration-200",
              "active:scale-95",
              "whitespace-nowrap",
              value === option.value
                ? "bg-[var(--primary)] text-[var(--background)]"
                : "bg-[var(--surface-1)] text-[var(--text-secondary)] hover:bg-[var(--surface-2)]"
            )}
          >
            {option.label}
            {option.count !== undefined && (
              <span
                className={cn(
                  "ml-1.5 text-xs",
                  value === option.value ? "opacity-70" : "text-[var(--text-muted)]"
                )}
              >
                {option.count}
              </span>
            )}
          </button>
        ))}
      </div>
      <ScrollBar orientation="horizontal" className="hidden" />
    </ScrollArea>
  );
}
