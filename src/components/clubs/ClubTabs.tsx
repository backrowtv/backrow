"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { CalendarBlank, CalendarDots, ChatCircle, Users, Gear } from "@phosphor-icons/react";

interface TabItem {
  value: string;
  label: string;
  href: string;
  icon?: React.ReactNode;
}

interface ClubTabsProps {
  clubId: string;
  clubSlug?: string;
  mode: "structured" | "casual";
}

export function ClubTabs({ clubId, clubSlug, mode }: ClubTabsProps) {
  const pathname = usePathname();
  const identifier = clubSlug || clubId;

  const structuredTabs: TabItem[] = [
    {
      value: "overview",
      label: "Overview",
      href: `/club/${identifier}`,
      icon: <CalendarBlank className="h-4 w-4" />,
    },
    {
      value: "history",
      label: "History",
      href: `/club/${identifier}/history`,
      icon: <CalendarDots className="h-4 w-4" />,
    },
    {
      value: "discuss",
      label: "Discuss",
      href: `/club/${identifier}/discuss`,
      icon: <ChatCircle className="h-4 w-4" />,
    },
    {
      value: "members",
      label: "Members",
      href: `/club/${identifier}/members`,
      icon: <Users className="h-4 w-4" />,
    },
    {
      value: "settings",
      label: "Settings",
      href: `/club/${identifier}/settings`,
      icon: <Gear className="h-4 w-4" />,
    },
  ];

  const casualTabs: TabItem[] = [
    {
      value: "overview",
      label: "Overview",
      href: `/club/${identifier}`,
      icon: <CalendarBlank className="h-4 w-4" />,
    },
    {
      value: "history",
      label: "History",
      href: `/club/${identifier}/history`,
      icon: <CalendarDots className="h-4 w-4" />,
    },
    {
      value: "discuss",
      label: "Discuss",
      href: `/club/${identifier}/discuss`,
      icon: <ChatCircle className="h-4 w-4" />,
    },
    {
      value: "members",
      label: "Members",
      href: `/club/${identifier}/members`,
      icon: <Users className="h-4 w-4" />,
    },
    {
      value: "settings",
      label: "Settings",
      href: `/club/${identifier}/settings`,
      icon: <Gear className="h-4 w-4" />,
    },
  ];

  const tabs = mode === "structured" ? structuredTabs : casualTabs;

  // Determine active tab based on pathname (support both old /clubs/[id] and new /club/[slug] routes)
  const getActiveTab = () => {
    // Check for new route format
    if (pathname === `/club/${identifier}`) return "overview";
    for (const tab of tabs) {
      if (pathname.startsWith(tab.href)) {
        return tab.value;
      }
    }
    // Fallback: check old route format
    if (pathname.startsWith(`/club/${identifier}/`)) {
      const path = pathname.replace(`/club/${identifier}`, "");
      if (path === "/history") return "history";
      if (path.startsWith("/history")) return "history";
      if (path === "/discuss") return "discuss";
      if (path === "/members") return "members";
      if (path === "/settings") return "settings";
    }
    return tabs[0]?.value || "overview";
  };

  const activeTab = getActiveTab();

  return (
    <div className="border-b border-[var(--border)] mb-6">
      <nav className="flex gap-1 overflow-x-auto" data-swipe-ignore>
        {tabs.map((tab) => {
          const isActive = activeTab === tab.value;
          return (
            <Link
              key={tab.value}
              href={tab.href}
              className={cn(
                "inline-flex items-center gap-2 px-4 py-3 text-sm font-medium transition-colors",
                "border-b-2 border-transparent",
                "hover:text-[var(--text-primary)]",
                isActive
                  ? "text-[var(--text-primary)] border-[var(--club-accent,var(--primary))]"
                  : "text-[var(--text-secondary)]"
              )}
            >
              {tab.icon}
              <span>{tab.label}</span>
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
