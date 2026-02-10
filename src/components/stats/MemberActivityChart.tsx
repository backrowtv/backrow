"use client";

import { useEffect, useState } from "react";
import { SimpleBarChart } from "@/components/ui/charts";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/shared/EmptyState";
import { Users } from "@phosphor-icons/react";
import { getMemberActivityData } from "@/app/actions/stats";
import type { MemberActivityData } from "@/app/actions/stats.types";

interface MemberActivityChartProps {
  clubId: string;
}

export function MemberActivityChart({ clubId }: MemberActivityChartProps) {
  const [data, setData] = useState<MemberActivityData[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchData() {
      try {
        setLoading(true);
        setError(null);
        const result = await getMemberActivityData(clubId);
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
        icon={Users}
        title="No activity yet"
        message="Member activity will appear here once members start nominating and rating movies."
        variant="inline"
      />
    );
  }

  return (
    <SimpleBarChart
      data={data}
      dataKey="activity"
      nameKey="name"
      color="primary"
      title="Member Activity"
      description="Total nominations and ratings per member"
    />
  );
}
