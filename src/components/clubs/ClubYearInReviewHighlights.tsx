"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Heading, Text } from "@/components/ui/typography";
import { FilmReel, Trophy, Star } from "@phosphor-icons/react";
import Image from "next/image";
import Link from "next/link";
import { DateDisplay } from "@/components/ui/date-display";
import { UserPopupModal } from "@/components/profile/UserPopupModal";
import { formatRatingDisplay } from "@/lib/ratings/normalize";

interface ClubYearInReviewHighlightsProps {
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
    completedFestivals: Array<{
      id: string;
      slug: string | null;
      theme: string;
      start_date: string;
      results_date: string | null;
    }>;
    topMembers: Array<{
      userId: string;
      displayName: string;
      avatarUrl: string | null;
      nominations: number;
      ratings: number;
      festivalsWon: number;
    }>;
  };
  year: number;
  clubId: string;
  clubSlug: string | null;
}

export function ClubYearInReviewHighlights({
  highlights,
  year: _year,
  clubId,
  clubSlug,
}: ClubYearInReviewHighlightsProps) {
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [popupOpen, setPopupOpen] = useState(false);
  const clubPath = clubSlug ? `/club/${clubSlug}` : `/club/${clubId}`;

  const handleMemberClick = (userId: string) => {
    setSelectedUserId(userId);
    setPopupOpen(true);
  };

  return (
    <>
      <div className="space-y-6">
        <Heading level={2}>Highlights</Heading>

        {/* Completed Festivals */}
        {highlights.completedFestivals.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Trophy className="h-5 w-5" />
                Completed Festivals
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {highlights.completedFestivals.map((festival) => {
                  const festivalSlug = festival.slug;
                  if (!festivalSlug) {
                    console.error(
                      "ClubYearInReviewHighlights: Festival slug is required",
                      festival.id
                    );
                    return null;
                  }
                  return (
                    <Link
                      key={festival.id}
                      href={`${clubPath}/festival/${festivalSlug}`}
                      className="flex items-center justify-between p-4 rounded-lg hover:bg-[var(--surface-2)] transition-colors"
                    >
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-lg bg-[var(--club-accent,var(--primary))]/20 flex items-center justify-center">
                          <Trophy
                            className="h-6 w-6"
                            style={{ color: "var(--club-accent, var(--primary))" }}
                          />
                        </div>
                        <div>
                          <Text size="small" className="font-semibold">
                            {festival.theme || "Untitled Festival"}
                          </Text>
                          <Text size="tiny" muted>
                            <DateDisplay date={festival.start_date} format="date" />
                            {festival.results_date && (
                              <>
                                {" "}
                                • Results:{" "}
                                <DateDisplay date={festival.results_date} format="date" />
                              </>
                            )}
                          </Text>
                        </div>
                      </div>
                      <Text size="tiny" muted>
                        View →
                      </Text>
                    </Link>
                  );
                })}
              </div>
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
                      className="line-clamp-2 group-hover:text-[var(--club-accent,var(--primary))] transition-colors"
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
                      <div className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold bg-[var(--club-accent,var(--primary))] text-white">
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

        {/* Top Members */}
        {highlights.topMembers.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Trophy className="h-5 w-5" />
                Top Performers
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {highlights.topMembers.map((member, index) => (
                  <button
                    key={member.userId}
                    onClick={() => handleMemberClick(member.userId)}
                    className="w-full flex items-center justify-between p-4 rounded-lg hover:bg-[var(--surface-2)] transition-colors text-left"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold bg-[var(--club-accent,var(--primary))] text-white">
                        {index === 0 ? "🥇" : index === 1 ? "🥈" : index === 2 ? "🥉" : index + 1}
                      </div>
                      <div>
                        <Text size="small" className="font-semibold">
                          {member.displayName}
                        </Text>
                        <Text size="tiny" muted>
                          {member.nominations} nominations • {member.ratings} ratings
                          {member.festivalsWon > 0 &&
                            ` • ${member.festivalsWon} win${member.festivalsWon === 1 ? "" : "s"}`}
                        </Text>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* User Popup Modal */}
        {selectedUserId && (
          <UserPopupModal userId={selectedUserId} open={popupOpen} onOpenChange={setPopupOpen} />
        )}
      </div>
    </>
  );
}
