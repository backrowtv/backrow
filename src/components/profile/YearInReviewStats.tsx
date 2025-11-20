import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Heading, Text } from "@/components/ui/typography";
import {
  FilmReel,
  Trophy,
  Star,
  CalendarBlank,
  Users,
  TrendUp,
} from "@phosphor-icons/react/dist/ssr";
import Link from "next/link";
import { AnimatedNumber, AnimatedDecimal } from "@/components/ui/animated-number";

interface YearInReviewStatsProps {
  stats: {
    moviesWatched: number;
    festivalsWon: number;
    festivalsParticipated: number;
    topGenres: Array<{ genre: string; count: number }>;
    averageRating: number;
    mostActiveClubs: Array<{ clubId: string; name: string; slug: string | null; count: number }>;
    totalRatings: number;
  };
  year: number;
}

export function YearInReviewStats({ stats, year: _year }: YearInReviewStatsProps) {
  return (
    <div className="space-y-6">
      <Heading level={2}>Statistics</Heading>

      {/* Main Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card variant="default">
          <CardContent className="p-6">
            <div className="flex items-center gap-2 mb-2">
              <FilmReel className="h-5 w-5" style={{ color: "var(--primary)" }} />
              <Text size="tiny" muted>
                Movies Watched
              </Text>
            </div>
            <Text size="lg" className="font-bold">
              <AnimatedNumber value={stats.moviesWatched} timing="dramatic" />
            </Text>
          </CardContent>
        </Card>

        <Card variant="default">
          <CardContent className="p-6">
            <div className="flex items-center gap-2 mb-2">
              <Trophy className="h-5 w-5" style={{ color: "var(--primary)" }} />
              <Text size="tiny" muted>
                Festivals Won
              </Text>
            </div>
            <Text size="lg" className="font-bold">
              <AnimatedNumber value={stats.festivalsWon} timing="dramatic" />
            </Text>
          </CardContent>
        </Card>

        <Card variant="default">
          <CardContent className="p-6">
            <div className="flex items-center gap-2 mb-2">
              <Star className="h-5 w-5" style={{ color: "var(--primary)" }} />
              <Text size="tiny" muted>
                Avg Rating
              </Text>
            </div>
            <Text size="lg" className="font-bold">
              <AnimatedDecimal value={stats.averageRating} timing="dramatic" />
            </Text>
          </CardContent>
        </Card>

        <Card variant="default">
          <CardContent className="p-6">
            <div className="flex items-center gap-2 mb-2">
              <CalendarBlank className="h-5 w-5" style={{ color: "var(--primary)" }} />
              <Text size="tiny" muted>
                Festivals
              </Text>
            </div>
            <Text size="lg" className="font-bold">
              <AnimatedNumber value={stats.festivalsParticipated} timing="dramatic" />
            </Text>
          </CardContent>
        </Card>
      </div>

      {/* Top Genres */}
      {stats.topGenres.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendUp className="h-5 w-5" />
              Top Genres
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-3">
              {stats.topGenres.map(({ genre, count }) => (
                <div
                  key={genre}
                  className="px-4 py-2 rounded-lg"
                  style={{ backgroundColor: "var(--surface-2)" }}
                >
                  <Text size="small" className="font-medium">
                    {genre}
                  </Text>
                  <Text size="tiny" muted>
                    <AnimatedNumber value={count} /> {count === 1 ? "movie" : "movies"}
                  </Text>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Most Active Clubs */}
      {stats.mostActiveClubs.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Most Active Clubs
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {stats.mostActiveClubs.map(({ clubId, name, slug, count }) => (
                <Link
                  key={clubId}
                  href={slug ? `/club/${slug}` : `/club/${clubId}`}
                  className="flex items-center justify-between p-3 rounded-lg hover:bg-[var(--surface-2)] transition-colors"
                >
                  <Text size="small" className="font-medium">
                    {name}
                  </Text>
                  <Text size="small" muted>
                    <AnimatedNumber value={count} /> {count === 1 ? "festival" : "festivals"}
                  </Text>
                </Link>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
