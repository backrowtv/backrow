"use client";

import React, { useState, useEffect, useRef, useCallback, useMemo } from "react";
import {
  House,
  FilmSlate,
  Compass,
  CalendarDots,
  Star,
  UserCircle,
  MagnifyingGlass,
  Lightning,
  List,
} from "@phosphor-icons/react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { MotionProvider, m, AnimatePresence } from "@/lib/motion";
import { cn } from "@/lib/utils";
import { createClient } from "@/lib/supabase/client";
import { useAuth } from "@/components/auth/AuthProvider";
import { MobileMenuPanel } from "./MobileMenuPanel";
import type { NavItemId, MobileNavPreferences, MenuPosition } from "@/lib/navigation-constants";
import { VALID_NAV_ITEMS, DEFAULT_NAV_PREFERENCES } from "@/lib/navigation-constants";
import type { SecondarySidebarItem } from "./SecondarySidebar";

interface NavItem {
  id: string;
  icon: React.ElementType;
  label: string;
  href: string;
}

const NAV_ICONS: Record<NavItemId, React.ElementType> = {
  home: House,
  clubs: FilmSlate,
  search: MagnifyingGlass,
  discover: Compass,
  profile: UserCircle,
  activity: Lightning,
  favorite_club: Star,
  timeline: CalendarDots,
};

const NAV_LABELS: Record<NavItemId, string> = {
  home: "Home",
  clubs: "My Clubs",
  search: "Search",
  discover: "Discover",
  profile: "Profile",
  activity: "Activity",
  favorite_club: "Favorite",
  timeline: "Timeline",
};

const DEFAULT_NAV_IDS: NavItemId[] = ["clubs", "search", "home", "discover", "activity"];

// Hamburger zone dimensions
const HAMBURGER_ZONE_WIDTH = 54;
const HAMBURGER_EDGE_PADDING = 12;
const DIVIDER_WIDTH = 1;
const DIVIDER_MARGIN = 8;
const DIVIDER_HAMBURGER_MARGIN = 14; // Extra spacing between divider and hamburger

// Local storage keys for caching preferences (avoids flash on load)
const HIDE_LABELS_CACHE_KEY = "backrow-nav-hide-labels";
const NAV_PREFS_CACHE_KEY = "backrow-nav-preferences";
const FAV_CLUB_CACHE_KEY = "backrow-nav-favorite-club";

function getCachedHideLabels(): boolean {
  if (typeof window === "undefined") return false;
  try {
    const cached = localStorage.getItem(HIDE_LABELS_CACHE_KEY);
    return cached === "true";
  } catch {
    return false;
  }
}

function getCachedNavPrefs(): MobileNavPreferences | null {
  if (typeof window === "undefined") return null;
  try {
    const cached = localStorage.getItem(NAV_PREFS_CACHE_KEY);
    return cached ? JSON.parse(cached) : null;
  } catch {
    return null;
  }
}

function getCachedFavoriteClub(): { name: string; slug: string } | null {
  if (typeof window === "undefined") return null;
  try {
    const cached = localStorage.getItem(FAV_CLUB_CACHE_KEY);
    return cached ? JSON.parse(cached) : null;
  } catch {
    return null;
  }
}

