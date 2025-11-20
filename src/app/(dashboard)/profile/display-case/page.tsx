import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { FavoritesList } from "@/components/profile/FavoritesList";
import { getUserFavorites } from "@/app/actions/profile/favorites";
import { ChallengesSectionWrapper } from "./ChallengesSectionWrapper";
import { getAllBadgesByCategory } from "@/app/actions/badges";
import { Text } from "@/components/ui/typography";

export default async function DisplayCasePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/sign-in");
  }

  // Fetch badge data, user profile, and favorites in parallel
  const [profileResult, badgeDataResult, favoritesResult] = await Promise.all([
    supabase.from("users").select("featured_badge_ids").eq("id", user.id).single(),
    getAllBadgesByCategory(user.id),
    getUserFavorites(user.id),
  ]);

  const featuredBadgeIds = (profileResult.data?.featured_badge_ids as string[]) || [];
  const badgeData = "data" in badgeDataResult ? badgeDataResult.data : null;
  const favorites = favoritesResult.data || [];

  return (
    <div className="bg-[var(--background)]">
      <div className="max-w-3xl mx-auto px-4 lg:px-6 py-6">
        {/* Header - Hidden on mobile since TopNav shows "Profile" */}
        <div className="hidden md:block mb-6">
          <h1 className="text-lg font-semibold text-[var(--text-primary)]">Display Case</h1>
        </div>

        <div className="space-y-8">
          {/* Favorites Section */}
          <section className="space-y-4">
            <h3 className="text-base font-semibold text-[var(--text-primary)]">Favorites</h3>
            <FavoritesList initialFavorites={favorites} />
          </section>

          {/* Challenges Section */}
          <section className="border-t border-[var(--border)] pt-6 space-y-4">
            {badgeData ? (
              <ChallengesSectionWrapper
                badgeData={badgeData}
                currentFeaturedIds={featuredBadgeIds}
              />
            ) : (
              <div className="py-6">
                <Text size="sm" className="text-red-400">
                  Failed to load badge data
                </Text>
              </div>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}
