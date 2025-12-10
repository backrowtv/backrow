"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Text, Heading } from "@/components/ui/typography";
import { DateDisplay } from "@/components/ui/date-display";
import { Trophy, FilmReel, Star, CalendarBlank, ShareNetwork } from "@phosphor-icons/react";
import { useState } from "react";
import toast from "react-hot-toast";
import { formatRatingDisplay } from "@/lib/ratings/normalize";

interface SeasonWrapProps {
  seasonSlug: string;
  clubSlug: string;
  seasonName: string;
  startDate: string;
  endDate: string | null;
  stats: {
    totalMovies: number;
    totalFestivals: number;
    festivalsWon: number;
    topGenres: Array<{ genre: string; count: number }>;
    topMovies: Array<{ title: string; tmdb_id: number; poster_url: string | null }>;
    totalRatings: number;
    avgRating: number;
  };
}

export function SeasonWrap({
  seasonSlug,
  clubSlug,
  seasonName,
  startDate,
  endDate,
  stats,
}: SeasonWrapProps) {
  const [sharing, setSharing] = useState(false);

  async function handleShare() {
    setSharing(true);
    try {
      const shareData = {
        title: `${seasonName} Wrap`,
        text: `Check out my ${seasonName} stats on BackRow!`,
        url:
          typeof window !== "undefined"
            ? `${window.location.origin}/club/${clubSlug}/season/${seasonSlug}`
            : "",
      };

      if (navigator.share && navigator.canShare(shareData)) {
        await navigator.share(shareData);
        toast.success("Shared successfully!");
      } else {
        // Fallback: copy to clipboard
        await navigator.clipboard.writeText(shareData.url);
        toast.success("Link copied to clipboard!");
      }
    } catch (error) {
      if ((error as Error).name !== "AbortError") {
        toast.error("Failed to share");
      }
    } finally {
      setSharing(false);
    }
  }

  return (
    <Card className="overflow-hidden">
      <CardHeader className="bg-gradient-to-r from-[var(--surface-2)] to-[var(--surface-2)] border-b">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-2xl">{seasonName} Wrap</CardTitle>
            <Text size="sm" muted className="mt-1">
              <DateDisplay date={startDate} format="date" />
              {endDate && (
                <>
                  {" - "}
                  <DateDisplay date={endDate} format="date" />
                </>
              )}
            </Text>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={handleShare}
            disabled={sharing}
            className="gap-2"
          >
            <ShareNetwork className="w-4 h-4" />
            Share
          </Button>
        </div>
      </CardHeader>

      <CardContent className="p-6 space-y-6">
        {/* Stats Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="text-center p-4 rounded-lg bg-[var(--surface-1)]">
            <FilmReel className="w-6 h-6 mx-auto mb-2 text-[var(--club-accent,var(--primary))]" />
            <Text size="lg" className="font-bold">
              {stats.totalMovies}
            </Text>
            <Text size="tiny" muted>
              Movies Watched
            </Text>
          </div>

          <div className="text-center p-4 rounded-lg bg-[var(--surface-1)]">
            <CalendarBlank className="w-6 h-6 mx-auto mb-2 text-[var(--club-accent,var(--primary))]" />
            <Text size="lg" className="font-bold">
              {stats.totalFestivals}
            </Text>
            <Text size="tiny" muted>
              Festivals
            </Text>
          </div>

          <div className="text-center p-4 rounded-lg bg-[var(--surface-1)]">
            <Trophy className="w-6 h-6 mx-auto mb-2 text-[var(--club-accent,var(--primary))]" />
            <Text size="lg" className="font-bold">
              {stats.festivalsWon}
            </Text>
            <Text size="tiny" muted>
              Wins
            </Text>
          </div>

          <div className="text-center p-4 rounded-lg bg-[var(--surface-1)]">
            <Star className="w-6 h-6 mx-auto mb-2 text-[var(--club-accent,var(--primary))]" />
            <Text size="lg" className="font-bold">
              {formatRatingDisplay(stats.avgRating)}
            </Text>
            <Text size="tiny" muted>
              Avg Rating
            </Text>
          </div>
        </div>

        {/* Top Genres */}
        {stats.topGenres.length > 0 && (
          <div>
            <Heading level={4} className="mb-3">
              Top Genres
            </Heading>
            <div className="flex flex-wrap gap-2">
              {stats.topGenres.slice(0, 5).map((genre, index) => (
                <Badge
                  key={genre.genre}
                  variant={index === 0 ? "default" : "secondary"}
                  className="text-sm"
                >
                  {genre.genre} ({genre.count})
                </Badge>
              ))}
            </div>
          </div>
        )}

        {/* Top Movies */}
        {stats.topMovies.length > 0 && (
          <div>
            <Heading level={4} className="mb-3">
              Top Movies
            </Heading>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {stats.topMovies.slice(0, 4).map((movie) => (
                <div
                  key={movie.tmdb_id}
                  className="text-center p-3 rounded-lg bg-[var(--surface-1)] hover:bg-[var(--surface-2)] transition-colors"
                >
                  {movie.poster_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={movie.poster_url}
                      alt={movie.title}
                      className="w-full aspect-[2/3] object-cover rounded mb-2"
                    />
                  ) : (
                    <div className="w-full aspect-[2/3] bg-[var(--muted)] rounded mb-2 flex items-center justify-center">
                      <FilmReel className="w-8 h-8 text-[var(--text-muted)]" />
                    </div>
                  )}
                  <Text size="sm" className="font-medium line-clamp-2">
                    {movie.title}
                  </Text>
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
