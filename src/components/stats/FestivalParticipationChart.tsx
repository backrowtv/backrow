"use client";

import { useEffect, useState } from "react";
import { SimpleChartLine } from "@/components/ui/charts";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/shared/EmptyState";
import { CalendarBlank } from "@phosphor-icons/react";
import { getFestivalParticipationData } from "@/app/actions/stats";
import type { FestivalParticipationData } from "@/app/actions/stats.types";

interface FestivalParticipationChartProps {
  clubId: string;
}

export function FestivalParticipationChart({ clubId }: FestivalParticipationChartProps) {
  const [data, setData] = useState<FestivalParticipationData[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchData() {
      try {
        setLoading(true);
        setError(null);
        const result = await getFestivalParticipationData(clubId);
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
        icon={CalendarBlank}
        title="No festivals yet"
        message="Festival participation data will appear here once festivals are created."
        variant="inline"
      />
    );
  }

  return (
    <SimpleChartLine
      data={data}
      dataKey="count"
      nameKey="month"
      color="primary"
      title="Festival Participation Over Time"
      description="Number of festivals created each month"
    />
  );
}
