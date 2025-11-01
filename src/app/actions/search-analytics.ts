"use server";

import { createClient } from "@/lib/supabase/server";
import { handleActionError } from "@/lib/errors/handler";
import type { SearchFilterType } from "@/components/search/SearchInterface";
import type { SearchResults } from "./search.types";

/**
 * Track search query for analytics
 */
export async function trackSearchQuery(
  query: string,
  filters: SearchFilterType[] | null,
  results: SearchResults,
  userId?: string | null
): Promise<{ success: boolean } | { error: string }> {
  try {
    const supabase = await createClient();

    // Calculate total results
    const totalResults =
      results.movies.length +
      results.actors.length +
      results.directors.length +
      results.composers.length +
      results.notes.length +
      results.discussions.length;

    // Prepare result counts
    const resultCounts: Record<string, number> = {
      movies: results.movies.length,
      actors: results.actors.length,
      directors: results.directors.length,
      composers: results.composers.length,
      notes: results.notes.length,
      discussions: results.discussions.length,
    };

    // Insert analytics record
    const { error } = await supabase.from("search_analytics").insert({
      user_id: userId || null,
      query: query.trim(),
      filters: filters || null,
      result_counts: resultCounts,
      total_results: totalResults,
    });

    if (error) {
      // Don't fail the request if analytics fails
      return {
        success: false,
        ...handleActionError(error, { action: "trackSearchQuery", silent: true }),
      };
    }

    return { success: true };
  } catch (error) {
    // Don't fail the request if analytics fails
    return {
      success: false,
      ...handleActionError(error, { action: "trackSearchQuery", silent: true }),
    };
  }
}

/**
 * Get popular search queries (admin only)
 */
export async function getPopularSearchQueries(
  limit: number = 10
): Promise<
  { data: Array<{ query: string; count: number; avgResults: number }> } | { error: string }
> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return { error: "You must be signed in" };
    }

    // Get popular queries using aggregation
    const { data, error } = await supabase
      .from("search_analytics")
      .select("query, total_results")
      .order("created_at", { ascending: false })
      .limit(1000); // Get recent 1000 records for analysis

    if (error) {
      return { error: error.message };
    }

    // Aggregate by query
    const queryMap = new Map<string, { count: number; totalResults: number }>();

    data?.forEach((record) => {
      const existing = queryMap.get(record.query) || { count: 0, totalResults: 0 };
      queryMap.set(record.query, {
        count: existing.count + 1,
        totalResults: existing.totalResults + record.total_results,
      });
    });

    // Convert to array and sort by count
    const popular = Array.from(queryMap.entries())
      .map(([query, stats]) => ({
        query,
        count: stats.count,
        avgResults: Math.round(stats.totalResults / stats.count),
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, limit);

    return { data: popular };
  } catch (error) {
    return handleActionError(error, "getPopularSearchQueries");
  }
}

/**
 * Get "no results" search queries (admin only)
 */
export async function getNoResultsQueries(
  limit: number = 10
): Promise<{ data: Array<{ query: string; count: number }> } | { error: string }> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return { error: "You must be signed in" };
    }

    // Get no-results queries
    const { data, error } = await supabase
      .from("search_analytics")
      .select("query")
      .eq("has_results", false)
      .order("created_at", { ascending: false })
      .limit(1000);

    if (error) {
      return { error: error.message };
    }

    // Aggregate by query
    const queryMap = new Map<string, number>();

    data?.forEach((record) => {
      queryMap.set(record.query, (queryMap.get(record.query) || 0) + 1);
    });

    // Convert to array and sort by count
    const noResults = Array.from(queryMap.entries())
      .map(([query, count]) => ({ query, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, limit);

    return { data: noResults };
  } catch (error) {
    return handleActionError(error, "getNoResultsQueries");
  }
}
