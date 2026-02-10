"use client";

import { useEffect, useState } from "react";
import { SimpleChartLine } from "@/components/ui/charts";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/shared/EmptyState";
import { TrendUp } from "@phosphor-icons/react";
import { getRatingTrendsData } from "@/app/actions/stats";
import type { RatingTrendsData } from "@/app/actions/stats.types";

interface RatingTrendsChartProps {
  clubId: string;
}

export function RatingTrendsChart({ clubId }: RatingTrendsChartProps) {
  const [data, setData] = useState<RatingTrendsData[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchData() {
      try {
        setLoading(true);
        setError(null);
        const result = await getRatingTrendsData(clubId);
        if ("error" in result) {
          setError(result.error);
        } else {
          setData(result.data);
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load data");
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, [clubId]);

  if (loading) {
    return (
      <div className="w-full p-6 bg-[var(--surface-1)] border border-[var(--border)] rounded-xl">
        <Skeleton className="h-6 w-48 mb-4" />
        <Skeleton className="h-[300px] w-full" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="w-full p-6 bg-[var(--surface-1)] border border-[var(--border)] rounded-xl">
        <p className="text-sm text-[var(--destructive)]">{error}</p>
      </div>
    );
  }

  if (!data || data.length === 0) {
    return (
      <EmptyState
        icon={TrendUp}
        title="No ratings yet"
        message="Rating trends will appear here once members start rating movies."
        variant="inline"
      />
    );
  }

  return (
    <SimpleChartLine
      data={data}
      dataKey="avgRating"
      nameKey="month"
      color="accent"
      title="Rating Trends"
      description="Average rating over time"
    />
  );
}
