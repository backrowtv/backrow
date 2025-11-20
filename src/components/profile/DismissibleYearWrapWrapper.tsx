import { getUserYearWrapStats } from "@/app/actions/profile";
import { getDismissedHints } from "@/app/actions/dismissed-hints";
import { DismissibleYearWrap } from "./DismissibleYearWrap";

interface DismissibleYearWrapWrapperProps {
  userId: string;
  year: number;
}

export async function DismissibleYearWrapWrapper({
  userId,
  year,
}: DismissibleYearWrapWrapperProps) {
  const [result, dismissedHints] = await Promise.all([
    getUserYearWrapStats(userId, year),
    getDismissedHints(),
  ]);

  const initialDismissed = !!dismissedHints[`year-wrap-${year}`];

  if ("error" in result && result.error) {
    return (
      <DismissibleYearWrap
        year={year}
        stats={{ moviesWatched: 0, festivalsWon: 0, topGenres: [], averageRating: 0 }}
        error={result.error}
        initialDismissed={initialDismissed}
      />
    );
  }

  const stats = result.data || {
    moviesWatched: 0,
    festivalsWon: 0,
    topGenres: [],
    averageRating: 0,
  };

  return <DismissibleYearWrap year={year} stats={stats} initialDismissed={initialDismissed} />;
}
