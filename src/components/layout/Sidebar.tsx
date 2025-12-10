"use client";

import { useEffect, useState, useCallback } from "react";
import { usePathname } from "next/navigation";
import {
  House,
  FilmSlate,
  Compass,
  UserCircle,
  CaretRight,
  SidebarSimple,
  CursorClick,
  MagnifyingGlass,
  Lightning,
  CalendarDots,
} from "@phosphor-icons/react";
import { SidebarItem } from "./SidebarItem";
import { CollapsibleSidebarSection } from "./CollapsibleSidebarSection";
import { TestAuthWidget } from "./TestAuthWidget";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";
import { BrandText } from "@/components/ui/brand-text";
import { useAuth } from "@/components/auth/AuthProvider";
import { EntityAvatar } from "@/components/ui/entity-avatar";
import { clubToAvatarData } from "@/lib/avatar-helpers";
import { useSidebar } from "./SidebarContext";
import {
  type SidebarNavItemId,
  type SidebarNavPreferences,
  DEFAULT_SIDEBAR_PREFERENCES,
} from "@/lib/navigation-constants";

// Feature flag: Enable test auth widget in development
// Set NEXT_PUBLIC_ENABLE_TEST_AUTH=true in .env.local to enable
// Note: NEXT_PUBLIC_* vars are embedded at build time and available client-side
const ENABLE_TEST_AUTH =
  process.env.NODE_ENV !== "production" && process.env.NEXT_PUBLIC_ENABLE_TEST_AUTH === "true";

interface Club {
  id: string;
  name: string;
  slug: string | null;
  picture_url?: string | null;
  logo_url?: string | null;
  settings?: unknown;
}

// Icon and href mapping for sidebar items
const SIDEBAR_ITEM_MAP: Record<
  SidebarNavItemId,
  { icon: React.ElementType; label: string; href: string }
> = {
  home: { icon: House, label: "Home", href: "/" },
  clubs: { icon: FilmSlate, label: "My Clubs", href: "/clubs" }, // Special handling - this is the collapsible section
  search: { icon: MagnifyingGlass, label: "Search", href: "/search" },
  discover: { icon: Compass, label: "Discover", href: "/discover" },
  activity: { icon: Lightning, label: "Activity", href: "/activity" },
  timeline: { icon: CalendarDots, label: "Timeline", href: "/timeline" },
  profile: { icon: UserCircle, label: "Profile", href: "/profile" },
};

