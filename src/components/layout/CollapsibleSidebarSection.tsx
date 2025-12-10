"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { CaretDown, CaretRight, FilmSlate } from "@phosphor-icons/react";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

interface CollapsibleSidebarSectionProps {
  label: string;
  children: React.ReactNode;
  className?: string;
  collapsed?: boolean;
  defaultOpen?: boolean;
  count?: number;
  alwaysVisibleItem?: React.ReactNode;
  href?: string;
}

export function CollapsibleSidebarSection({
  label,
  children,
  className,
  collapsed = false,
  defaultOpen = false,
  count,
  alwaysVisibleItem,
  href,
}: CollapsibleSidebarSectionProps) {
  const [isOpen, setIsOpen] = useState(defaultOpen);
  const pathname = usePathname();
  const isActive = href
    ? pathname === href || (href === "/clubs" && pathname.startsWith("/club/"))
    : false;

  if (collapsed) {
    // When collapsed, only show the header icon (as link) and favorite club
    const iconContent = (
      <div className="relative group">
        <FilmSlate className="h-5 w-5 shrink-0 text-[var(--text-muted)] opacity-70 group-hover:opacity-100 transition-all duration-200 ease-out" />
      </div>
    );

    const headerWithTooltip = (
      <TooltipProvider delayDuration={300}>
        <Tooltip>
          <TooltipTrigger asChild>
            {href ? (
              <Link
                href={href}
                aria-label={label}
                className={cn(
                  "flex items-center justify-center h-9 w-9 mx-auto rounded-md transition-all duration-200 ease-out active:scale-[0.95]",
                  isActive && "bg-[var(--surface-2)] shadow-[inset_0_1px_3px_rgba(0,0,0,0.15)]"
                )}
                prefetch={true}
              >
                {iconContent}
              </Link>
            ) : (
              <div
                className={cn(
                  "flex items-center justify-center h-9 w-9 mx-auto rounded-md",
                  isActive && "bg-[var(--surface-2)] shadow-[inset_0_1px_3px_rgba(0,0,0,0.15)]"
                )}
                aria-label={label}
              >
                {iconContent}
              </div>
            )}
          </TooltipTrigger>
          <TooltipContent
            side="right"
            className="bg-[var(--surface-3)] border border-[var(--border)] text-[var(--text-primary)]"
          >
            <p className="font-medium">{label}</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );

    // Return fragment to avoid extra wrapper div that affects centering
    return (
      <>
        {headerWithTooltip}
        {alwaysVisibleItem}
      </>
    );
  }

  return (
    <div className={cn("space-y-1", className)}>
      {/* Header row - clickable link + separate expand/collapse caret */}
      <div className="flex items-center">
        {/* Main clickable area - navigates to href */}
        {href ? (
          <Link
            href={href}
            className={cn(
              "flex-1 flex items-center gap-2 h-9 px-2 rounded-md overflow-hidden",
              "transition-all duration-300 ease-out",
              "will-change-[background-color,color,transform]",
              isActive
                ? "text-[var(--text-primary)] font-medium bg-[var(--surface-2)] shadow-[inset_0_1px_3px_rgba(0,0,0,0.15)]"
                : "text-[var(--text-secondary)] hover:text-[var(--text-primary)]",
              "active:scale-[0.98]"
            )}
          >
            <FilmSlate className="h-5 w-5 shrink-0 text-[var(--text-muted)] transition-colors duration-300 ease-out" />
            <span className="text-sm flex-1 text-left whitespace-nowrap overflow-hidden transition-colors duration-300 ease-out">
              {label}
            </span>
            {count !== undefined && (
              <span className="text-xs text-[var(--text-muted)] whitespace-nowrap transition-colors duration-300 ease-out">
                {count}
              </span>
            )}
          </Link>
        ) : (
          <div className="flex-1 flex items-center gap-2 h-9 px-2 overflow-hidden">
            <FilmSlate className="h-5 w-5 shrink-0 text-[var(--text-muted)] transition-colors duration-300 ease-out" />
            <span className="text-sm flex-1 text-left text-[var(--text-secondary)] whitespace-nowrap overflow-hidden transition-colors duration-300 ease-out">
              {label}
            </span>
            {count !== undefined && (
              <span className="text-xs text-[var(--text-muted)] whitespace-nowrap transition-colors duration-300 ease-out">
                {count}
              </span>
            )}
          </div>
        )}

        {/* Separate caret button for expand/collapse */}
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setIsOpen(!isOpen)}
          className={cn(
            "h-8 w-8 p-0 rounded-md flex-shrink-0",
            "transition-all duration-300 ease-out",
            "text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--hover)]",
            "active:scale-[0.95]"
          )}
          aria-expanded={isOpen}
          aria-label={`${isOpen ? "Collapse" : "Expand"} ${label}`}
        >
          {isOpen ? (
            <CaretDown
              className="h-4 w-4 transition-transform duration-400 ease-out"
              weight="bold"
            />
          ) : (
            <CaretRight
              className="h-4 w-4 transition-transform duration-400 ease-out"
              weight="bold"
            />
          )}
        </Button>
      </div>

      {/* When closed, show favorite outside. When open, it goes inside the list at top */}
      {!isOpen && alwaysVisibleItem}

      {isOpen && (
        <div className="space-y-0.5 pl-2 mt-0.5 overflow-hidden">
          <div className="animate-in slide-in-from-top-1 fade-in duration-300 space-y-0.5">
            {/* Favorite club at top when expanded */}
            {alwaysVisibleItem}
            {children}
          </div>
        </div>
      )}
    </div>
  );
}
