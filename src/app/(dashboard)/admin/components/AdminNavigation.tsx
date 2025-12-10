"use client";

import { useEffect, useMemo, useRef } from "react";
import { useSecondarySidebarSafe } from "@/components/layout/SecondarySidebarContext";
import type { SecondarySidebarItem } from "@/components/layout/SecondarySidebar";
import {
  ChartBar,
  UsersThree,
  Megaphone,
  ChatCircleDots,
  FilmStrip,
  Gear,
  Medal,
} from "@phosphor-icons/react";

export function AdminNavigation() {
  const context = useSecondarySidebarSafe();
  const hasSetItems = useRef(false);

  const adminNavItems = useMemo((): SecondarySidebarItem[] => {
    return [
      { label: "Overview", href: "/admin/overview", icon: <ChartBar className="h-4 w-4" /> },
      { label: "Users", href: "/admin/users", icon: <UsersThree className="h-4 w-4" /> },
      {
        label: "Announcements",
        href: "/admin/announcements",
        icon: <Megaphone className="h-4 w-4" />,
      },
      { label: "Feedback", href: "/admin/feedback", icon: <ChatCircleDots className="h-4 w-4" /> },
      { label: "Collections", href: "/admin/collections", icon: <FilmStrip className="h-4 w-4" /> },
      { label: "Badge Art", href: "/admin/badges", icon: <Medal className="h-4 w-4" /> },
      { label: "Settings", href: "/admin/settings", icon: <Gear className="h-4 w-4" /> },
    ];
  }, []);

  useEffect(() => {
    if (context && !hasSetItems.current) {
      hasSetItems.current = true;
      context.setItems(adminNavItems);
      context.setParentBreadcrumb({ label: "Admin", href: "/admin/overview" });
    }
  }, [adminNavItems, context]);

  return null;
}
