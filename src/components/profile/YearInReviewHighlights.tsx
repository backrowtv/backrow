import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Heading, Text } from "@/components/ui/typography";
import { FilmReel, Trophy, Star, Medal } from "@phosphor-icons/react/dist/ssr";
import Image from "next/image";
import Link from "next/link";
import { formatRatingDisplay } from "@/lib/ratings/normalize";
interface YearInReviewHighlightsProps {
  highlights: {
    topRatedMovies: Array<{
      tmdbId: number;
      title: string;
      poster_url: string | null;
      rating: number;
      year: number | null;
      slug: string | null;
    }>;
    topDirectors: Array<{ director: string; count: number }>;
    favoriteMovie: {
      tmdb_id: number;
      title: string;
      poster_url: string | null;
      year: number | null;
      slug: string | null;
    } | null;
    festivalsWon: number;
  };
  year: number;
}

export function YearInReviewHighlights({ highlights, year }: YearInReviewHighlightsProps) {
  return (
    <div className="space-y-6">
      <Heading level={2}>Highlights</Heading>

      {/* Favorite Movie */}
      {highlights.favoriteMovie && (
        <Card variant="default">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Medal className="h-5 w-5" />
              Your Favorite Movie
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Link
              href={`/movies/${highlights.favoriteMovie.tmdb_id}`}
              className="flex items-center gap-4 p-4 rounded-lg hover:bg-[var(--surface-2)] transition-colors"
            >
              {highlights.favoriteMovie.poster_url ? (
                <Image
                  src={highlights.favoriteMovie.poster_url}
                  alt={highlights.favoriteMovie.title}
                  width={60}
                  height={90}
                  className="rounded-md object-cover"
                />
              ) : (
                <div className="w-[60px] h-[90px] rounded-md bg-[var(--surface-2)] flex items-center justify-center">
                  <FilmReel className="h-8 w-8" style={{ color: "var(--text-muted)" }} />
                </div>
              )}
              <div>
                <Text size="small" className="font-semibold">
                  {highlights.favoriteMovie.title}
                </Text>
                {highlights.favoriteMovie.year && (
                  <Text size="tiny" muted>
                    {highlights.favoriteMovie.year}
                  </Text>
                )}
              </div>
            </Link>
          </CardContent>
        </Card>
      )}

      {/* Top Rated Movies */}
      {highlights.topRatedMovies.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Star className="h-5 w-5" />
              Top Rated Movies
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
              {highlights.topRatedMovies.map((movie) => (
                <Link key={movie.tmdbId} href={`/movies/${movie.tmdbId}`} className="group">
                  <div className="relative aspect-[2/3] rounded-lg overflow-hidden mb-2">
                    {movie.poster_url ? (
                      <Image
                        src={movie.poster_url}
                        alt={movie.title}
                        fill
                        className="object-cover group-hover:scale-105 transition-transform"
                      />
                    ) : (
                      <div className="w-full h-full bg-[var(--surface-2)] flex items-center justify-center">
                        <FilmReel className="h-8 w-8" style={{ color: "var(--text-muted)" }} />
                      </div>
                    )}
                    <div className="absolute top-2 right-2 bg-black/70 rounded-full px-2 py-1">
                      <Text size="tiny" className="text-white font-semibold">
                        {formatRatingDisplay(movie.rating)}
                      </Text>
                    </div>
                  </div>
                  <Text
                    size="tiny"
                    className="line-clamp-2 group-hover:text-[var(--primary)] transition-colors"
                  >
                    {movie.title}
                  </Text>
                </Link>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Top Directors */}
      {highlights.topDirectors.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FilmReel className="h-5 w-5" />
              Most Watched Directors
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {highlights.topDirectors.map(({ director, count }, index) => (
                <div
                  key={director}
                  className="flex items-center justify-between p-3 rounded-lg"
                  style={{ backgroundColor: "var(--surface-1)" }}
                >
                  <div className="flex items-center gap-3">
                    <div
                      className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold"
                      style={{ backgroundColor: "var(--primary)/20", color: "var(--primary)" }}
                    >
                      {index + 1}
                    </div>
                    <Text size="small" className="font-medium">
                      {director}
                    </Text>
                  </div>
                  <Text size="small" muted>
                    {count} {count === 1 ? "movie" : "movies"}
                  </Text>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Festivals Won Badge */}
      {highlights.festivalsWon > 0 && (
        <Card variant="default" className="border-2" style={{ borderColor: "var(--primary)" }}>
          <CardContent className="p-8 text-center">
            <Trophy className="h-16 w-16 mx-auto mb-4" style={{ color: "var(--primary)" }} />
            <Heading level={2} className="mb-2">
              🎉 {highlights.festivalsWon} Festival{highlights.festivalsWon === 1 ? "" : "s"} Won!
            </Heading>
            <Text muted>
              You were the champion in {highlights.festivalsWon}{" "}
              {highlights.festivalsWon === 1 ? "festival" : "festivals"} in {year}
            </Text>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
