"use client";

import { usePathname } from "next/navigation";
import {
  UserIDCard,
  UserIDCardUser,
  UserIDCardFavorites,
  UserIDCardAchievements,
} from "./UserIDCard";
import type { UserIDCardStats, FeaturedBadge } from "@/types/id-card";
import { cn } from "@/lib/utils";

interface UserIDCardHeaderWrapperProps {
  user: UserIDCardUser;
  favorites?: UserIDCardFavorites | null;
  achievements?: UserIDCardAchievements | null;
  stats?: UserIDCardStats;
  featuredBadges?: FeaturedBadge[];
  showEditButton?: boolean;
  className?: string;
}

// Paths where the profile ID card should be shown (not settings pages)
const SHOW_HEADER_PATHS = [
  "/profile",
  "/profile/activity",
  "/profile/history",
  "/profile/stats",
  "/profile/reviews",
  "/profile/display-case",
  "/profile/future-nominations",
  "/profile/edit",
];

export function UserIDCardHeaderWrapper({
  user,
  favorites,
  achievements,
  stats,
  featuredBadges,
  showEditButton: _showEditButton = false,
  className,
}: UserIDCardHeaderWrapperProps) {
  const pathname = usePathname();

  const shouldShowHeader =
    SHOW_HEADER_PATHS.includes(pathname) || pathname.startsWith("/profile/year-in-review-");

  if (!shouldShowHeader) {
    return null;
  }

  return (
    <div className={cn("mb-6 mx-auto", className)} style={{ width: 340, maxWidth: "100%" }}>
      <UserIDCard
        user={user}
        favorites={favorites}
        achievements={achievements}
        stats={stats}
        featuredBadges={featuredBadges}
        variant="full"
      />
    </div>
  );
}
