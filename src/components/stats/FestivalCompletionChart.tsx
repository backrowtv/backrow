"use client";

import { useEffect, useState } from "react";
import { SimpleChartPie } from "@/components/ui/charts";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/shared/EmptyState";
import { Trophy } from "@phosphor-icons/react";
import { getFestivalCompletionData } from "@/app/actions/stats";
import type { FestivalCompletionData } from "@/app/actions/stats.types";

interface FestivalCompletionChartProps {
  clubId: string;
}

export function FestivalCompletionChart({ clubId }: FestivalCompletionChartProps) {
  const [data, setData] = useState<FestivalCompletionData[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchData() {
      try {
        setLoading(true);
        setError(null);
        const result = await getFestivalCompletionData(clubId);
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

  if (!data || data.length === 0 || data.every((d) => d.value === 0)) {
    return (
      <EmptyState
        icon={Trophy}
        title="No festivals yet"
        message="Festival completion data will appear here once festivals are created."
        variant="inline"
      />
    );
  }

  return (
    <SimpleChartPie
      data={data}
      title="Festival Completion Rate"
      description="Completed vs incomplete festivals"
    />
  );
}
