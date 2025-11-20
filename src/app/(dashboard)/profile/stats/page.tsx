import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { getUserProfileStats } from "@/app/actions/profile/user-stats";
import { StatsOverviewGrid } from "@/components/profile/stats/StatsOverviewGrid";
import { RatingInsights } from "@/components/profile/stats/RatingInsights";
import { FestivalPerformance } from "@/components/profile/stats/FestivalPerformance";
import { TopGenresDisplay } from "@/components/profile/stats/TopGenresDisplay";
import { TimingStats } from "@/components/profile/stats/TimingStats";
import { FunStats } from "@/components/profile/stats/FunStats";

export default async function StatsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/sign-in");
  }

  const result = await getUserProfileStats(user.id);

  if (result.error || !result.data) {
    return (
      <div className="bg-[var(--background)]">
        <div className="max-w-3xl mx-auto px-4 lg:px-6 py-6">
          <p className="text-sm text-[var(--text-muted)]">
            {result.error || "Failed to load stats"}
          </p>
        </div>
      </div>
    );
  }

  const stats = result.data;

  return (
    <div className="bg-[var(--background)]">
      <div className="max-w-3xl mx-auto px-4 lg:px-6 py-6">
        {/* Header - Hidden on mobile since TopNav shows "Profile" */}
        <div className="hidden md:block mb-4">
          <h1 className="text-lg font-semibold text-[var(--text-primary)]">Stats</h1>
          <p className="text-xs text-[var(--text-muted)]">
            Your performance across all clubs and festivals
          </p>
        </div>

        <div className="space-y-4">
          <StatsOverviewGrid stats={stats} />
          <RatingInsights stats={stats} />
          <FestivalPerformance stats={stats} />
          <TopGenresDisplay genres={stats.topGenres} />
          <TimingStats stats={stats} />
          <FunStats stats={stats} />
        </div>
      </div>
    </div>
  );
}
