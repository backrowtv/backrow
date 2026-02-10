"use client";

import { useEffect, useState } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from "recharts";
import { ChartContainer } from "@/components/ui/charts";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/shared/EmptyState";
import { FilmReel } from "@phosphor-icons/react";
import { getTopRatedMoviesData } from "@/app/actions/stats";
import type { TopRatedMovieData } from "@/app/actions/stats.types";

interface TopRatedMoviesChartProps {
  clubId: string;
}

export function TopRatedMoviesChart({ clubId }: TopRatedMoviesChartProps) {
  const [data, setData] = useState<TopRatedMovieData[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchData() {
      try {
        setLoading(true);
        setError(null);
        const result = await getTopRatedMoviesData(clubId);
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
        icon={FilmReel}
        title="No top rated movies yet"
        message="Top rated movies will appear here once movies have at least 3 ratings."
        variant="inline"
      />
    );
  }

  // Truncate long movie titles for display
  const chartData = data.map((movie) => ({
    ...movie,
    displayTitle: movie.title.length > 30 ? `${movie.title.substring(0, 30)}...` : movie.title,
  }));

  return (
    <ChartContainer
      title="Top Rated Movies"
      description="Top 10 movies by average rating (minimum 3 ratings)"
    >
      <ResponsiveContainer width="100%" height="100%">
        <BarChart
          data={chartData}
          layout="vertical"
          margin={{ top: 5, right: 30, left: 100, bottom: 5 }}
        >
          <CartesianGrid strokeDasharray="3 3" stroke="#3f3f46" />
          <XAxis type="number" stroke="#71717a" style={{ fontSize: "12px" }} domain={[0, 10]} />
          <YAxis
            type="category"
            dataKey="displayTitle"
            stroke="#71717a"
            style={{ fontSize: "12px" }}
            width={95}
          />
          <Tooltip
            contentStyle={{
              backgroundColor: "rgba(24, 24, 27, 0.95)",
              border: "1px solid rgba(255, 255, 255, 0.1)",
              borderRadius: "0.5rem",
              color: "#fafafa",
            }}
            formatter={(value) => [
              `${(value as number)?.toFixed(1) ?? "0"} / 10`,
              "Average Rating",
            ]}
            labelFormatter={(label) => `Movie: ${label}`}
          />
          <Bar dataKey="avgRating" radius={[0, 4, 4, 0]}>
            {chartData.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={index % 2 === 0 ? "#B86A8D" : "#4a9b8f"} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </ChartContainer>
  );
}