export function MobileNav() {
  const pathname = usePathname();
  const router = useRouter();
  const { user } = useAuth();
  const isAuthenticated = !!user;
  const [clubCount, setClubCount] = useState(0);
  const [userPrefs, setUserPrefs] = useState<MobileNavPreferences | null>(null);
  const [favoriteClub, setFavoriteClub] = useState<{ name: string; slug: string } | null>(null);
  const [cachedHideLabels, setCachedHideLabels] = useState<boolean>(false);
  const [isHydrated, setIsHydrated] = useState(false);
  const supabase = createClient();

  const navRef = useRef<HTMLDivElement>(null);
  const hamburgerRef = useRef<HTMLButtonElement>(null);

  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [pendingIndex, setPendingIndex] = useState<number | null>(null);

  useEffect(() => {
    setIsHydrated(true);
    const cachedLabels = getCachedHideLabels();
    if (cachedLabels) setCachedHideLabels(cachedLabels);
    const cachedPrefs = getCachedNavPrefs();
    if (cachedPrefs) setUserPrefs(cachedPrefs);
    const cachedFav = getCachedFavoriteClub();
    if (cachedFav) setFavoriteClub(cachedFav);
  }, []);

  const navItems = useMemo(() => {
    const itemIds = userPrefs?.items || DEFAULT_NAV_IDS;

    return itemIds.map((id): NavItem => {
      if (id === "favorite_club" && favoriteClub) {
        return {
          id,
          icon: NAV_ICONS[id],
          label: "Fav",
          href: `/club/${favoriteClub.slug}`,
        };
      }

      if (id === "clubs") {
        return {
          id,
          icon: NAV_ICONS[id],
          label: clubCount === 1 ? "My Club" : "My Clubs",
          href: "/clubs",
        };
      }

      const hrefMap: Record<NavItemId, string> = {
        home: "/",
        clubs: "/clubs",
        search: "/search",
        discover: "/discover",
        profile: "/profile",
        activity: "/activity",
        favorite_club: "/clubs",
        timeline: "/timeline",
      };

      return {
        id,
        icon: NAV_ICONS[id],
        label: NAV_LABELS[id],
        href: hrefMap[id],
      };
    });
  }, [userPrefs, favoriteClub, clubCount]);

  const activeIndex = useMemo(() => {
    const exactMatch = navItems.findIndex((item) => pathname === item.href);
    if (exactMatch !== -1) return exactMatch;

    if (pathname.startsWith("/club/")) {
      const favoriteIndex = navItems.findIndex(
        (item) => item.id === "favorite_club" && item.href !== "/" && pathname.startsWith(item.href)
      );
      if (favoriteIndex !== -1) return favoriteIndex;

      const clubsIndex = navItems.findIndex((item) => item.id === "clubs");
      if (clubsIndex !== -1) return clubsIndex;
    }

    const prefixMatch = navItems.findIndex(
      (item) =>
        item.href !== "/" && (pathname.startsWith(item.href + "/") || pathname === item.href)
    );
    if (prefixMatch !== -1) return prefixMatch;

    return -1;
  }, [pathname, navItems]);

  // Clear pending state when navigation completes
  useEffect(() => {
    setPendingIndex(null);
  }, [pathname]);

  // Visual active index: use pending (optimistic) if set, otherwise actual
  const visualActiveIndex = pendingIndex !== null ? pendingIndex : activeIndex;

  const menuPosition: MenuPosition = userPrefs?.menuPosition ?? "right";

  const hiddenNavItems = useMemo((): SecondarySidebarItem[] => {
    const bottomNavItems = userPrefs?.items ?? DEFAULT_NAV_PREFERENCES.items;
    const hiddenItems = VALID_NAV_ITEMS.filter((id) => !bottomNavItems.includes(id));

    return hiddenItems.map((id) => {
      if (id === "favorite_club" && favoriteClub) {
        return {
          icon: <Star className="h-4 w-4" weight="regular" />,
          label: favoriteClub.name,
          href: `/club/${favoriteClub.slug}`,
        };
      }

      const NAV_ITEM_ICONS: Record<NavItemId, React.ReactNode> = {
        home: <House className="h-4 w-4" weight="regular" />,
        clubs: <FilmSlate className="h-4 w-4" weight="regular" />,
        search: <MagnifyingGlass className="h-4 w-4" />,
        discover: <Compass className="h-4 w-4" weight="regular" />,
        profile: <UserCircle className="h-4 w-4" weight="regular" />,
        activity: <Lightning className="h-4 w-4" />,
        favorite_club: <Star className="h-4 w-4" weight="regular" />,
        timeline: <CalendarDots className="h-4 w-4" weight="regular" />,
      };

      const NAV_ITEM_LABELS: Record<NavItemId, string> = {
        home: "Home",
        clubs: "My Clubs",
        search: "Search",
        discover: "Discover",
        profile: "Profile",
        activity: "Activity",
        favorite_club: "Favorite Club",
        timeline: "Timeline",
      };

      const NAV_ITEM_HREFS: Record<NavItemId, string> = {
        home: "/",
        clubs: "/clubs",
        search: "/search",
        discover: "/discover",
        profile: "/profile",
        activity: "/activity",
        favorite_club: "/",
        timeline: "/timeline",
      };

      return {
        icon: NAV_ITEM_ICONS[id],
        label: NAV_ITEM_LABELS[id],
        href: NAV_ITEM_HREFS[id],
      };
    });
  }, [userPrefs?.items, favoriteClub]);

  // Only show replaced icons for hidden nav items (global nav items not in bottom bar)
  // NOT for secondary sidebar items (page-specific items like Overview, Members, Settings)
  // Note: Removed useMemo - React Compiler handles optimization automatically
  const getActiveMenuItem = (): { id: string; icon: React.ReactNode; label: string } | null => {
    // If any nav item is active (including pending), don't show menu item icon
    if (visualActiveIndex !== -1) return null;

    for (const item of hiddenNavItems) {
      const itemPath = item.href.split("#")[0].split("?")[0];
      if (pathname === itemPath || (itemPath !== "/" && pathname.startsWith(itemPath + "/"))) {
        return { id: item.href, icon: item.icon, label: item.label };
      }
    }

    return null;
  };
  const activeMenuItem = getActiveMenuItem();

  const isHamburgerActive = isMenuOpen || activeMenuItem !== null;

  const loadUserData = useCallback(async () => {
    if (!user) return;

    const { data: memberData } = await supabase
      .from("club_members")
      .select("club_id")
      .eq("user_id", user.id);

    setClubCount(memberData?.length || 0);

    const { data: userData } = await supabase
      .from("users")
      .select("mobile_nav_preferences")
      .eq("id", user.id)
      .single();

    if (userData?.mobile_nav_preferences) {
      const prefs = userData.mobile_nav_preferences as MobileNavPreferences;
      setUserPrefs(prefs);
      try {
        localStorage.setItem(NAV_PREFS_CACHE_KEY, JSON.stringify(prefs));
      } catch {
        // Ignore
      }

      if (prefs.items.includes("favorite_club")) {
        const clubId = prefs.favoriteClubId;
        let clubData = null;

        if (clubId) {
          const { data: stillFavorited } = await supabase
            .from("favorite_clubs")
            .select("club_id")
            .eq("user_id", user.id)
            .eq("club_id", clubId)
            .maybeSingle();

          if (stillFavorited) {
            const { data } = await supabase
              .from("clubs")
              .select("name, slug")
              .eq("id", clubId)
              .eq("archived", false)
              .single();
            clubData = data;
          }
        }

        if (!clubData) {
          const { data: favoriteClubData } = await supabase
            .from("favorite_clubs")
            .select("club_id, clubs:club_id!inner(name, slug)")
            .eq("user_id", user.id)
            .eq("clubs.archived", false)
            .order("created_at", { ascending: true })
            .limit(1)
            .maybeSingle();

          if (favoriteClubData?.clubs) {
            clubData = Array.isArray(favoriteClubData.clubs)
              ? favoriteClubData.clubs[0]
              : favoriteClubData.clubs;
          }
        }

        if (clubData?.slug) {
          const club = { name: clubData.name, slug: clubData.slug };
          setFavoriteClub(club);
          try {
            localStorage.setItem(FAV_CLUB_CACHE_KEY, JSON.stringify(club));
          } catch {
            // Ignore
          }
        } else {
          setFavoriteClub(null);
          try {
            localStorage.removeItem(FAV_CLUB_CACHE_KEY);
          } catch {
            // Ignore
          }
        }
      }
    } else {
      try {
        localStorage.removeItem(NAV_PREFS_CACHE_KEY);
      } catch {
        // Ignore
      }

      const { data: favoriteClubData } = await supabase
        .from("favorite_clubs")
        .select("club_id, clubs:club_id!inner(name, slug)")
        .eq("user_id", user.id)
        .eq("clubs.archived", false)
        .order("created_at", { ascending: true })
        .limit(1)
        .maybeSingle();

      if (favoriteClubData?.clubs) {
        const clubData = Array.isArray(favoriteClubData.clubs)
          ? favoriteClubData.clubs[0]
          : favoriteClubData.clubs;
        if (clubData?.slug) {
          const club = { name: clubData.name, slug: clubData.slug };
          setFavoriteClub(club);
          try {
            localStorage.setItem(FAV_CLUB_CACHE_KEY, JSON.stringify(club));
          } catch {
            // Ignore
          }
        } else {
          setFavoriteClub(null);
          try {
            localStorage.removeItem(FAV_CLUB_CACHE_KEY);
          } catch {
            // Ignore
          }
        }
      } else {
        setFavoriteClub(null);
        try {
          localStorage.removeItem(FAV_CLUB_CACHE_KEY);
        } catch {
          // Ignore
        }
      }
    }
  }, [supabase, user]);

  useEffect(() => {
    if (!user) return;
    loadUserData();
  }, [loadUserData, user]);

  useEffect(() => {
    const handlePrefsUpdate = (e: Event) => {
      const customEvent = e as CustomEvent<
        MobileNavPreferences | { clubId?: string; action?: string; clearedFromNav?: boolean }
      >;

      if (customEvent.detail) {
        if ("action" in customEvent.detail && customEvent.detail.action === "unfavorite") {
          if (customEvent.detail.clearedFromNav) {
            setFavoriteClub(null);
            try {
              localStorage.removeItem(FAV_CLUB_CACHE_KEY);
            } catch {
              // Ignore
            }
          }
          loadUserData();
        } else if ("items" in customEvent.detail) {
          setUserPrefs(customEvent.detail);
          try {
            localStorage.setItem(NAV_PREFS_CACHE_KEY, JSON.stringify(customEvent.detail));
          } catch {
            // Ignore
          }
        } else {
          loadUserData();
        }
      } else {
        loadUserData();
      }
    };
    window.addEventListener("nav-preferences-updated", handlePrefsUpdate);
    return () => window.removeEventListener("nav-preferences-updated", handlePrefsUpdate);
  }, [loadUserData]);

  useEffect(() => {
    if (userPrefs?.hideLabels !== undefined && typeof window !== "undefined") {
      try {
        localStorage.setItem(HIDE_LABELS_CACHE_KEY, String(userPrefs.hideLabels));
        setCachedHideLabels(userPrefs.hideLabels);
      } catch {
        // Ignore
      }
    }
  }, [userPrefs?.hideLabels]);

  if (!isAuthenticated) return null;

  const hideLabels = userPrefs?.hideLabels ?? cachedHideLabels ?? false;

  const handleNavClick = (e: React.MouseEvent, item: NavItem, index: number) => {
    // Immediately update visual state (optimistic)
    setPendingIndex(index);

    if (isMenuOpen) {
      setIsMenuOpen(false);
    }

    if (
      (item.id === "profile" || item.id === "favorite_club") &&
      pathname.startsWith(item.href) &&
      pathname !== item.href
    ) {
      e.preventDefault();
      router.push(item.href);
    }
  };

  return (
    <MotionProvider>
      <nav
        className={cn(
          "fixed z-50 lg:hidden",
          "left-4 right-4 bottom-4",
          hideLabels ? "h-11" : "h-12",
          "rounded-2xl",
          "backdrop-blur-xl"
        )}
        style={{
          marginBottom: "env(safe-area-inset-bottom, 0px)",
          background: "var(--glass-bg)",
          borderWidth: "1px",
          borderStyle: "solid",
          borderColor: "var(--glass-border)",
          boxShadow: "var(--glass-shadow)",
          // Mobile touch optimizations
          touchAction: "manipulation", // Remove 300ms tap delay
          WebkitTapHighlightColor: "transparent", // Remove iOS tap highlight
        }}
        role="navigation"
        aria-label="Main navigation"
      >
        <div
          ref={navRef}
          className="relative flex items-center h-full"
          style={{ visibility: isHydrated ? "visible" : "hidden" }}
        >
          {/* Left hamburger zone */}
          {menuPosition === "left" && (
            <>
              <div
                className="flex items-center justify-start h-full"
                style={{ width: HAMBURGER_ZONE_WIDTH, paddingLeft: HAMBURGER_EDGE_PADDING }}
              >
                <button
                  ref={hamburgerRef}
                  onClick={() => setIsMenuOpen(!isMenuOpen)}
                  className={cn(
                    "flex flex-col items-center justify-center h-full",
                    "active:scale-95 active:opacity-70"
                  )}
                  style={{ width: 54, willChange: "transform, opacity" }}
                  aria-expanded={isMenuOpen}
                  aria-controls="mobile-menu-panel"
                  aria-label={isMenuOpen ? "Close menu" : "Open menu"}
                >
                  <div
                    className="flex items-center justify-center"
                    style={{ width: hideLabels ? 24 : 20, height: hideLabels ? 24 : 20 }}
                  >
                    <AnimatePresence mode="popLayout">
                      <m.div
                        key={activeMenuItem?.id || "hamburger"}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.08 }}
                        className="flex items-center justify-center"
                      >
                        {activeMenuItem?.icon && React.isValidElement(activeMenuItem.icon) ? (
                          React.cloneElement(activeMenuItem.icon, {
                            className: cn(hideLabels ? "w-6 h-6" : "w-5 h-5"),
                            style: { color: "var(--primary)" },
                            weight: "fill",
                          } as React.Attributes & Record<string, unknown>)
                        ) : (
                          <List
                            className={cn(hideLabels ? "w-6 h-6" : "w-5 h-5")}
                            style={{
                              color: isHamburgerActive
                                ? "var(--primary)"
                                : "var(--glass-icon-muted)",
                            }}
                            weight={isHamburgerActive ? "fill" : "regular"}
                          />
                        )}
                      </m.div>
                    </AnimatePresence>
                  </div>
                  {!hideLabels && (
                    <span
                      className={cn("text-[10px] mt-0.5", isHamburgerActive && "font-medium")}
                      style={{
                        color: isHamburgerActive ? "var(--primary)" : "var(--glass-text-subtle)",
                      }}
                    >
                      {activeMenuItem?.label || "More"}
                    </span>
                  )}
                </button>
              </div>
              <div
                className="h-6 bg-[var(--glass-border)]"
                style={{
                  width: DIVIDER_WIDTH,
                  marginLeft: DIVIDER_HAMBURGER_MARGIN,
                  marginRight: DIVIDER_MARGIN,
                }}
              />
            </>
          )}

          {/* Nav Items */}
          <div className="flex-1 flex items-center h-full">
            {navItems.map((item, index) => {
              const Icon = item.icon;
              const isActive = index === visualActiveIndex;

              return (
                <Link
                  key={`${item.id}-${item.href}`}
                  href={item.href}
                  onClick={(e) => handleNavClick(e, item, index)}
                  className={cn(
                    "flex flex-col items-center justify-center",
                    "flex-1 h-full",
                    "no-underline",
                    "active:scale-95 active:opacity-70",
                    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)] focus-visible:ring-inset focus-visible:rounded-md"
                  )}
                  style={{
                    textDecoration: "none",
                    willChange: "transform, opacity",
                  }}
                  aria-label={item.label}
                  aria-current={isActive ? "page" : undefined}
                >
                  <Icon
                    className={cn(hideLabels ? "w-6 h-6" : "w-5 h-5")}
                    style={{
                      color: isActive ? "var(--primary)" : "var(--glass-icon-muted)",
                    }}
                    weight={isActive ? "fill" : "regular"}
                  />
                  {!hideLabels && (
                    <span
                      className={cn("text-[10px] mt-0.5", isActive && "font-medium")}
                      style={{
                        textDecoration: "none",
                        color: isActive ? "var(--primary)" : "var(--glass-text-subtle)",
                      }}
                    >
                      {item.label}
                    </span>
                  )}
                </Link>
              );
            })}
          </div>

          {/* Right hamburger zone */}
          {menuPosition === "right" && (
            <>
              <div
                className="h-6 bg-[var(--glass-border)]"
                style={{
                  width: DIVIDER_WIDTH,
                  marginLeft: DIVIDER_MARGIN,
                  marginRight: DIVIDER_HAMBURGER_MARGIN,
                }}
              />
              <div
                className="flex items-center justify-end h-full"
                style={{ width: HAMBURGER_ZONE_WIDTH, paddingRight: HAMBURGER_EDGE_PADDING }}
              >
                <button
                  ref={hamburgerRef}
                  onClick={() => setIsMenuOpen(!isMenuOpen)}
                  className={cn(
                    "flex flex-col items-center justify-center h-full",
                    "active:scale-95 active:opacity-70"
                  )}
                  style={{ width: 54, willChange: "transform, opacity" }}
                  aria-expanded={isMenuOpen}
                  aria-controls="mobile-menu-panel"
                  aria-label={isMenuOpen ? "Close menu" : "Open menu"}
                >
                  <div
                    className="flex items-center justify-center"
                    style={{ width: hideLabels ? 24 : 20, height: hideLabels ? 24 : 20 }}
                  >
                    <AnimatePresence mode="popLayout">
                      <m.div
                        key={activeMenuItem?.id || "hamburger"}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.08 }}
                        className="flex items-center justify-center"
                      >
                        {activeMenuItem?.icon && React.isValidElement(activeMenuItem.icon) ? (
                          React.cloneElement(activeMenuItem.icon, {
                            className: cn(hideLabels ? "w-6 h-6" : "w-5 h-5"),
                            style: { color: "var(--primary)" },
                            weight: "fill",
                          } as React.Attributes & Record<string, unknown>)
                        ) : (
                          <List
                            className={cn(hideLabels ? "w-6 h-6" : "w-5 h-5")}
                            style={{
                              color: isHamburgerActive
                                ? "var(--primary)"
                                : "var(--glass-icon-muted)",
                            }}
                            weight={isHamburgerActive ? "fill" : "regular"}
                          />
                        )}
                      </m.div>
                    </AnimatePresence>
                  </div>
                  {!hideLabels && (
                    <span
                      className={cn("text-[10px] mt-0.5", isHamburgerActive && "font-medium")}
                      style={{
                        color: isHamburgerActive ? "var(--primary)" : "var(--glass-text-subtle)",
                      }}
                    >
                      {activeMenuItem?.label || "More"}
                    </span>
                  )}
                </button>
              </div>
            </>
          )}
        </div>
      </nav>

      <MobileMenuPanel
        isOpen={isMenuOpen}
        onClose={() => setIsMenuOpen(false)}
        menuPosition={menuPosition}
        hiddenNavItems={hiddenNavItems}
        visibleNavHrefs={navItems.map((item) => item.href)}
        hamburgerRef={hamburgerRef}
        navRef={navRef}
        hideLabels={hideLabels}
      />
    </MotionProvider>
  );
}
