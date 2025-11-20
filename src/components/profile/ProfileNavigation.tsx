"use client";

import { useEffect, useMemo } from "react";
import { useSecondarySidebarSafe } from "@/components/layout/SecondarySidebarContext";
import {
  FilmSlate,
  Gear,
  UserCircle,
  Trophy,
  Ticket,
  Star,
  DeviceMobile,
  Bell,
  ChartBar,
} from "@phosphor-icons/react";
import type { SecondarySidebarItem } from "@/components/layout/SecondarySidebar";

export function ProfileNavigation() {
  const context = useSecondarySidebarSafe();

  // Build all nav items once - sections auto-expand based on active route
  const profileNavItems = useMemo((): SecondarySidebarItem[] => {
    return [
      {
        label: "Profile",
        href: "/profile",
        icon: <FilmSlate className="h-4 w-4" />,
      },
      {
        label: "Settings",
        href: "/profile/settings",
        icon: <Gear className="h-4 w-4" />,
        children: [
          {
            label: "Account",
            href: "/profile/settings/account",
            icon: <UserCircle className="h-3 w-3" />,
          },
          {
            label: "Notifications",
            href: "/profile/settings/notifications",
            icon: <Bell className="h-3 w-3" />,
          },
          {
            label: "Ratings",
            href: "/profile/settings/ratings",
            icon: <Star className="h-3 w-3" weight="fill" />,
          },
          {
            label: "Display",
            href: "/profile/settings/display",
            icon: <DeviceMobile className="h-3 w-3" />,
          },
        ],
      },
      {
        label: "Display Case",
        href: "/profile/display-case",
        icon: <Trophy className="h-4 w-4" weight="fill" />,
      },
      {
        label: "Stats",
        href: "/profile/stats",
        icon: <ChartBar className="h-4 w-4" />,
      },
      { label: "Nominations", href: "/profile/nominations", icon: <Ticket className="h-4 w-4" /> },
    ];
  }, []);

  // Set items once when component mounts (only when context is available)
  useEffect(() => {
    if (context) {
      context.setItems(profileNavItems);
      context.setParentBreadcrumb(undefined);
    }
  }, [profileNavItems, context]);

  return null;
}
