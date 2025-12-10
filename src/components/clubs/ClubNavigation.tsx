"use client";

import { useEffect, useMemo, useRef } from "react";
import { useSecondarySidebar } from "@/components/layout/SecondarySidebarContext";
import {
  ChartBar,
  CalendarDots,
  CalendarBlank,
  ChatCircle,
  UsersThree,
  Trophy,
  Gear,
  UserGear,
  FilmSlate,
  Megaphone,
  House,
  ShieldCheck,
  Bell,
  User,
} from "@phosphor-icons/react";
import type { SecondarySidebarItem } from "@/components/layout/SecondarySidebar";

interface ClubNavigationProps {
  clubSlug: string;
  clubName: string;
  isAdmin: boolean;
  isProducer: boolean;
}

export function ClubNavigation({ clubSlug, clubName, isAdmin, isProducer }: ClubNavigationProps) {
  const { setItems, setParentBreadcrumb } = useSecondarySidebar();

  // Track what we've already set to prevent unnecessary updates
  const lastSetKeyRef = useRef<string | null>(null);

  // Check if this is the BackRow Featured Club (for homepage movies link)
  const isBackRowFeatured = clubSlug === "backrow-featured";

  // Build manage section children based on role - memoize to avoid unnecessary re-renders
  const manageChildren = useMemo((): SecondarySidebarItem["children"] => {
    const children: SecondarySidebarItem["children"] = [
      {
        label: "Festival",
        href: `/club/${clubSlug}/manage/festival`,
        icon: <FilmSlate className="h-3 w-3" />,
      },
      {
        label: "Season",
        href: `/club/${clubSlug}/manage/season`,
        icon: <CalendarDots className="h-3 w-3" />,
      },
      {
        label: "Announcements",
        href: `/club/${clubSlug}/manage/announcements`,
        icon: <Megaphone className="h-3 w-3" />,
      },
    ];

    // Homepage Movies link only for BackRow Featured Club
    if (isBackRowFeatured) {
      children.push({
        label: "Homepage Movies",
        href: `/club/${clubSlug}/manage/homepage-movies`,
        icon: <House className="h-3 w-3" weight="fill" />,
      });
    }

    // Club Management only for producers
    if (isProducer) {
      children.push({
        label: "Club Management",
        href: `/club/${clubSlug}/manage/club-management`,
        icon: <UserGear className="h-3 w-3" />,
      });
    }

    return children;
  }, [clubSlug, isBackRowFeatured, isProducer]);

  // Build all nav items once - sections auto-expand based on active route
  const clubNavItems = useMemo((): SecondarySidebarItem[] => {
    return [
      {
        label: "Overview",
        href: `/club/${clubSlug}`,
        icon: <FilmSlate className="h-4 w-4" />,
        hideOnMobile: true, // Hide Overview and subpages on mobile
        children: [
          {
            label: "Discuss",
            href: `/club/${clubSlug}/discuss`,
            icon: <ChatCircle className="h-3 w-3" />,
          },
          {
            label: "Stats",
            href: `/club/${clubSlug}/stats`,
            icon: <ChartBar className="h-3 w-3" />,
          },
          {
            label: "Events",
            href: `/club/${clubSlug}/events`,
            icon: <CalendarBlank className="h-3 w-3" />,
          },
          {
            label: "History",
            href: `/club/${clubSlug}/history`,
            icon: <CalendarDots className="h-3 w-3" />,
          },
          {
            label: "Display Case",
            href: `/club/${clubSlug}/display-case`,
            icon: <Trophy className="h-3 w-3" weight="fill" />,
          },
          {
            label: "Polls",
            href: `/club/${clubSlug}/polls`,
            icon: <ChartBar className="h-3 w-3" />,
          },
          {
            label: "Members",
            href: `/club/${clubSlug}/members`,
            icon: <UsersThree className="h-3 w-3" />,
          },
        ],
      },
      ...(isAdmin
        ? [
            {
              label: "Manage",
              href: `/club/${clubSlug}/manage`,
              icon: <ShieldCheck className="h-4 w-4" weight="fill" />,
              children: manageChildren,
            },
          ]
        : []),
      {
        label: "Settings",
        href: `/club/${clubSlug}/settings`,
        icon: <Gear className="h-4 w-4" />,
        children: [
          {
            label: "General",
            href: `/club/${clubSlug}/settings/general`,
            icon: <Gear className="h-3 w-3" />,
          },
          {
            label: "Notifications",
            href: `/club/${clubSlug}/settings/notifications`,
            icon: <Bell className="h-3 w-3" />,
          },
          ...(isAdmin
            ? [
                {
                  label: "Personalization",
                  href: `/club/${clubSlug}/settings/personalization`,
                  icon: <User className="h-3 w-3" />,
                },
              ]
            : []),
        ],
      },
    ];
  }, [clubSlug, isAdmin, manageChildren]);

  // Set items once when component mounts or when the club/permissions change
  // Uses a ref to prevent re-running the effect on every context-triggered re-render
  useEffect(() => {
    // Create a key that includes all factors that affect nav items
    const currentKey = `${clubSlug}-${isAdmin}-${isProducer}`;

    // Only update if something meaningful has changed (prevents infinite loops from context re-renders)
    if (lastSetKeyRef.current === currentKey) {
      return;
    }

    lastSetKeyRef.current = currentKey;
    setItems(clubNavItems);
    setParentBreadcrumb({ label: clubName, href: `/club/${clubSlug}` });
  }, [clubNavItems, clubName, clubSlug, isAdmin, isProducer, setItems, setParentBreadcrumb]);

  return null;
}
