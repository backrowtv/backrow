"use client";

import { usePathname } from "next/navigation";
import { Sidebar } from "./Sidebar";
import { MobileNav } from "./MobileNav";
import { useSidebar } from "./SidebarContext";
import { SecondarySidebarProvider, useSecondarySidebar } from "./SecondarySidebarContext";
import { SecondarySidebar } from "./SecondarySidebar";
import { useEffect, useState, useLayoutEffect, useRef } from "react";
import { useAuth } from "@/components/auth/AuthProvider";

// Use useLayoutEffect on client, useEffect on server (for SSR compatibility)
const useIsomorphicLayoutEffect = typeof window !== "undefined" ? useLayoutEffect : useEffect;

// Sidebar width constants - must match SidebarContext
const COLLAPSED_MAIN_SIDEBAR_WIDTH = 56;
const EXPANDED_MAIN_SIDEBAR_WIDTH = 232;

// Helper to set CSS variable on document root for dialog positioning
// When skip is true, the hook does nothing (allows child components to handle it)
function useContentOffsetCssVar(offset: number, skip = false) {
  useEffect(() => {
    if (skip) return;
    document.documentElement.style.setProperty("--content-left-offset", `${offset}px`);
    return () => {
      document.documentElement.style.removeProperty("--content-left-offset");
    };
  }, [offset, skip]);
}

