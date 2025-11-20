import { createClient } from "@/lib/supabase/server";
import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import {
  FilmStripIcon,
  TrophyIcon,
  ClapperboardIcon,
  StarRatingIcon,
} from "./ProfileIllustrations";
import { AnimatedStat, AnimatedDecimalStat } from "./AnimatedStat";

interface ProfileStatsProps {
  userId: string;
}

export async function ProfileStats({ userId }: ProfileStatsProps) {
  const supabase = await createClient();

  // Get clubs joined count
  const { count: clubsJoined } = await supabase
    .from("club_members")
    .select("*", { count: "exact", head: true })
    .eq("user_id", userId);

  // Get festivals won from normalized user_stats table
  const { data: userStats } = await supabase
    .from("user_stats")
    .select("festivals_won")
    .eq("user_id", userId)
    .maybeSingle();

  let festivalsWon = userStats?.festivals_won || 0;

  // Fallback: calculate from festival_standings if user_stats doesn't exist
  if (festivalsWon === 0) {
    const { count } = await supabase
      .from("festival_standings")
      .select("*", { count: "exact", head: true })
      .eq("user_id", userId)
      .eq("rank", 1);

    festivalsWon = count || 0;
  }

  // Get average rating
  const { data: ratings } = await supabase.from("ratings").select("rating").eq("user_id", userId);

  const avgRating =
    ratings && ratings.length > 0
      ? (ratings.reduce((sum, r) => sum + Number(r.rating), 0) / ratings.length).toFixed(2)
      : "0.00";

  // Get nomination guesses accuracy
  // Get all guesses made by user
  const { data: userGuesses } = await supabase
    .from("nomination_guesses")
    .select("festival_id, guesses")
    .eq("user_id", userId);

  let totalGuessed = 0;
  let totalCorrect = 0;

  if (userGuesses && userGuesses.length > 0) {
    // For each festival, get the actual nominators from results
    const festivalIds = [...new Set(userGuesses.map((g) => g.festival_id))];

    const { data: results } = await supabase
      .from("festival_results")
      .select("festival_id, results")
      .in("festival_id", festivalIds);

    const resultsMap = new Map(
      (results || []).map((r) => [
        r.festival_id,
        r.results as unknown as { guesses?: { nominator_reveals?: Record<string, string> } } | null,
      ])
    );

    // Calculate accuracy for each festival
    for (const guessRecord of userGuesses) {
      const resultsData = resultsMap.get(guessRecord.festival_id);
      if (!resultsData?.guesses?.nominator_reveals) continue;

      const nominatorReveals = resultsData.guesses.nominator_reveals as Record<string, string>;
      const userGuessesMap = guessRecord.guesses as Record<string, string>;

      // Count guesses
      for (const [nominationId, guessedUserId] of Object.entries(userGuessesMap)) {
        totalGuessed++;
        const actualNominator = nominatorReveals[nominationId];
        if (actualNominator && actualNominator === guessedUserId) {
          totalCorrect++;
        }
      }
    }
  }

  const nominatorsGuessed = totalGuessed > 0 ? `${totalCorrect}/${totalGuessed}` : "0/0";

  const stats = [
    {
      label: "Clubs Joined",
      value: clubsJoined || 0,
      icon: FilmStripIcon,
    },
    {
      label: "Festivals Won",
      value: festivalsWon,
      icon: TrophyIcon,
    },
    {
      label: "Nominators Guessed",
      value: nominatorsGuessed,
      icon: ClapperboardIcon,
    },
    {
      label: "Avg Rating",
      value: avgRating,
      icon: StarRatingIcon,
    },
  ];

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat) => {
          const IconComponent = stat.icon;
          return (
            <Card
              key={stat.label}
              variant="default"
              hover
              className="relative overflow-hidden group"
            >
              <CardContent className="relative z-10 p-4">
                <div className="flex items-start justify-between mb-3">
                  {/* Icon */}
                  <div
                    className="opacity-80 group-hover:opacity-100 transition-opacity"
                    style={{ color: "var(--text-primary)" }}
                  >
                    <IconComponent className="w-10 h-10" />
                  </div>

                  {/* Decorative dots */}
                  <div className="flex gap-1 opacity-20">
                    <div className="w-1.5 h-1.5 rounded-full bg-current" />
                    <div className="w-1.5 h-1.5 rounded-full bg-current" />
                  </div>
                </div>

                {/* Value */}
                <div className="mb-2">
                  <div
                    className="text-2xl sm:text-3xl md:text-4xl font-bold"
                    style={{ color: "var(--text-primary)" }}
                  >
                    {stat.label === "Avg Rating" ? (
                      <AnimatedDecimalStat value={parseFloat(String(stat.value))} />
                    ) : (
                      <AnimatedStat value={stat.value} />
                    )}
                  </div>
                </div>

                {/* Label */}
                <div
                  className="text-xs uppercase tracking-wider transition-colors font-medium"
                  style={{ color: "var(--text-secondary)" }}
                >
                  {stat.label}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
      <div className="flex justify-end">
        <Link
          href="/profile/stats"
          className="text-xs text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors"
        >
          View all stats →
        </Link>
      </div>
    </div>
  );
}