export function Sidebar() {
  const [clubs, setClubs] = useState<Club[]>([]);
  const [favoriteClub, setFavoriteClub] = useState<Club | null>(null);
  const [sidebarOrder, setSidebarOrder] = useState<SidebarNavItemId[]>(
    DEFAULT_SIDEBAR_PREFERENCES.itemOrder
  );
  const [modeButtonsDisabled, _setModeButtonsDisabled] = useState(false);
  const {
    isCollapsed,
    toggleSidebar,
    sidebarWidth,
    mode,
    setMode,
    isHovered: _isHovered,
    setIsHovered,
  } = useSidebar();
  // Get auth state from provider - this is set from server, no waiting needed
  const { user } = useAuth();
  const supabase = createClient();
  const pathname = usePathname();

  // Check if current route should show secondary sidebar
  // Note: Search and Activity base pages don't have secondary sidebars
  const showSecondarySidebar =
    pathname.startsWith("/profile") ||
    pathname.startsWith("/club/") ||
    pathname.startsWith("/clubs/");

  // When in "expanded" mode and not collapsed, main sidebar should push secondary (same z-index)
  // Otherwise, main sidebar overlays secondary (higher z-index)
  const shouldPushSecondary = mode === "expanded" && !isCollapsed && showSecondarySidebar;
  const sidebarZIndex = shouldPushSecondary ? "z-20" : "z-30";

  const loadData = useCallback(async () => {
    if (!user) {
      setClubs([]);
      setFavoriteClub(null);
      return;
    }

    // Fetch user prefs, memberships, and favorite clubs in parallel (independent queries)
    const CLUB_SIDEBAR_COLUMNS =
      "id, name, slug, picture_url, avatar_icon, avatar_color_index, avatar_border_color_index, settings";
    const [{ data: userData }, { data: memberships }, { data: favoriteClubsData }] =
      await Promise.all([
        supabase
          .from("users")
          .select("sidebar_nav_preferences, mobile_nav_preferences")
          .eq("id", user.id)
          .single(),
        supabase.from("club_members").select("club_id").eq("user_id", user.id),
        supabase
          .from("favorite_clubs")
          .select("club_id")
          .eq("user_id", user.id)
          .order("created_at", { ascending: true }),
      ]);

    if (userData?.sidebar_nav_preferences) {
      const prefs = userData.sidebar_nav_preferences as SidebarNavPreferences;
      if (prefs.itemOrder?.length === DEFAULT_SIDEBAR_PREFERENCES.itemOrder.length) {
        setSidebarOrder(prefs.itemOrder);
      }
    }

    if (!memberships || memberships.length === 0) {
      setClubs([]);
      setFavoriteClub(null);
      return;
    }

    const clubIds = memberships.map((m) => m.club_id);
    const favoriteClubIds = new Set((favoriteClubsData || []).map((f) => f.club_id));

    // The "absolute favorite" from navigation settings - shown as alwaysVisibleItem
    const mobileNavPrefs = userData?.mobile_nav_preferences as { favoriteClubId?: string } | null;
    let absoluteFavoriteId = mobileNavPrefs?.favoriteClubId || null;

    // Fall back to first starred club if no explicit favoriteClubId is set
    if (!absoluteFavoriteId && favoriteClubsData && favoriteClubsData.length > 0) {
      const firstStarred = favoriteClubsData[0].club_id;
      if (clubIds.includes(firstStarred)) {
        absoluteFavoriteId = firstStarred;
      }
    }

    // Fetch favorite club and other clubs in parallel (both depend on IDs above)
    const otherClubIds = absoluteFavoriteId
      ? clubIds.filter((id) => id !== absoluteFavoriteId)
      : clubIds;

    const [absoluteFavoriteClub, otherClubs] = await Promise.all([
      // Fetch the absolute favorite club
      absoluteFavoriteId && clubIds.includes(absoluteFavoriteId)
        ? supabase
            .from("clubs")
            .select(CLUB_SIDEBAR_COLUMNS)
            .eq("id", absoluteFavoriteId)
            .eq("archived", false)
            .single()
            .then(({ data }) => data as Club | null)
        : Promise.resolve(null),
      // Fetch other clubs
      otherClubIds.length > 0
        ? supabase
            .from("clubs")
            .select(CLUB_SIDEBAR_COLUMNS)
            .in("id", otherClubIds)
            .eq("archived", false)
            .order("created_at", { ascending: false })
            .then(({ data }) =>
              ((data as Club[] | null) || []).sort((a, b) => {
                const aIsFavorite = favoriteClubIds.has(a.id);
                const bIsFavorite = favoriteClubIds.has(b.id);
                if (aIsFavorite && !bIsFavorite) return -1;
                if (!aIsFavorite && bIsFavorite) return 1;
                return 0;
              })
            )
        : Promise.resolve([] as Club[]),
    ]);

    setFavoriteClub(absoluteFavoriteClub);
    setClubs(otherClubs);
  }, [supabase, user]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Listen for sidebar and navigation preference updates
  useEffect(() => {
    const handlePrefsUpdate = () => {
      loadData();
    };
    window.addEventListener("sidebar-preferences-updated", handlePrefsUpdate);
    window.addEventListener("nav-preferences-updated", handlePrefsUpdate);
    return () => {
      window.removeEventListener("sidebar-preferences-updated", handlePrefsUpdate);
      window.removeEventListener("nav-preferences-updated", handlePrefsUpdate);
    };
  }, [loadData]);

  if (!user) {
    return null;
  }

  return (
    <aside
      className={cn(
        "fixed left-0 top-0 bottom-0 border-r border-[var(--border)]/50 bg-[var(--sidebar)]/80 backdrop-blur-xl hidden lg:block",
        sidebarZIndex
      )}
      style={{
        width: `${sidebarWidth}px`,
        height: "100vh",
        transition: "width 500ms cubic-bezier(0.4, 0, 0.2, 1)",
        willChange: "width",
      }}
      onMouseEnter={() => {
        if (mode === "hover") {
          setIsHovered(true);
        }
      }}
      onMouseLeave={() => {
        if (mode === "hover") {
          setIsHovered(false);
        }
      }}
    >
      <nav
        className={cn(
          "flex flex-col h-full min-h-0 overflow-y-auto overflow-x-hidden",
          isCollapsed ? "px-1.5 pt-3 pb-2" : "px-2 pt-3 pb-2"
        )}
      >
        <div className={cn("space-y-1", isCollapsed ? "" : "px-1")}>
          {sidebarOrder.map((itemId) => {
            // Special handling for clubs - render as collapsible section
            if (itemId === "clubs") {
              if (clubs.length === 0 && !favoriteClub) {
                // No clubs - show regular item
                return (
                  <SidebarItem
                    key={itemId}
                    icon={FilmSlate}
                    label="My Clubs"
                    href="/clubs"
                    collapsed={isCollapsed}
                  />
                );
              }

              return (
                <CollapsibleSidebarSection
                  key={itemId}
                  label={clubs.length + (favoriteClub ? 1 : 0) === 1 ? "My Club" : "My Clubs"}
                  collapsed={isCollapsed}
                  defaultOpen={false}
                  count={clubs.length + (favoriteClub ? 1 : 0)}
                  href="/clubs"
                  alwaysVisibleItem={
                    favoriteClub && favoriteClub.slug ? (
                      <SidebarItem
                        iconElement={
                          <EntityAvatar
                            entity={clubToAvatarData(favoriteClub)}
                            emojiSet="club"
                            size="xs"
                          />
                        }
                        label={<BrandText>{favoriteClub.name}</BrandText>}
                        href={`/club/${favoriteClub.slug}`}
                        collapsed={isCollapsed}
                      />
                    ) : undefined
                  }
                >
                  {/* Other clubs (favorite is already shown via alwaysVisibleItem) */}
                  {clubs.map((club) => {
                    if (!club.slug) {
                      console.error("Sidebar: Club slug is required", club.id);
                      return null;
                    }
                    return (
                      <SidebarItem
                        key={club.id}
                        iconElement={
                          <EntityAvatar entity={clubToAvatarData(club)} emojiSet="club" size="xs" />
                        }
                        label={<BrandText>{club.name}</BrandText>}
                        href={`/club/${club.slug}`}
                        collapsed={isCollapsed}
                      />
                    );
                  })}
                </CollapsibleSidebarSection>
              );
            }

            // Regular sidebar items
            const config = SIDEBAR_ITEM_MAP[itemId];
            if (!config) {
              // Skip items that don't have a valid config (stale preferences)
              return null;
            }
            return (
              <SidebarItem
                key={itemId}
                icon={config.icon}
                label={config.label}
                href={config.href}
                collapsed={isCollapsed}
              />
            );
          })}
        </div>
        <div className="mt-auto pt-2 space-y-0.5">
          {/* Test Auth Widget - Development Only */}
          {ENABLE_TEST_AUTH && (
            <div className={cn("px-1", isCollapsed && "px-0")}>
              <TestAuthWidget collapsed={isCollapsed} />
            </div>
          )}
          {!isCollapsed && (
            <div className={cn("px-1", modeButtonsDisabled && "pointer-events-none")}>
              <div className="flex items-center gap-1 p-1 bg-[var(--surface)] rounded-lg border border-[var(--border)]">
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <button
                        onClick={() => setMode("expanded")}
                        className={cn(
                          "flex-1 flex items-center justify-center h-7 rounded",
                          "transition-[color,background-color,transform] duration-200 ease-out",
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
                          "flex-1 flex items-center justify-center h-7 rounded",
                          "transition-[color,background-color,transform] duration-200 ease-out",
                          "active:scale-[0.95]",
                          mode === "collapsed"
                            ? "bg-[var(--surface-3)] text-[var(--text-primary)] ring-1 ring-[var(--primary)]"
                            : "text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--hover)]"
                        )}
                        aria-label="Always collapsed"
                      >
                        <SidebarSimple className="h-3.5 w-3.5" weight="fill" />
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
                          "flex-1 flex items-center justify-center h-7 rounded",
                          "transition-[color,background-color,transform] duration-200 ease-out",
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
                  toggleSidebar();
                }}
                className={cn(
                  "w-full justify-center h-8",
                  "transition-[background-color,transform] duration-200 ease-out",
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
    </aside>
  );
}
