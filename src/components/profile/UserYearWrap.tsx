import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Text } from "@/components/ui/typography";
import { Trophy, FilmReel, Star, CalendarBlank, ArrowRight } from "@phosphor-icons/react";
import { getUserYearWrapStats } from "@/app/actions/profile";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { formatRatingDisplay } from "@/lib/ratings/normalize";

interface UserYearWrapProps {
  userId: string;
  year: number;
}

export async function UserYearWrap({ userId, year }: UserYearWrapProps) {
  const result = await getUserYearWrapStats(userId, year);

  if ("error" in result && result.error) {
    return (
      <Card variant="default">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CalendarBlank className="h-5 w-5" />
            {year} Year in Review
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Text size="sm" style={{ color: "var(--error)" }}>
            {result.error}
          </Text>
        </CardContent>
      </Card>
    );
  }

  const stats = result.data || {
    moviesWatched: 0,
    festivalsWon: 0,
    topGenres: [],
    averageRating: 0,
  };

  return (
    <Card variant="default">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <CalendarBlank className="h-5 w-5" />
          {year} Year in Review
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <Text size="sm" muted>
            Your {year} movie year at a glance
          </Text>

          {/* Stats Grid */}
          <div className="grid grid-cols-2 gap-4">
            <div className="p-4 rounded-lg bg-[var(--surface-1)]">
              <div className="flex items-center gap-2 mb-2">
                <FilmReel className="h-4 w-4" style={{ color: "var(--primary)" }} />
                <Text size="tiny" muted>
                  Movies Watched
                </Text>
              </div>
              <Text size="lg" className="font-bold">
                {stats.moviesWatched}
              </Text>
            </div>

            <div className="p-4 rounded-lg bg-[var(--surface-1)]">
              <div className="flex items-center gap-2 mb-2">
                <Trophy className="h-4 w-4" style={{ color: "var(--primary)" }} />
                <Text size="tiny" muted>
                  Festivals Won
                </Text>
              </div>
              <Text size="lg" className="font-bold">
                {stats.festivalsWon}
              </Text>
            </div>

            <div className="p-4 rounded-lg bg-[var(--surface-1)]">
              <div className="flex items-center gap-2 mb-2">
                <Star className="h-4 w-4" style={{ color: "var(--primary)" }} />
                <Text size="tiny" muted>
                  Avg Rating
                </Text>
              </div>
              <Text size="lg" className="font-bold">
                {stats.averageRating > 0 ? formatRatingDisplay(stats.averageRating) : "--"}
              </Text>
            </div>

            <div className="p-4 rounded-lg bg-[var(--surface-1)]">
              <div className="flex items-center gap-2 mb-2">
                <FilmReel className="h-4 w-4" style={{ color: "var(--primary)" }} />
                <Text size="tiny" muted>
                  Top Genres
                </Text>
              </div>
              <Text size="sm">
                {stats.topGenres.length > 0 ? stats.topGenres.map((g) => g.genre).join(", ") : "--"}
              </Text>
            </div>
          </div>
        </div>
      </CardContent>
      <CardFooter>
        <Link href={`/profile/year-in-review-${year}`} className="w-full">
          <Button variant="outline" className="w-full">
            View Full Year in Review
            <ArrowRight className="h-4 w-4 ml-2" />
          </Button>
        </Link>
      </CardFooter>
    </Card>
  );
}
