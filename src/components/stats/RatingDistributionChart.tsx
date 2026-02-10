"use client";

import { useEffect, useState } from "react";
import { SimpleBarChart } from "@/components/ui/charts";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/shared/EmptyState";
import { Star } from "@phosphor-icons/react";
import { getRatingDistributionData } from "@/app/actions/stats";
import type { RatingDistributionData } from "@/app/actions/stats.types";

interface RatingDistributionChartProps {
  clubId: string;
}

export function RatingDistributionChart({ clubId }: RatingDistributionChartProps) {
  const [data, setData] = useState<RatingDistributionData[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchData() {
      try {
        setLoading(true);
        setError(null);
        const result = await getRatingDistributionData(clubId);
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

  if (!data || data.length === 0 || data.every((d) => d.count === 0)) {
    return (
      <EmptyState
        icon={Star}
        title="No ratings yet"
        message="Rating distribution will appear here once members start rating movies."
        variant="inline"
      />
    );
  }

  return (
    <SimpleBarChart
      data={data}
      dataKey="count"
      nameKey="range"
      color="accent"
      title="Movie Ratings Distribution"
      description="Number of ratings in each rating range"
    />
  );
}