export function ConditionalLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { sidebarWidth, isCollapsed, mode, setSecondarySidebarWidth } = useSidebar();
  const [isMobile, setIsMobile] = useState(false);
  const [hasInitialized, setHasInitialized] = useState(false);

  // Get auth state from provider - this is set from server, no waiting needed
  const { user } = useAuth();
  const isAuthenticated = !!user;

  // Opt out of browser scroll restoration so direct/external hits land at y=0
  // instead of a stale restored position before hydration.
  useEffect(() => {
    if (typeof window === "undefined" || !("scrollRestoration" in window.history)) return;
    const previous = window.history.scrollRestoration;
    window.history.scrollRestoration = "manual";
    return () => {
      window.history.scrollRestoration = previous;
    };
  }, []);

  // Scroll to top on page load/navigation - runs before paint for instant reset.
  // behavior: "instant" bypasses html { scroll-behavior: smooth } so nav resets jump rather than animate.
  useIsomorphicLayoutEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: "instant" as ScrollBehavior });
  }, [pathname]);

  // Mark as initialized after first render to enable transitions
  useEffect(() => {
    // Small delay to ensure layout is stable before enabling transitions
    const timer = setTimeout(() => setHasInitialized(true), 100);
    return () => clearTimeout(timer);
  }, []);

  // Check for mobile viewport
  useEffect(() => {
    const checkMobile = () => {
      // lg breakpoint is 1024px - sidebar shows at lg:block
      setIsMobile(window.innerWidth < 1024);
    };

    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  // Auth routes should NEVER show mobile nav or sidebars
  const isAuthRoute =
    pathname.startsWith("/sign-in") ||
    pathname.startsWith("/sign-up") ||
    pathname.startsWith("/forgot-password") ||
    pathname.startsWith("/reset-password");

  // Check if current route should show secondary sidebar (desktop)
  // Note: Search and Activity base pages don't have secondary sidebars
  const showSecondarySidebar =
    pathname.startsWith("/profile") ||
    pathname.startsWith("/club/") ||
    pathname.startsWith("/clubs/") ||
    pathname.startsWith("/admin") ||
    // Marketing pages use the Letterboxd-style marketing sidebar
    pathname.startsWith("/faq") ||
    pathname.startsWith("/privacy-policy") ||
    pathname.startsWith("/terms-of-use") ||
    pathname.startsWith("/user-agreement") ||
    pathname.startsWith("/contact") ||
    pathname.startsWith("/blog") ||
    pathname.startsWith("/feedback");

  // Desktop sidebar only shows on specific routes where it makes sense
  // This prevents showing an empty sidebar on marketing pages for unauthenticated users
  // For root path (/), only show sidebar if authenticated (landing page for unauth users has no sidebar)
  const showDashboardNav =
    !isAuthRoute &&
    ((pathname === "/" && isAuthenticated === true) ||
      pathname.startsWith("/clubs") ||
      pathname.startsWith("/club") ||
      pathname.startsWith("/discover") ||
      pathname.startsWith("/profile") ||
      pathname.startsWith("/search") ||
      pathname.startsWith("/activity") ||
      pathname.startsWith("/admin") ||
      pathname.startsWith("/calendar") ||
      pathname.startsWith("/dashboard") ||
      pathname.startsWith("/home") ||
      pathname.startsWith("/movies") ||
      pathname.startsWith("/person") ||
      pathname.startsWith("/timeline") ||
      // Show sidebar on marketing/footer pages for authenticated users
      (isAuthenticated && pathname.startsWith("/faq")) ||
      (isAuthenticated && pathname.startsWith("/terms")) ||
      (isAuthenticated && pathname.startsWith("/privacy-policy")) ||
      (isAuthenticated && pathname.startsWith("/user-agreement")) ||
      (isAuthenticated && pathname.startsWith("/contact")) ||
      (isAuthenticated && pathname.startsWith("/feedback")) ||
      (isAuthenticated && pathname.startsWith("/blog")));

  // Mobile nav shows on ALL routes EXCEPT:
  // - Auth routes (sign-in, sign-up, forgot-password, reset-password)
  // - Landing page when user is NOT authenticated
  // This ensures the bottom nav appears on every page for logged-in users
  const showMobileNav = !isAuthRoute && (pathname !== "/" || isAuthenticated);

  // Reset secondary sidebar width when not on secondary sidebar pages
  // This ensures the header positioning is correct for pages without secondary sidebar
  useEffect(() => {
    if (!showSecondarySidebar) {
      setSecondarySidebarWidth(0);
    }
  }, [showSecondarySidebar, setSecondarySidebarWidth]);

  // Calculate left padding for pages WITHOUT secondary sidebar
  // On mobile, no padding needed since sidebar is a floating drawer
  // On desktop, padding = current main sidebar width
  const mainOnlyLeftPadding = isMobile ? 0 : showDashboardNav ? sidebarWidth : 0;

  // Set CSS variable on document root for dialog positioning (pages without secondary sidebar)
  // Skip when secondary sidebar is present - the child component will handle it
  useContentOffsetCssVar(mainOnlyLeftPadding, showSecondarySidebar);

  return (
    <>
      {/* Desktop sidebar - only on dashboard routes */}
      {showDashboardNav && <Sidebar />}

      {showSecondarySidebar ? (
        <SecondarySidebarProvider>
          {/* Mobile nav inside provider so it can access secondary sidebar items */}
          {showMobileNav && <MobileNav />}
          <SecondarySidebarRenderer isMobile={isMobile} />
          {/* Use MainContentWithSecondarySidebar to get actual secondary sidebar width from context */}
          <MainContentWithSecondarySidebar
            isMobile={isMobile}
            mainSidebarMode={mode}
            mainSidebarCollapsed={isCollapsed}
            showDashboardNav={showDashboardNav}
            hasInitialized={hasInitialized}
          >
            {children}
          </MainContentWithSecondarySidebar>
        </SecondarySidebarProvider>
      ) : (
        <>
          {/* Mobile bottom nav (primary navigation) - outside provider when no secondary sidebar */}
          {showMobileNav && <MobileNav />}
          <main
            id="main-content"
            className="flex-1 pt-14 lg:pt-24 pb-20 lg:pb-0 has-[[data-page-background]]:lg:pt-14 overflow-x-hidden"
            style={
              {
                paddingLeft: `${mainOnlyLeftPadding}px`,
                transition: hasInitialized
                  ? "padding-left 400ms cubic-bezier(0.16, 1, 0.3, 1)"
                  : "none",
                willChange: hasInitialized ? "padding-left" : "auto",
                "--sidebar-width": `${sidebarWidth}px`,
                "--content-left-offset": `${mainOnlyLeftPadding}px`,
              } as React.CSSProperties & {
                "--sidebar-width": string;
                "--content-left-offset": string;
              }
            }
          >
            {children}
          </main>
        </>
      )}
    </>
  );
}

// Wrapper component that can access secondary sidebar context for dynamic padding
function MainContentWithSecondarySidebar({
  children,
  isMobile,
  mainSidebarMode,
  mainSidebarCollapsed,
  showDashboardNav,
  hasInitialized,
}: {
  children: React.ReactNode;
  isMobile: boolean;
  mainSidebarMode: "expanded" | "collapsed" | "hover";
  mainSidebarCollapsed: boolean;
  showDashboardNav: boolean;
  hasInitialized: boolean;
}) {
  const { sidebarWidth: secondarySidebarWidth } = useSecondarySidebar();
  const { setSecondarySidebarWidth, secondarySidebarWidth: _currentWidth } = useSidebar();

  // Track last synced width to prevent unnecessary updates
  const lastSyncedWidthRef = useRef<number | null>(null);

  // Sync secondary sidebar width to main context for header positioning
  // Only update if the width has actually changed
  useEffect(() => {
    if (lastSyncedWidthRef.current === secondarySidebarWidth) {
      return;
    }
    lastSyncedWidthRef.current = secondarySidebarWidth;
    setSecondarySidebarWidth(secondarySidebarWidth);
  }, [secondarySidebarWidth, setSecondarySidebarWidth]);

  // Calculate main sidebar width for padding purposes
  // IMPORTANT: Must match the logic in SecondarySidebar.tsx for secondarySidebarLeft
  // - In "expanded" mode: use dynamic width based on collapsed state
  // - In "hover" or "collapsed" mode: always use collapsed width (64px)
  //   because when main sidebar expands on hover, it OVERLAYS the secondary sidebar
  //   rather than pushing it, so content should not shift
  const shouldPushSecondary = mainSidebarMode === "expanded" && !mainSidebarCollapsed;
  const effectiveMainSidebarWidth = shouldPushSecondary
    ? EXPANDED_MAIN_SIDEBAR_WIDTH
    : COLLAPSED_MAIN_SIDEBAR_WIDTH;

  // Calculate total left padding using ACTUAL secondary sidebar width from context
  // On mobile, no padding needed since sidebar is a floating drawer
  // On desktop, padding = effective main sidebar + secondary sidebar widths
  const totalLeftPadding = isMobile
    ? 0
    : showDashboardNav
      ? effectiveMainSidebarWidth + secondarySidebarWidth
      : 0;

  // Set CSS variable on document root for dialog positioning
  useContentOffsetCssVar(totalLeftPadding);

  return (
    <main
      id="main-content"
      className="flex-1 pt-14 lg:pt-24 pb-20 lg:pb-0 has-[[data-page-background]]:lg:pt-14 overflow-x-hidden"
      style={
        {
          paddingLeft: `${totalLeftPadding}px`,
          transition: hasInitialized ? "padding-left 400ms cubic-bezier(0.16, 1, 0.3, 1)" : "none",
          willChange: hasInitialized ? "padding-left" : "auto",
          "--sidebar-width": `${effectiveMainSidebarWidth}px`,
          "--content-left-offset": `${totalLeftPadding}px`,
        } as React.CSSProperties & { "--sidebar-width": string; "--content-left-offset": string }
      }
    >
      {children}
    </main>
  );
}

function SecondarySidebarRenderer({ isMobile }: { isMobile: boolean }) {
  const { items } = useSecondarySidebar();

  // On mobile, don't render the desktop secondary sidebar
  // The floating hamburger menu handles secondary navigation
  if (isMobile) {
    return null;
  }

  // Always render the sidebar on desktop - it will handle empty items gracefully
  return <SecondarySidebar items={items} />;
}
