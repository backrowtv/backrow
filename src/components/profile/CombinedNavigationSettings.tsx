"use client";

import { useState, useEffect } from "react";
import { cn } from "@/lib/utils";
import { NavigationSettings } from "@/components/profile/NavigationSettings";
import { SidebarSettings } from "@/components/profile/SidebarSettings";
import type { MobileNavPreferences, SidebarNavPreferences } from "@/lib/navigation-constants";

interface CombinedNavigationSettingsProps {
  mobilePreferences: MobileNavPreferences;
  sidebarPreferences: SidebarNavPreferences;
  userClubs: Array<{ id: string; name: string; slug: string | null }>;
}

type Tab = "sidebar" | "mobile";

export function CombinedNavigationSettings({
  mobilePreferences,
  sidebarPreferences,
  userClubs,
}: CombinedNavigationSettingsProps) {
  const [activeTab, setActiveTab] = useState<Tab>("sidebar");

  // Default to mobile tab on small screens
  useEffect(() => {
    if (window.matchMedia("(max-width: 767px)").matches) {
      setActiveTab("mobile");
    }
  }, []);

  return (
    <div>
      {/* Segmented control */}
      <div className="flex rounded-lg border border-[var(--border)] overflow-hidden mb-3 w-fit">
        {(["sidebar", "mobile"] as const).map((tab) => (
          <button
            key={tab}
            type="button"
            onClick={() => setActiveTab(tab)}
            className={cn(
              "px-3 py-1 text-xs font-medium transition-colors",
              activeTab === tab
                ? "bg-[var(--primary)] text-[var(--primary-foreground)]"
                : "bg-[var(--surface-2)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
            )}
          >
            {tab === "sidebar" ? "Desktop" : "Mobile"}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className={cn(activeTab !== "sidebar" && "hidden")}>
        <SidebarSettings initialPreferences={sidebarPreferences} />
      </div>
      <div className={cn(activeTab !== "mobile" && "hidden")}>
        <NavigationSettings initialPreferences={mobilePreferences} userClubs={userClubs} />
      </div>
    </div>
  );
}
