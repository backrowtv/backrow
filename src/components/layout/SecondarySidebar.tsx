"use client";

import { usePathname, useSearchParams } from "next/navigation";
import { Suspense, useCallback } from "react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { Text } from "@/components/ui/typography";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { useEffect, useState, useRef } from "react";
import { useSidebar } from "./SidebarContext";
import { useSecondarySidebar } from "./SecondarySidebarContext";
import {
  CaretRight,
  CaretLeft,
  CaretDown,
  SidebarSimple,
  CursorClick,
} from "@phosphor-icons/react";

export interface SecondarySidebarItem {
  label: string;
  href: string;
  icon?: React.ReactNode;
  badge?: string | number;
  children?: SecondarySidebarItem[]; // For nested navigation ($$$ and $$$$)
  hideOnMobile?: boolean; // Hide this item and its children on mobile
}

interface SecondarySidebarProps {
  items: SecondarySidebarItem[];
  className?: string;
}

function SecondarySidebarInner({ items, className }: SecondarySidebarProps) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [currentHash, setCurrentHash] = useState("");
  const prevPathnameRef = useRef<string>("");
  const [isTransitioning, setIsTransitioning] = useState(false);
  // Track which sections are manually expanded/collapsed (keyed by item.href)
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({});
  // Prevent accidental click on mode buttons after expand
  const [modeButtonsDisabled, setModeButtonsDisabled] = useState(false);
  const {
    sidebarWidth: _mainSidebarWidth,
    isCollapsed: mainIsCollapsed,
    mode: mainMode,
  } = useSidebar();
  const {
    isCollapsed,
    toggleSidebar,
    sidebarWidth,
    mode,
    setMode,
    isHovered: _isHovered,
    setIsHovered,
    hasMounted,
  } = useSecondarySidebar();

  // Main sidebar widths - must match useSidebarState defaults
  const collapsedMainSidebarWidth = 56;
  const expandedMainSidebarWidth = 232;

  // When main sidebar is in "expanded" mode and not collapsed, it should push secondary sidebar
  // Otherwise, it overlays (secondary sidebar stays at collapsed position)
  const shouldPushSecondary = mainMode === "expanded" && !mainIsCollapsed;
  const secondarySidebarLeft = shouldPushSecondary
    ? expandedMainSidebarWidth
    : collapsedMainSidebarWidth;

  // Adjust z-index: when pushing, secondary sidebar can be same level, otherwise main overlays
  const zIndex = shouldPushSecondary ? "z-20" : "z-20";

  useEffect(() => {
    // Handle hash changes
    const handleHashChange = () => {
      setCurrentHash(window.location.hash.slice(1));
    };

    // Set initial hash
    setCurrentHash(window.location.hash.slice(1));

    window.addEventListener("hashchange", handleHashChange);
    return () => window.removeEventListener("hashchange", handleHashChange);
  }, []);

  // Track pathname changes to detect settings transitions
  useEffect(() => {
    const prevPath = prevPathnameRef.current;
    const currentPath = pathname;

    // Check if transitioning to/from settings
    const wasInSettings = prevPath.includes("/settings");
    const isInSettings = currentPath.includes("/settings");
    const transitioningToSettings = !wasInSettings && isInSettings;
    const transitioningFromSettings = wasInSettings && !isInSettings;

    if (transitioningToSettings || transitioningFromSettings) {
      setIsTransitioning(true);
      const timer = setTimeout(() => setIsTransitioning(false), 500);
      return () => clearTimeout(timer);
    }

    prevPathnameRef.current = currentPath;
  }, [pathname]);

  // Helper to check if an item or any of its children are active (for auto-expanding)
  // We need to check if this section is the MOST SPECIFIC match, not just any match
  const checkItemOrChildActive = useCallback(
    (
      item: SecondarySidebarItem,
      currentPath: string,
      allItems: SecondarySidebarItem[]
    ): boolean => {
      const itemPath = item.href.split("#")[0].split("?")[0];

      // Check if any child matches the current path
      if (item.children) {
        const childMatches = item.children.some((child) => {
          const childPath = child.href.split("#")[0].split("?")[0];
          return (
            currentPath === childPath ||
            (childPath !== "/" && currentPath.startsWith(childPath + "/")) ||
            (childPath !== "/" && currentPath.startsWith(childPath))
          );
        });
        if (childMatches) return true;
      }

      // Check if the item itself is an exact match (not a prefix match for items with children)
      const isExactMatch = currentPath === itemPath;
      if (isExactMatch) return true;

      // For items without children, allow prefix matching
      if (!item.children && itemPath !== "/" && currentPath.startsWith(itemPath)) {
        return true;
      }

      // For items with children: only auto-expand if no OTHER sibling section has a more specific match
      // This prevents /club/slug from matching when /club/slug/manage is more specific
      if (item.children && itemPath !== "/" && currentPath.startsWith(itemPath)) {
        // Check if any other sibling has a more specific match
        const otherSiblingHasMoreSpecificMatch = allItems.some((sibling) => {
          if (sibling.href === item.href) return false; // Skip self
          const siblingPath = sibling.href.split("#")[0].split("?")[0];
          // Another sibling matches and is more specific (longer path that matches)
          return (
            siblingPath !== itemPath &&
            siblingPath.length > itemPath.length &&
            currentPath.startsWith(siblingPath)
          );
        });
        return !otherSiblingHasMoreSpecificMatch;
      }

      return false;
    },
    []
  );

  // Determine if a section should be expanded
  const isSectionExpanded = useCallback(
    (item: SecondarySidebarItem): boolean => {
      // If user has manually toggled this section, use their preference
      if (expandedSections[item.href] !== undefined) {
        return expandedSections[item.href];
      }
      // Otherwise, auto-expand if active (passing all items for specificity check)
      return checkItemOrChildActive(item, pathname, items);
    },
    [expandedSections, pathname, checkItemOrChildActive, items]
  );

  // Toggle a section's expanded state
  const toggleSection = useCallback(
    (href: string) => {
      setExpandedSections((prev) => ({
        ...prev,
        [href]: !isSectionExpanded({ href, label: "" }),
      }));
    },
    [isSectionExpanded]
  );

  // Track the last items length we reset for
  const lastItemsLengthRef = useRef<number>(items.length);

  // Reset manual expansion states when items change significantly
  useEffect(() => {
    // Only reset if items length actually changed from what we last saw
    if (lastItemsLengthRef.current !== items.length) {
      lastItemsLengthRef.current = items.length;
      setExpandedSections({});
    }
  }, [items.length]);

  return (
    <>
      {/* Mobile Collapsible Menu - only render after mount to prevent hydration flash */}
      {hasMounted && !isCollapsed && (
        <div
          role="button"
          tabIndex={0}
          aria-label="Close sidebar"
          className="lg:hidden fixed inset-0 bg-black/50 z-30"
          onClick={toggleSidebar}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " " || e.key === "Escape") {
              e.preventDefault();
              toggleSidebar();
            }
          }}
        />
      )}
      {hasMounted && (
        <aside
          className={cn(
            "lg:hidden fixed top-0 left-0 right-0 bottom-0 z-40",
            "bg-[var(--sidebar)]/95 backdrop-blur-xl border-r border-[var(--border)]/50",
            "transform transition-transform duration-300 ease-out",
            "max-w-[min(24rem,85vw)] shadow-xl",
            isCollapsed ? "translate-x-[-100%]" : "translate-x-0"
          )}
          onMouseEnter={() => mode === "hover" && setIsHovered(true)}
          onMouseLeave={() => mode === "hover" && setIsHovered(false)}
        >
          <div className="flex flex-col h-full">
            <div className="flex items-center justify-between p-4 border-b border-[var(--border)]">
              <Text className="font-semibold">Navigation</Text>
              <Button variant="ghost" size="icon" onClick={toggleSidebar}>
                <CaretLeft className="h-4 w-4" />
              </Button>
            </div>
            <nav className="flex-1 overflow-y-auto p-3">
              <div className="space-y-1">
                {items
                  .filter((item) => !item.hideOnMobile)
                  .map((item) => {
                    const itemPath = item.href.split("#")[0];
                    // Exact match or startsWith for nested routes (e.g. discuss/thread-slug)
                    const isActive =
                      pathname === itemPath ||
                      (itemPath !== "/" && pathname.startsWith(itemPath + "/"));

                    return (
                      <Link
                        key={item.href}
                        href={item.href}
                        onClick={() => toggleSidebar()}
                        className={cn(
                          "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium",
                          "transition-all duration-150",
                          isActive
                            ? "text-[var(--text-primary)] font-semibold bg-[var(--surface-2)] shadow-[inset_0_1px_3px_rgba(0,0,0,0.15)]"
                            : "text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--hover)]"
                        )}
                      >
                        {item.icon && <span className="flex-shrink-0">{item.icon}</span>}
                        <span className="flex-1">{item.label}</span>
                      </Link>
                    );
                  })}
              </div>
            </nav>
          </div>
        </aside>
      )}

      {/* Desktop Sidebar */}
      <aside
        className={cn(
          "fixed top-0 bottom-0",
          "border-r border-[var(--border)]/50 bg-[var(--sidebar)]/80 backdrop-blur-xl",
          "hidden lg:block transition-all duration-250",
          zIndex,
          className
        )}
        style={{
          left: `${secondarySidebarLeft}px`,
          width: `${sidebarWidth}px`,
          height: "100vh",
          paddingTop: "0px",
          transition:
            "left 250ms cubic-bezier(0.4, 0, 0.2, 1), width 250ms cubic-bezier(0.4, 0, 0.2, 1)",
          willChange: "left, width",
        }}
        onMouseEnter={() => mode === "hover" && setIsHovered(true)}
        onMouseLeave={() => mode === "hover" && setIsHovered(false)}
      >
        <div className={cn("flex flex-col h-full min-h-0", "bg-[var(--sidebar)]")}>
          <nav
            className={cn(
              "flex flex-col h-full min-h-0 overflow-y-auto overflow-x-hidden transition-all duration-250 ease-out",
              isCollapsed ? "px-1.5 pt-3 pb-2" : "px-2 pt-3 pb-2"
            )}
            style={{
              transition: "padding 250ms cubic-bezier(0.4, 0, 0.2, 1)",
            }}
          >
            <div className={cn("space-y-1", isCollapsed ? "" : "px-1")}>
              <div
                className="space-y-1"
                style={{
                  animation: isTransitioning
                    ? "slideDownIn 500ms cubic-bezier(0.25, 0.46, 0.45, 0.94)"
                    : undefined,
                  willChange: isTransitioning ? "opacity, transform" : undefined,
                }}
              >
                {items.map((item) => {
                  // Handle hash navigation (e.g., /profile#reviews)
                  const itemPath = item.href.split("#")[0];
                  const itemHash = item.href.includes("#") ? item.href.split("#")[1] : null;

                  // Check for EXACT path match only (not prefix) - green highlight only for exact match
                  const exactPathMatch = pathname === itemPath;

                  // Check if hash matches (for hash-based navigation)
                  const hashMatches = itemHash && currentHash === itemHash && pathname === itemPath;

                  // Check if search params match (for query-based navigation)
                  const queryMatches =
                    item.href.includes("?") &&
                    searchParams &&
                    item.href.split("?")[1] === searchParams.toString();

                  // isActive = true ONLY for exact matches (green highlight)
                  const isActive = exactPathMatch || hashMatches || queryMatches;

                  // Check if any child is active (for nested navigation)
                  const hasActiveChild =
                    item.children?.some((child) => {
                      const childPath = child.href.split("#")[0];
                      return (
                        pathname === childPath ||
                        (childPath !== "/" && pathname.startsWith(childPath))
                      );
                    }) || false;

                  // isParentActive = true when this section contains the active route (but isn't the exact active page)
                  const isParentActive = hasActiveChild;

                  // Check if this section should be expanded (for collapsible behavior)
                  const hasChildren = item.children && item.children.length > 0;
                  const sectionExpanded = hasChildren ? isSectionExpanded(item) : false;

                  // For items with children: icon/label is a link, chevron toggles expand/collapse
                  // For items without children: the whole thing is a link
                  const headerContent = (
                    <div
                      className={cn(
                        "relative flex items-center rounded-lg text-sm font-medium",
                        "transition-all duration-150 ease-out group",
                        "will-change-[background-color,color,transform]",
                        isCollapsed ? "justify-center px-2 py-2.5" : "gap-3 px-3 py-2.5",
                        isActive
                          ? "text-[var(--text-primary)] font-semibold bg-[var(--surface-2)] shadow-[inset_0_1px_3px_rgba(0,0,0,0.15)]"
                          : isParentActive
                            ? "text-[var(--text-primary)] font-medium bg-[var(--surface-2)] shadow-[inset_0_1px_3px_rgba(0,0,0,0.15)]"
                            : "text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--hover)]"
                      )}
                      aria-current={isActive ? "page" : undefined}
                    >
                      {item.icon && (
                        <span
                          className={cn(
                            "flex-shrink-0 transition-all duration-250 ease-out",
                            "group-hover:scale-105",
                            isCollapsed ? "h-5 w-5" : "h-5 w-5"
                          )}
                        >
                          {item.icon}
                        </span>
                      )}

                      <span
                        className={cn(
                          "transition-all duration-250 ease-out overflow-hidden",
                          isCollapsed ? "opacity-0 w-0 absolute" : "opacity-100 w-auto flex-1"
                        )}
                        style={{
                          transition:
                            "opacity 250ms cubic-bezier(0.4, 0, 0.2, 1), width 250ms cubic-bezier(0.4, 0, 0.2, 1)",
                          whiteSpace: "nowrap",
                        }}
                      >
                        {item.label}
                      </span>
                      {!isCollapsed && item.badge && (
                        <span
                          className={cn(
                            "px-2 py-0.5 text-xs font-medium rounded-full bg-[var(--surface-3)] text-[var(--text-primary)] transition-all duration-250 ease-out",
                            isCollapsed ? "opacity-0 scale-95" : "opacity-100 scale-100"
                          )}
                        >
                          {item.badge}
                        </span>
                      )}
                    </div>
                  );

                  // Separate chevron button for expand/collapse (only for items with children)
                  const chevronButton =
                    hasChildren && !isCollapsed ? (
                      <button
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          toggleSection(item.href);
                        }}
                        className={cn(
                          "flex items-center justify-center h-8 w-8 rounded-md",
                          "transition-all duration-150 ease-out",
                          "hover:bg-[var(--hover)] active:scale-95",
                          "text-[var(--text-muted)] hover:text-[var(--text-primary)]"
                        )}
                        aria-expanded={sectionExpanded}
                        aria-label={
                          sectionExpanded ? `Collapse ${item.label}` : `Expand ${item.label}`
                        }
                      >
                        <CaretDown
                          className={cn(
                            "h-4 w-4 transition-transform duration-200 ease-out",
                            sectionExpanded ? "rotate-0" : "-rotate-90"
                          )}
                        />
                      </button>
                    ) : null;

                  return (
                    <div key={item.href} className="space-y-1">
                      {isCollapsed ? (
                        <TooltipProvider delayDuration={150}>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Link
                                href={item.href}
                                className="block rounded-md active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)]"
                              >
                                {headerContent}
                              </Link>
                            </TooltipTrigger>
                            <TooltipContent
                              side="right"
                              className="bg-[var(--surface-3)] border border-[var(--border)] text-[var(--text-primary)]"
                            >
                              <p className="font-medium">{item.label}</p>
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      ) : (
                        // For expanded sidebar: link + chevron button side by side
                        <div className="flex items-center">
                          <Link
                            href={item.href}
                            prefetch={true}
                            className="flex-1 rounded-md active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)]"
                          >
                            {headerContent}
                          </Link>
                          {chevronButton}
                        </div>
                      )}

                      {/* Render children if section is expanded (collapsible behavior) */}
                      {hasChildren && (
                        <div
                          className={cn(
                            "space-y-1 transition-all duration-200 ease-out overflow-hidden",
                            isCollapsed
                              ? "ml-0 pl-0 border-0"
                              : "ml-4 pl-4 border-l border-[var(--border)]",
                            sectionExpanded ? "max-h-[500px] opacity-100" : "max-h-0 opacity-0"
                          )}
                          style={{
                            transition:
                              "max-height 200ms cubic-bezier(0.4, 0, 0.2, 1), opacity 200ms cubic-bezier(0.4, 0, 0.2, 1), margin-left 250ms cubic-bezier(0.4, 0, 0.2, 1), padding-left 250ms cubic-bezier(0.4, 0, 0.2, 1)",
                          }}
                        >
                          {item.children?.map((child) => {
                            const childPath = child.href.split("#")[0];
                            const childHash = child.href.includes("#")
                              ? child.href.split("#")[1]
                              : null;
                            // Exact match or startsWith for nested routes (e.g. discuss/thread-slug)
                            const childExactMatch =
                              pathname === childPath ||
                              (childPath !== "/" && pathname.startsWith(childPath + "/"));
                            const childHashMatches =
                              childHash && currentHash === childHash && pathname === childPath;
                            const childIsActive = childExactMatch || childHashMatches;

                            const childLinkContent = (
                              <Link
                                key={child.href}
                                href={child.href}
                                className={cn(
                                  "relative flex items-center rounded-lg text-sm font-medium transition-all duration-150 ease-out group",
                                  "will-change-[background-color,color,transform] active:scale-[0.98]",
                                  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)]",
                                  isCollapsed ? "justify-center px-2 py-2.5" : "gap-3 px-3 py-2",
                                  childIsActive
                                    ? "text-[var(--text-primary)] font-semibold bg-[var(--surface-2)] shadow-[inset_0_1px_3px_rgba(0,0,0,0.15)]"
                                    : "text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--hover)]"
                                )}
                                aria-current={childIsActive ? "page" : undefined}
                                prefetch={true}
                              >
                                {child.icon && (
                                  <span
                                    className={cn(
                                      "flex-shrink-0 transition-transform duration-150 ease-out",
                                      isCollapsed ? "h-4 w-4" : "h-4 w-4",
                                      "group-hover:scale-105"
                                    )}
                                  >
                                    {child.icon}
                                  </span>
                                )}

                                {!isCollapsed && (
                                  <>
                                    <span className="flex-1 transition-opacity duration-150 ease-out text-xs">
                                      {child.label}
                                    </span>
                                    {child.badge && (
                                      <span className="px-1.5 py-0.5 text-xs font-medium rounded-full bg-[var(--surface-3)] text-[var(--text-primary)]">
                                        {child.badge}
                                      </span>
                                    )}
                                  </>
                                )}
                              </Link>
                            );

                            return isCollapsed ? (
                              <TooltipProvider key={child.href} delayDuration={150}>
                                <Tooltip>
                                  <TooltipTrigger asChild>{childLinkContent}</TooltipTrigger>
                                  <TooltipContent
                                    side="right"
                                    className="bg-[var(--surface-3)] border border-[var(--border)] text-[var(--text-primary)]"
                                  >
                                    <p className="font-medium">{child.label}</p>
                                  </TooltipContent>
                                </Tooltip>
                              </TooltipProvider>
                            ) : (
                              childLinkContent
                            );
                          })}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
            {/* Collapse Controls at bottom */}
            <div className="mt-auto pt-2 space-y-0.5">
              {!isCollapsed && (
                <div className={cn("px-1", modeButtonsDisabled && "pointer-events-none")}>
                  <div className="flex items-center gap-1 p-1 bg-[var(--surface)] rounded-lg border border-[var(--border)]">
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <button
                            onClick={() => setMode("expanded")}
                            className={cn(
                              "flex-1 flex items-center justify-center h-7 rounded transition-all duration-150 ease-out",
                              "will-change-[background-color,color,transform]",
                              "active:scale-[0.95]",
                              mode === "expanded"
                                ? "bg-[var(--surface-3)] text-[var(--text-primary)] ring-1 ring-[var(--primary)]"
                                : "text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--hover)]"
                            )}
                            aria-label="Always expanded"
                          >
                            <SidebarSimple className="h-3.5 w-3.5" />
                          </button>
                        </TooltipTrigger>
                        <TooltipContent side="right" className="text-xs">
                          Always expanded
                        </TooltipContent>
                      </Tooltip>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <button
                            onClick={() => setMode("collapsed")}
                            className={cn(
                              "flex-1 flex items-center justify-center h-7 rounded transition-all duration-150 ease-out",
                              "will-change-[background-color,color,transform]",
                              "active:scale-[0.95]",
                              mode === "collapsed"
                                ? "bg-[var(--surface-3)] text-[var(--text-primary)] ring-1 ring-[var(--primary)]"
                                : "text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--hover)]"
                            )}
                            aria-label="Always collapsed"
                          >
                            <SidebarSimple className="h-3.5 w-3.5" />
                          </button>
                        </TooltipTrigger>
                        <TooltipContent side="right" className="text-xs">
                          Always collapsed
                        </TooltipContent>
                      </Tooltip>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <button
                            onClick={() => setMode("hover")}
                            className={cn(
                              "flex-1 flex items-center justify-center h-7 rounded transition-all duration-150 ease-out",
                              "will-change-[background-color,color,transform]",
                              "active:scale-[0.95]",
                              mode === "hover"
                                ? "bg-[var(--surface-3)] text-[var(--text-primary)] ring-1 ring-[var(--primary)]"
                                : "text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--hover)]"
                            )}
                            aria-label="Expand on hover"
                          >
                            <CursorClick className="h-3.5 w-3.5" />
                          </button>
                        </TooltipTrigger>
                        <TooltipContent side="right" className="text-xs">
                          Expand on hover
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  </div>
                </div>
              )}
              {isCollapsed && (
                <div className="px-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      // Disable mode buttons briefly to prevent accidental clicks
                      setModeButtonsDisabled(true);
                      toggleSidebar();
                      setTimeout(() => setModeButtonsDisabled(false), 200);
                    }}
                    className={cn(
                      "w-full justify-center h-8 transition-all duration-150 ease-out",
                      "will-change-[background-color,transform]",
                      "hover:bg-[var(--hover)] rounded-md active:scale-[0.98]",
                      "px-2"
                    )}
                    aria-label="Expand sidebar"
                  >
                    <CaretRight className="h-6 w-6" weight="bold" />
                  </Button>
                </div>
              )}
            </div>
          </nav>
        </div>
      </aside>
    </>
  );
}

// Wrapper with Suspense for useSearchParams
export function SecondarySidebar(props: SecondarySidebarProps) {
  return (
    <Suspense fallback={null}>
      <SecondarySidebarInner {...props} />
    </Suspense>
  );
}
