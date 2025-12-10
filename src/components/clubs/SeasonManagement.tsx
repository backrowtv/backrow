"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ConcludeSeasonButton } from "@/components/seasons/ConcludeSeasonButton";
import { DateDisplay } from "@/components/ui/date-display";
import { Text } from "@/components/ui/typography";

interface Season {
  id: string;
  slug?: string | null;
  name: string;
  subtitle: string | null;
  start_date: string;
  end_date: string;
}

interface SeasonManagementProps {
  clubId: string;
  seasons: Season[];
}

export function SeasonManagement({ clubId, seasons }: SeasonManagementProps) {
  const now = new Date();
  const activeSeason = seasons.find((season) => {
    const start = new Date(season.start_date);
    const end = new Date(season.end_date);
    return start <= now && end >= now;
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle>Current Season</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {activeSeason ? (
          <div>
            <div className="flex items-center gap-2 mb-2">
              <h3 className="font-semibold text-lg">{activeSeason.name}</h3>
            </div>
            {activeSeason.subtitle && (
              <p className="text-sm text-[var(--text-muted)] mb-4">{activeSeason.subtitle}</p>
            )}

            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-[var(--text-muted)]">Start Date:</span>
                <span>
                  <DateDisplay date={activeSeason.start_date} format="date" />
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-[var(--text-muted)]">End Date:</span>
                <span>
                  <DateDisplay date={activeSeason.end_date} format="date" />
                </span>
              </div>
            </div>
            <div className="mt-4 flex items-center gap-2">
              <ConcludeSeasonButton clubId={clubId} />
            </div>
          </div>
        ) : (
          <Text size="sm" muted>
            No active season. Create a new season to get started.
          </Text>
        )}
      </CardContent>
    </Card>
  );
}
