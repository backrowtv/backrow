"use server";

import { createClient } from "@/lib/supabase/server";
import { handleActionError } from "@/lib/errors/handler";
import type { DiscoverFiltersState } from "@/lib/discover/filters";

/**
 * Track filter usage for analytics
 */
export async function trackFilterUsage(
  filters: DiscoverFiltersState,
  resultCount: number,
  userId?: string | null
): Promise<{ success: boolean } | { error: string }> {
  try {
    const supabase = await createClient();

    // Prepare filter combination data
    const filterCombination = {
      privacy: filters.privacy,
      minMembers: filters.minMembers,
    };

    // Insert analytics record
    const { error } = await supabase.from("filter_analytics").insert({
      user_id: userId || null,
      filter_combination: filterCombination,
      result_count: resultCount,
    });

    if (error) {
      // Don't fail the request if analytics fails
      return {
        success: false,
        ...handleActionError(error, { action: "trackFilterUsage", silent: true }),
      };
    }

    return { success: true };
  } catch (error) {
    // Don't fail the request if analytics fails
    return {
      success: false,
      ...handleActionError(error, { action: "trackFilterUsage", silent: true }),
    };
  }
}

/**
 * Get popular filter combinations (admin only)
 */
export async function getPopularFilterCombinations(
  limit: number = 10
): Promise<
  | { data: Array<{ combination: DiscoverFiltersState; count: number; avgResults: number }> }
  | { error: string }
> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return { error: "You must be signed in" };
    }

    // Check if user is admin (simplified - you may want to add proper admin check)
    // For now, we'll use a simple check - you can enhance this later

    // Get popular combinations using aggregation
    const { data, error } = await supabase
      .from("filter_analytics")
      .select("filter_combination, result_count")
      .order("created_at", { ascending: false })
      .limit(1000); // Get recent 1000 records for analysis

    if (error) {
      return { error: error.message };
    }

    // Aggregate by filter combination
    const combinationMap = new Map<string, { count: number; totalResults: number }>();

    data?.forEach((record) => {
      const key = JSON.stringify(record.filter_combination);
      const existing = combinationMap.get(key) || { count: 0, totalResults: 0 };
      combinationMap.set(key, {
        count: existing.count + 1,
        totalResults: existing.totalResults + record.result_count,
      });
    });

    // Convert to array and sort by count
    const popular = Array.from(combinationMap.entries())
      .map(([key, stats]) => ({
        combination: JSON.parse(key) as DiscoverFiltersState,
        count: stats.count,
        avgResults: Math.round(stats.totalResults / stats.count),
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, limit);

    return { data: popular };
  } catch (error) {
    return handleActionError(error, "getPopularFilterCombinations");
  }
}

/**
 * Get "no results" filter combinations (admin only)
 */
export async function getNoResultsFilters(
  limit: number = 10
): Promise<
  { data: Array<{ combination: DiscoverFiltersState; count: number }> } | { error: string }
> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return { error: "You must be signed in" };
    }

    // Get no-results combinations
    const { data, error } = await supabase
      .from("filter_analytics")
      .select("filter_combination")
      .eq("has_results", false)
      .order("created_at", { ascending: false })
      .limit(1000);

    if (error) {
      return { error: error.message };
    }

    // Aggregate by filter combination
    const combinationMap = new Map<string, number>();

    data?.forEach((record) => {
      const key = JSON.stringify(record.filter_combination);
      combinationMap.set(key, (combinationMap.get(key) || 0) + 1);
    });

    // Convert to array and sort by count
    const noResults = Array.from(combinationMap.entries())
      .map(([key, count]) => ({
        combination: JSON.parse(key) as DiscoverFiltersState,
        count,
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, limit);

    return { data: noResults };
  } catch (error) {
    return handleActionError(error, "getNoResultsFilters");
  }
}
