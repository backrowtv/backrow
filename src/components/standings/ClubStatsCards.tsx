import { createClient } from "@/lib/supabase/server";
import { StatCard } from "@/components/dashboard/StatCard";
import {
  CinemaCurtainsIllustration,
  FilmReelIllustration,
  MovieCameraIllustration,
  CinemaSeatsIllustration,
} from "@/components/dashboard/CinemaIllustrations";
import type { StandingsEntry } from "@/app/actions/standings.types";

interface ClubStatsCardsProps {
  clubId: string;
  entries: StandingsEntry[];
}

export async function ClubStatsCards({ clubId, entries }: ClubStatsCardsProps) {
  const supabase = await createClient();

  // Get total members (unique users in standings)
  const totalMembers = entries.length;

  // Get total festivals count (completed festivals)
  const { count: totalFestivals } = await supabase
    .from("festivals")
    .select("*", { count: "exact", head: true })
    .eq("club_id", clubId)
    .eq("status", "completed");

  // Get total seasons count
  const { count: totalSeasons } = await supabase
    .from("seasons")
    .select("*", { count: "exact", head: true })
    .eq("club_id", clubId);

  // Calculate average points from standings entries
  const averagePoints =
    entries.length > 0
      ? (entries.reduce((sum, entry) => sum + entry.points, 0) / entries.length).toFixed(1)
      : "0.0";

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
      <StatCard
        title="Total Members"
        value={totalMembers}
        illustration={<CinemaSeatsIllustration />}
        delay={0}
      />
      <StatCard
        title="Total Festivals"
        value={totalFestivals || 0}
        illustration={<FilmReelIllustration />}
        delay={100}
      />
      <StatCard
        title="Total Seasons"
        value={totalSeasons || 0}
        illustration={<CinemaCurtainsIllustration />}
        delay={200}
      />
      <StatCard
        title="Average Points"
        value={averagePoints}
        illustration={<MovieCameraIllustration />}
        delay={300}
      />
    </div>
  );
}
