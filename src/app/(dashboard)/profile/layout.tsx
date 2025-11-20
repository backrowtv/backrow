import { Suspense } from "react";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { ProfileNavigation } from "@/components/profile/ProfileNavigation";
import { UserIDCardHeaderWrapper } from "@/components/id-cards";
import { Skeleton } from "@/components/ui/skeleton";
import { getUserBadges } from "@/app/actions/badges";
import { getUserIDCardStats, getUserFeaturedBadges } from "@/app/actions/id-card";
import { getFeaturedFavorites } from "@/app/actions/profile/favorites";

// Server component that handles all async data fetching
async function ProfileLayoutContent({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/sign-in");
  }

  // Fetch all data in parallel
  const [
    profileResult,
    favoriteClubResult,
    winsResult,
    badgesResult,
    statsResult,
    featuredBadgesResult,
    featuredFavoritesResult,
  ] = await Promise.all([
    supabase
      .from("users")
      .select(
        `
        id,
        display_name,
        username,
        email,
        avatar_url,
        bio,
        social_links,
        avatar_icon,
        avatar_color_index,
        avatar_border_color_index
      `
      )
      .eq("id", user.id)
      .single(),
    supabase
      .from("favorite_clubs")
      .select("club_id, clubs:club_id!inner(id, name, slug)")
      .eq("user_id", user.id)
      .eq("clubs.archived", false)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
    supabase.from("festival_standings").select("rank").eq("user_id", user.id).in("rank", [1, 2, 3]),
    getUserBadges(user.id),
    getUserIDCardStats(user.id),
    getUserFeaturedBadges(user.id),
    getFeaturedFavorites(user.id),
  ]);

  const profile = profileResult.data;
  if (!profile) {
    redirect("/sign-in");
  }

  // Count trophy placements
  const festivalWins = { first: 0, second: 0, third: 0 };
  if (winsResult.data) {
    winsResult.data.forEach((standing) => {
      if (standing.rank === 1) festivalWins.first++;
      else if (standing.rank === 2) festivalWins.second++;
      else if (standing.rank === 3) festivalWins.third++;
    });
  }

  // Extract favorite club
  const favoriteClubData = favoriteClubResult.data?.clubs;
  const favoriteClub = Array.isArray(favoriteClubData)
    ? (favoriteClubData[0] as { id: string; name: string; slug: string } | undefined)
    : (favoriteClubData as { id: string; name: string; slug: string } | null | undefined);

  // Extract earned badges (getUserBadges returns { data: UserBadge[] } | { error: string })
  const earnedBadges =
    "data" in badgesResult
      ? badgesResult.data.map((ub) => ({
          id: ub.badge_id,
          name: ub.badge.name,
          icon_url: ub.badge.icon_url,
        }))
      : [];

  // Extract stats and featured badges for ID card display
  const stats = "data" in statsResult ? statsResult.data : undefined;
  const featuredBadges = "data" in featuredBadgesResult ? featuredBadgesResult.data : [];

  // Extract featured favorites
  const featuredFavorites = featuredFavoritesResult.data || [];

  // Build user data for the ID card
  const displayName = profile.display_name || user.email?.split("@")[0] || "User";
  const userData = {
    id: profile.id,
    name: displayName,
    display_name: displayName,
    username: profile.username,
    avatar_url: profile.avatar_url,
    bio: profile.bio,
    email: user.email,
    avatar_icon: profile.avatar_icon,
    avatar_color_index: profile.avatar_color_index,
    avatar_border_color_index: profile.avatar_border_color_index,
    social_links: profile.social_links as {
      letterboxd?: string;
      imdb?: string;
      trakt?: string;
      tmdb?: string;
    } | null,
    joined_at: user.created_at,
  };

  const favorites = {
    featured: featuredFavorites,
    club: favoriteClub || undefined,
  };

  const achievements = {
    festivalWins,
    badges: earnedBadges,
  };

  return (
    <>
      <ProfileNavigation />
      <div className="bg-[var(--background)] overflow-x-hidden">
        {/* Main Content */}
        <div className="max-w-5xl mx-auto px-4 lg:px-6 py-6">
          {/* ID Card - fixed in left gutter on desktop, inline on mobile */}
          <UserIDCardHeaderWrapper
            user={userData}
            favorites={favorites}
            achievements={achievements}
            stats={stats}
            featuredBadges={featuredBadges}
          />

          {children}
        </div>
      </div>
    </>
  );
}

function ProfileLayoutSkeleton() {
  return (
    <div className="bg-[var(--background)]">
      <div className="max-w-5xl mx-auto px-4 lg:px-6 py-6">
        {/* ID Card Skeleton - inline on narrow, hidden on wide (fixed card loads separately) */}
        <div className="mb-6 max-w-md mx-auto min-[1800px]:hidden">
          <div className="w-full rounded-2xl bg-[var(--surface-1)] overflow-hidden">
            <div className="p-4">
              {/* Header: Avatar + Name/Username/Bio */}
              <div className="flex gap-4">
                <Skeleton className="w-16 h-16 rounded-full flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <Skeleton className="h-5 w-32" />
                    <div className="flex gap-1">
                      <Skeleton className="w-4 h-4 rounded" />
                      <Skeleton className="w-4 h-4 rounded" />
                      <Skeleton className="w-4 h-4 rounded" />
                    </div>
                  </div>
                  <Skeleton className="h-3.5 w-20 mb-2" />
                  <Skeleton className="h-3 w-full" />
                  <Skeleton className="h-3 w-3/4 mt-1" />
                </div>
              </div>

              {/* Favorites + Badges Row */}
              <div className="mt-4 pt-4 border-t border-[var(--border)]">
                <div className="flex items-start gap-3">
                  <div className="flex items-center gap-1 sm:gap-2 flex-shrink-0">
                    {[1, 2, 3, 4].map((i) => (
                      <Skeleton key={i} className="w-9 sm:w-12 aspect-[2/3] rounded-lg" />
                    ))}
                  </div>
                  <div className="flex gap-2 sm:gap-3 flex-1 justify-end items-start">
                    {[1, 2, 3].map((i) => (
                      <div key={i} className="flex flex-col items-center gap-1">
                        <Skeleton className="w-8 h-8 rounded-full" />
                        <Skeleton className="h-2 w-10" />
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Stats Row */}
              <div className="mt-3 pt-3 border-t border-[var(--border)] flex gap-4">
                <Skeleton className="h-3 w-16" />
                <Skeleton className="h-3 w-20" />
              </div>
            </div>
          </div>
        </div>

        {/* Page content area */}
        <Skeleton className="h-64 w-full rounded-lg" />
      </div>
    </div>
  );
}

export default function ProfileLayout({ children }: { children: React.ReactNode }) {
  return (
    <Suspense fallback={<ProfileLayoutSkeleton />}>
      <ProfileLayoutContent>{children}</ProfileLayoutContent>
    </Suspense>
  );
}
