"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import type { ElementType, ReactNode } from "react";

interface SidebarItemProps {
  icon?: ElementType;
  /** Custom element to use instead of icon (e.g., ClubAvatar) */
  iconElement?: ReactNode;
  label: ReactNode;
  href: string;
  badge?: number | string | null;
  collapsed?: boolean;
  iconClassName?: string;
}

export function SidebarItem({
  icon: Icon,
  iconElement,
  label,
  href,
  badge,
  collapsed = false,
  iconClassName,
}: SidebarItemProps) {
  const pathname = usePathname();

  // Smart active detection like mobile nav
  const isActive = (() => {
    // Exact match
    if (pathname === href) return true;

    // Home is only active on exact match
    if (href === "/") return false;

    // Clubs: /clubs or /club/* routes
    if (href === "/clubs") {
      return pathname === "/clubs" || pathname.startsWith("/club/");
    }

    // Profile: /profile or /profile/* routes
    if (href === "/profile") {
      return pathname.startsWith("/profile");
    }

    // Activity: /activity or /activity/* routes
    if (href === "/activity") {
      return pathname.startsWith("/activity");
    }

    // Search: /search or /search/* routes
    if (href === "/search") {
      return pathname.startsWith("/search");
    }

    // Discover: /discover or /discover/* routes
    if (href === "/discover") {
      return pathname.startsWith("/discover");
    }

    // Generic prefix match for other routes
    return pathname.startsWith(href + "/");
  })();

  const iconContent = (
    <div className="relative group flex items-center justify-center">
      {iconElement ? (
        <span
          className={cn(
            "shrink-0 flex items-center justify-center transition-opacity duration-200",
            !isActive && "opacity-70 group-hover:opacity-100"
          )}
        >
          {iconElement}
        </span>
      ) : Icon ? (
        <Icon
          className={cn(
            "h-5 w-5 shrink-0 transition-colors duration-200 ease-out",
            iconClassName
              ? iconClassName
              : "text-[var(--text-muted)] group-hover:text-[var(--text-primary)]"
          )}
        />
      ) : null}
    </div>
  );

  const buttonContent = (
    <div className="relative group">
      <Button
        variant="ghost"
        className={cn(
          "w-full h-9 relative rounded-md",
          "transition-colors duration-200 ease-out",
          "justify-start px-2 py-0",
          isActive
            ? "text-[var(--text-primary)] font-medium bg-[var(--surface-2)] shadow-[inset_0_1px_3px_rgba(0,0,0,0.15)]"
            : "text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--hover)]"
        )}
      >
        <div className="flex items-center w-full gap-2">
          {iconElement ? (
            <span className="shrink-0 flex items-center">{iconElement}</span>
          ) : Icon ? (
            <Icon
              className={cn(
                "h-5 w-5 shrink-0 transition-colors duration-200 ease-out",
                iconClassName ? iconClassName : "text-[var(--text-muted)]"
              )}
            />
          ) : null}
          <span className="text-sm text-left whitespace-nowrap overflow-hidden opacity-100 w-auto flex-1">
            {label}
          </span>
          {badge !== undefined && badge !== null && (
            <Badge
              variant="secondary"
              className={cn(
                "text-xs whitespace-nowrap ml-auto",
                isActive && "bg-[var(--surface-3)] text-[var(--text-primary)]"
              )}
            >
              {badge}
            </Badge>
          )}
        </div>
      </Button>
    </div>
  );

  if (collapsed) {
    return (
      <TooltipProvider delayDuration={300}>
        <Tooltip>
          <TooltipTrigger asChild>
            <Link
              href={href}
              aria-current={isActive ? "page" : undefined}
              className={cn(
                "flex items-center justify-center h-9 w-9 mx-auto rounded-md transition-all duration-200 ease-out active:scale-[0.95]",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)]",
                isActive && "bg-[var(--surface-2)] shadow-[inset_0_1px_3px_rgba(0,0,0,0.15)]"
              )}
              prefetch={true}
            >
              {iconContent}
            </Link>
          </TooltipTrigger>
          <TooltipContent
            side="right"
            className="bg-[var(--surface-3)] border border-[var(--border)] text-[var(--text-primary)] transition-opacity duration-300"
          >
            <p className="font-medium">{label}</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  return (
    <Link
      href={href}
      aria-current={isActive ? "page" : undefined}
      className="block rounded-md transition-transform duration-300 ease-out active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)]"
      prefetch={true}
    >
      {buttonContent}
    </Link>
  );
}
