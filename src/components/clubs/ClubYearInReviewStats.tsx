"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Heading, Text } from "@/components/ui/typography";
import { FilmReel, Trophy, Star, Users, TrendUp, Medal } from "@phosphor-icons/react";
import { Avatar } from "@/components/ui/avatar";
import { UserPopupModal } from "@/components/profile/UserPopupModal";
import NumberFlow, { timingPresets } from "@/components/ui/number-flow";

interface ClubYearInReviewStatsProps {
  stats: {
    totalFestivalsCompleted: number;
    totalMoviesWatched: number;
    averageRating: number;
    topGenres: Array<{ genre: string; count: number }>;
    mostActiveMembers: Array<{
      userId: string;
      displayName: string;
      avatarUrl: string | null;
      nominations: number;
      ratings: number;
      festivalsWon: number;
    }>;
    mostPopularThemes: Array<{ theme: string; count: number }>;
    totalRatings: number;
    totalMembers: number;
  };
  year: number;
  clubName: string;
}

export function ClubYearInReviewStats({
  stats,
  year: _year,
  clubName: _clubName,
}: ClubYearInReviewStatsProps) {
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [popupOpen, setPopupOpen] = useState(false);

  const handleMemberClick = (userId: string) => {
    setSelectedUserId(userId);
    setPopupOpen(true);
  };

  return (
    <>
      <div className="space-y-6">
        <Heading level={2}>Statistics</Heading>

        {/* Main Stats Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card variant="default">
            <CardContent className="p-6">
              <div className="flex items-center gap-2 mb-2">
                <Trophy
                  className="h-5 w-5"
                  style={{ color: "var(--club-accent, var(--primary))" }}
                />
                <Text size="tiny" muted>
                  Festivals Completed
                </Text>
              </div>
              <Text size="lg" className="font-bold">
                <NumberFlow
                  value={stats.totalFestivalsCompleted}
                  transformTiming={timingPresets.dramatic}
                />
              </Text>
            </CardContent>
          </Card>

          <Card variant="default">
            <CardContent className="p-6">
              <div className="flex items-center gap-2 mb-2">
                <FilmReel
                  className="h-5 w-5"
                  style={{ color: "var(--club-accent, var(--primary))" }}
                />
                <Text size="tiny" muted>
                  Movies Watched
                </Text>
              </div>
              <Text size="lg" className="font-bold">
                <NumberFlow
                  value={stats.totalMoviesWatched}
                  transformTiming={timingPresets.dramatic}
                />
              </Text>
            </CardContent>
          </Card>

          <Card variant="default">
            <CardContent className="p-6">
              <div className="flex items-center gap-2 mb-2">
                <Star className="h-5 w-5" style={{ color: "var(--club-accent, var(--primary))" }} />
                <Text size="tiny" muted>
                  Avg Rating
                </Text>
              </div>
              <Text size="lg" className="font-bold">
                {stats.averageRating > 0 ? (
                  <NumberFlow
                    value={stats.averageRating}
                    format={{ minimumFractionDigits: 1, maximumFractionDigits: 1 }}
                    transformTiming={timingPresets.dramatic}
                  />
                ) : (
                  "--"
                )}
              </Text>
            </CardContent>
          </Card>

          <Card variant="default">
            <CardContent className="p-6">
              <div className="flex items-center gap-2 mb-2">
                <Users
                  className="h-5 w-5"
                  style={{ color: "var(--club-accent, var(--primary))" }}
                />
                <Text size="tiny" muted>
                  Members
                </Text>
              </div>
              <Text size="lg" className="font-bold">
                <NumberFlow value={stats.totalMembers} transformTiming={timingPresets.dramatic} />
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
                      <NumberFlow value={count} /> {count === 1 ? "movie" : "movies"}
                    </Text>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Most Popular Themes */}
        {stats.mostPopularThemes.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Medal className="h-5 w-5" />
                Most Popular Themes
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-3">
                {stats.mostPopularThemes.map(({ theme, count }) => (
                  <div
                    key={theme}
                    className="px-4 py-2 rounded-lg"
                    style={{ backgroundColor: "var(--surface-2)" }}
                  >
                    <Text size="small" className="font-medium">
                      {theme}
                    </Text>
                    <Text size="tiny" muted>
                      <NumberFlow value={count} /> {count === 1 ? "festival" : "festivals"}
                    </Text>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Most Active Members */}
        {stats.mostActiveMembers.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                Most Active Members
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {stats.mostActiveMembers.map((member, index) => (
                  <button
                    key={member.userId}
                    onClick={() => handleMemberClick(member.userId)}
                    className="w-full flex items-center justify-between p-3 rounded-lg hover:bg-[var(--surface-2)] transition-colors text-left"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold bg-[var(--club-accent,var(--primary))] text-white">
                        {index + 1}
                      </div>
                      <Avatar
                        src={member.avatarUrl || undefined}
                        fallback={member.displayName[0]}
                        size="sm"
                      />
                      <div>
                        <Text size="small" className="font-medium">
                          {member.displayName}
                        </Text>
                        <Text size="tiny" muted>
                          <NumberFlow value={member.nominations} /> nominations •{" "}
                          <NumberFlow value={member.ratings} /> ratings
                          {member.festivalsWon > 0 && (
                            <>
                              {" "}
                              • <NumberFlow value={member.festivalsWon} />{" "}
                              {member.festivalsWon === 1 ? "win" : "wins"}
                            </>
                          )}
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
