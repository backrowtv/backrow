"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import { MotionProvider, m, AnimatePresence } from "@/lib/motion";
import { usePathname } from "next/navigation";
import Link from "next/link";
import { CaretRight } from "@phosphor-icons/react";
import { cn } from "@/lib/utils";
import { useSecondarySidebarSafe } from "./SecondarySidebarContext";
import type { SecondarySidebarItem } from "./SecondarySidebar";
import type { MenuPosition } from "@/lib/navigation-constants";

// LUX-style animation config
const ANIMATION_DURATION = 0.4;
const CONTENT_DELAY = 0.1;
const ITEM_STAGGER = 0.04;

interface MobileMenuPanelProps {
  isOpen: boolean;
  onClose: () => void;
  menuPosition: MenuPosition;
  hiddenNavItems: SecondarySidebarItem[];
  visibleNavHrefs: string[];
  hamburgerRef: React.RefObject<HTMLButtonElement | null>;
  navRef: React.RefObject<HTMLDivElement | null>;
  hideLabels?: boolean;
}

export function MobileMenuPanel({
  isOpen,
  onClose,
  menuPosition,
  hiddenNavItems,
  visibleNavHrefs,
  hamburgerRef,
  navRef,
  hideLabels = false,
}: MobileMenuPanelProps) {
  const pathname = usePathname();
  const contentRef = useRef<HTMLDivElement>(null);
  const firstFocusableRef = useRef<HTMLAnchorElement>(null);
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set());

  // Get secondary sidebar items from context (if available)
  const sidebarContext = useSecondarySidebarSafe();
  const secondarySidebarItems = sidebarContext?.items || [];

  // Filter secondary sidebar items to remove duplicates and redundant items
  const filteredSecondarySidebarItems = secondarySidebarItems.filter((item) => {
    // Skip items marked to hide on mobile
    if (item.hideOnMobile) {
      return false;
    }

    const itemPath = item.href.split("#")[0].split("?")[0];

    // Skip items that duplicate visible bottom nav items
    if (visibleNavHrefs.includes(itemPath)) {
      return false;
    }

    // Skip items that exactly match current page (redundant "you are here")
    // unless they have children (expandable sections)
    if (itemPath === pathname && !item.children?.length) {
      return false;
    }

    const hiddenNavHrefs = hiddenNavItems.map((h) => h.href);
    const isOnThisPage =
      itemPath === pathname || (itemPath !== "/" && pathname.startsWith(itemPath + "/"));
    const isInHiddenNav = hiddenNavHrefs.includes(itemPath);

    if (isInHiddenNav && isOnThisPage && !item.children?.length) {
      return false;
    }
    return true;
  });

  const hasSecondarySidebar = filteredSecondarySidebarItems.length > 0;

  // On mobile, sections are never auto-expanded - users must manually expand them
  // This keeps the menu compact and prevents unexpected UI shifts

  // Close on route change
  const prevPathnameRef = useRef(pathname);
  useEffect(() => {
    if (prevPathnameRef.current !== pathname) {
      prevPathnameRef.current = pathname;
      if (isOpen) {
        onClose();
      }
    }
  }, [pathname, isOpen, onClose]);

  // Close on escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen) {
        onClose();
        hamburgerRef.current?.focus();
      }
    };
    window.addEventListener("keydown", handleEscape);
    return () => window.removeEventListener("keydown", handleEscape);
  }, [isOpen, onClose, hamburgerRef]);

  // Prevent body scroll when open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [isOpen]);

  const toggleSection = useCallback((href: string) => {
    setExpandedSections((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(href)) {
        newSet.delete(href);
      } else {
        newSet.add(href);
      }
      return newSet;
    });
  }, []);

  // Calculate panel position - align panel edge with nav bar edge
  // Also calculate content padding offset to center icons over hamburger
  const getPanelStyle = useCallback((): {
    style: React.CSSProperties;
    iconAlignPadding: number;
  } => {
    if (typeof window === "undefined" || !navRef.current || !hamburgerRef.current) {
      return {
        style: menuPosition === "right" ? { right: 16, bottom: 72 } : { left: 16, bottom: 72 },
        iconAlignPadding: 0,
      };
    }

    // Compute rem-based values instead of hardcoding px (root font size may not be 16px)
    const rootFontSize = parseFloat(getComputedStyle(document.documentElement).fontSize);
    const px3 = rootFontSize * 0.75; // px-3 = 0.75rem (menu item horizontal padding)

    const navRect = navRef.current.getBoundingClientRect();
    const bottom = window.innerHeight - navRect.top + 8;

    // Find the actual hamburger icon SVG position (more accurate than computing from button center)
    const hamburgerIcon = hamburgerRef.current.querySelector("svg");
    const hamburgerIconLeft = hamburgerIcon
      ? hamburgerIcon.getBoundingClientRect().left
      : hamburgerRef.current.getBoundingClientRect().left;

    const hamburgerIconLeftFromNavEdge =
      menuPosition === "right"
        ? navRect.right - hamburgerIconLeft
        : hamburgerIconLeft - navRect.left;

    // Compute exact content padding to align menu icons with hamburger icon
    // Icon position = panelEdge + contentPadding + itemPadding(px3)
    // So contentPadding = hamburgerIconLeftFromNavEdge - px3
    const iconAlignPadding = Math.max(4, hamburgerIconLeftFromNavEdge - px3);

    if (menuPosition === "right") {
      // Align panel's right edge with nav bar's right edge
      const panelRight = window.innerWidth - navRect.right;
      return {
        style: { right: panelRight, bottom },
        iconAlignPadding,
      };
    } else {
      // Align panel's left edge with nav bar's left edge
      return {
        style: { left: navRect.left, bottom },
        iconAlignPadding,
      };
    }
  }, [navRef, hamburgerRef, menuPosition]);

  // Dynamic icon size based on hideLabels setting (match bottom nav)
  const iconSize = hideLabels ? "w-6 h-6" : "w-5 h-5";

  // Clone icon with correct size
  const renderIcon = (icon: React.ReactNode, isActive: boolean) => {
    if (!icon) return null;
    if (!React.isValidElement(icon)) return icon;
    return React.cloneElement(icon, {
      className: iconSize,
      weight: isActive ? "fill" : "regular",
    } as React.Attributes & Record<string, unknown>);
  };

  // Render menu item with staggered animation
  const renderMenuItem = (
    item: SecondarySidebarItem,
    isChild: boolean = false,
    isFirst: boolean = false,
    animationIndex: number = 0
  ) => {
    const itemPath = item.href.split("#")[0].split("?")[0];
    const isActive =
      pathname === itemPath || (itemPath !== "/" && pathname.startsWith(itemPath + "/"));
    const _hasChildren = item.children && item.children.length > 0;

    return (
      <m.div
        key={item.href}
        initial={{ opacity: 0, scale: 0.9, filter: "blur(8px)" }}
        animate={{ opacity: 1, scale: 1, filter: "blur(0px)" }}
        exit={{ opacity: 0, scale: 0.95, filter: "blur(4px)" }}
        transition={{
          delay: CONTENT_DELAY + animationIndex * ITEM_STAGGER,
          duration: 0.2,
          ease: [0.25, 0.46, 0.45, 0.94],
        }}
      >
        <Link
          ref={isFirst && !isChild ? firstFocusableRef : undefined}
          href={item.href}
          onClick={onClose}
          className={cn(
            "flex items-center gap-4 rounded-lg",
            "transition-colors duration-150",
            "no-underline text-sm",
            "hover:bg-[var(--hover)]",
            "py-2 px-3",
            isActive
              ? "font-medium text-[var(--primary)] bg-[var(--hover)]"
              : "text-[var(--text-primary)]",
            isChild && "ml-4 text-[var(--text-muted)]"
          )}
          role="menuitem"
        >
          <span
            className="flex-shrink-0"
            style={{ color: isActive ? "var(--primary)" : "var(--text-muted)" }}
          >
            {renderIcon(item.icon, isActive)}
          </span>
          <span className="whitespace-nowrap">{item.label}</span>
        </Link>
      </m.div>
    );
  };

  const { style: panelStyle, iconAlignPadding } = getPanelStyle();

  return (
    <MotionProvider>
      {/* Backdrop */}
      <AnimatePresence>
        {isOpen && (
          <m.div
            className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm lg:hidden"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: ANIMATION_DURATION * 0.8 }}
            onClick={onClose}
            aria-hidden="true"
          />
        )}
      </AnimatePresence>

      {/* Menu Panel - Luxe-style clipPath reveal animation */}
      <AnimatePresence>
        {isOpen && (
          <m.div
            id="mobile-menu-panel"
            role="menu"
            aria-label="Navigation menu"
            className="fixed z-50 lg:hidden overflow-hidden"
            style={{
              ...panelStyle,
              minWidth: 160,
            }}
            initial={{
              clipPath: "inset(95% 5% 5% 5% round 12px)",
              opacity: 0,
            }}
            animate={{
              clipPath: "inset(0% 0% 0% 0% round 12px)",
              opacity: 1,
              transition: {
                type: "spring",
                duration: ANIMATION_DURATION,
                bounce: 0,
              },
            }}
            exit={{
              clipPath: "inset(95% 5% 5% 5% round 12px)",
              opacity: 0,
              transition: {
                duration: ANIMATION_DURATION * 0.6,
                ease: [0.4, 0, 1, 1],
              },
            }}
          >
            {/* Glass background - matches navbar transparency */}
            <div
              className="absolute inset-0 rounded-xl"
              style={{
                background: "var(--glass-bg)",
                backdropFilter: "blur(24px)",
                WebkitBackdropFilter: "blur(24px)",
                boxShadow: "var(--glass-shadow)",
                borderWidth: "1px",
                borderStyle: "solid",
                borderColor: "var(--glass-border)",
              }}
            />

            {/* Content */}
            <div
              ref={contentRef}
              className="relative p-2 max-h-[min(60vh,400px)] overflow-y-auto"
              style={{
                // Override padding on the hamburger side to align menu icons with hamburger icon
                paddingLeft: menuPosition === "left" ? `${iconAlignPadding}px` : undefined,
                paddingRight: menuPosition === "right" ? `${iconAlignPadding}px` : undefined,
              }}
            >
              <nav className="flex flex-col gap-1">
                {/*
                  Visual order (top to bottom):
                  1. Secondary sidebar items (page-specific nav like Overview, Members, Settings)
                  2. Divider
                  3. Hidden nav items (global nav items not in bottom bar)

                  Animation order (bottom-up reveal):
                  - Hidden nav items animate first (they're at bottom)
                  - Secondary sidebar items animate last (they're at top)
                */}

                {/* Secondary sidebar items (if on a page with sidebar) - at TOP */}
                {hasSecondarySidebar &&
                  (() => {
                    // Calculate total items for reverse animation (bottom items animate first)
                    const totalItems =
                      filteredSecondarySidebarItems.length +
                      hiddenNavItems.length +
                      (hiddenNavItems.length > 0 ? 1 : 0);
                    return filteredSecondarySidebarItems.map((item, index) => {
                      const isSectionExpanded = expandedSections.has(item.href);
                      const hasChildren = item.children && item.children.length > 0;
                      // Reverse animation: last items (at bottom) animate first
                      const reverseAnimIndex = totalItems - 1 - index;
                      const itemPath = item.href.split("#")[0].split("?")[0];
                      const isActive =
                        pathname === itemPath ||
                        (itemPath !== "/" && pathname.startsWith(itemPath + "/"));

                      return (
                        <div key={item.href}>
                          {hasChildren ? (
                            <m.div
                              className="flex items-center gap-0.5"
                              initial={{ opacity: 0, scale: 0.9, filter: "blur(8px)" }}
                              animate={{ opacity: 1, scale: 1, filter: "blur(0px)" }}
                              exit={{ opacity: 0, scale: 0.95, filter: "blur(4px)" }}
                              transition={{
                                delay: CONTENT_DELAY + reverseAnimIndex * ITEM_STAGGER,
                                duration: 0.2,
                                ease: [0.25, 0.46, 0.45, 0.94],
                              }}
                            >
                              <Link
                                ref={index === 0 ? firstFocusableRef : undefined}
                                href={item.href}
                                onClick={onClose}
                                className={cn(
                                  "flex items-center gap-4 rounded-lg flex-1",
                                  "transition-colors duration-150",
                                  "py-2 px-3",
                                  "text-sm",
                                  "hover:bg-[var(--hover)]",
                                  isActive
                                    ? "font-medium text-[var(--primary)] bg-[var(--hover)]"
                                    : "text-[var(--text-primary)]"
                                )}
                                role="menuitem"
                              >
                                <span
                                  className="flex-shrink-0"
                                  style={{
                                    color: isActive ? "var(--primary)" : "var(--text-muted)",
                                  }}
                                >
                                  {renderIcon(item.icon, isActive)}
                                </span>
                                <span className="whitespace-nowrap">{item.label}</span>
                              </Link>
                              <button
                                onClick={(e) => {
                                  e.preventDefault();
                                  e.stopPropagation();
                                  toggleSection(item.href);
                                }}
                                className={cn(
                                  "flex items-center justify-center h-8 w-8 rounded-md",
                                  "transition-colors duration-150",
                                  "hover:bg-[var(--hover)]",
                                  "text-[var(--text-muted)]"
                                )}
                                aria-expanded={isSectionExpanded}
                                aria-label={
                                  isSectionExpanded
                                    ? `Collapse ${item.label}`
                                    : `Expand ${item.label}`
                                }
                              >
                                <CaretRight
                                  className={iconSize}
                                  weight="bold"
                                  style={{
                                    transform: isSectionExpanded ? "rotate(90deg)" : "rotate(0deg)",
                                    transition: "transform 0.2s ease-out",
                                  }}
                                />
                              </button>
                            </m.div>
                          ) : (
                            renderMenuItem(item, false, index === 0, reverseAnimIndex)
                          )}

                          {/* Children - smooth height animation */}
                          {hasChildren && (
                            <m.div
                              className="overflow-hidden"
                              initial={false}
                              animate={{
                                height: isSectionExpanded ? "auto" : 0,
                                opacity: isSectionExpanded ? 1 : 0,
                              }}
                              transition={{
                                height: { duration: 0.25, ease: [0.04, 0.62, 0.23, 0.98] },
                                opacity: { duration: 0.2 },
                              }}
                            >
                              <div className="space-y-0.5 mt-0.5 pb-1">
                                {item.children!.map((child, _childIndex) =>
                                  renderMenuItem(child, true, false, reverseAnimIndex)
                                )}
                              </div>
                            </m.div>
                          )}
                        </div>
                      );
                    });
                  })()}

                {/* Divider if we have both sidebar items and hidden nav items */}
                {hasSecondarySidebar && hiddenNavItems.length > 0 && (
                  <m.div
                    className="my-1 mx-3 h-px bg-[var(--glass-border)]"
                    initial={{ opacity: 0, scaleX: 0 }}
                    animate={{ opacity: 1, scaleX: 1 }}
                    transition={{
                      delay: CONTENT_DELAY + hiddenNavItems.length * ITEM_STAGGER,
                      duration: 0.2,
                    }}
                  />
                )}

                {/* Hidden nav items (items not in bottom nav bar) - at BOTTOM */}
                {hiddenNavItems.length > 0 &&
                  hiddenNavItems.map((item, index) => {
                    // Hidden nav items animate first (they're at bottom, bottom-up reveal)
                    // Reverse within hidden items: last hidden item animates first
                    const reverseAnimIndex = hiddenNavItems.length - 1 - index;
                    return (
                      <div key={item.href}>
                        {renderMenuItem(
                          item,
                          false,
                          !hasSecondarySidebar && index === 0,
                          reverseAnimIndex
                        )}
                      </div>
                    );
                  })}

                {/* Empty state */}
                {!hasSecondarySidebar && hiddenNavItems.length === 0 && (
                  <p className="text-xs py-3 text-center text-[var(--text-muted)]">
                    All items are in your nav bar
                  </p>
                )}
              </nav>
            </div>
          </m.div>
        )}
      </AnimatePresence>
    </MotionProvider>
  );
}
