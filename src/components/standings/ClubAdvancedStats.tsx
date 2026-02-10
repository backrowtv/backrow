import { getClubAdvancedStats } from "@/app/actions/club-advanced-stats";
import { getRatingDistributionData, getTopRatedMoviesData } from "@/app/actions/stats";
import { ClubTimingStats } from "./ClubTimingStats";
import { ClubRatingStats } from "./ClubRatingStats";
import { ClubMovieStats } from "./ClubMovieStats";
import { ClubFunStats } from "./ClubFunStats";

interface ClubAdvancedStatsProps {
  clubId: string;
}

export async function ClubAdvancedStats({ clubId }: ClubAdvancedStatsProps) {
  const [advancedResult, distResult, topMoviesResult] = await Promise.all([
    getClubAdvancedStats(clubId),
    getRatingDistributionData(clubId),
    getTopRatedMoviesData(clubId),
  ]);

  if (!advancedResult.data) {
    return null;
  }

  const stats = advancedResult.data;
  const ratingDist = "data" in distResult ? distResult.data : undefined;
  const topMovies = "data" in topMoviesResult ? topMoviesResult.data : undefined;

  return (
    <div className="space-y-5">
      <ClubTimingStats stats={stats} />
      <ClubRatingStats stats={stats} ratingDistribution={ratingDist} topRatedMovies={topMovies} />
      <ClubMovieStats stats={stats} />
      <ClubFunStats stats={stats} />
    </div>
  );
}
