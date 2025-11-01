"use server";

import { createClient } from "@/lib/supabase/server";
import { handleActionError } from "@/lib/errors/handler";
import type { DismissedHints } from "@/types/dismissed-hints";

/**
 * Get the current user's dismissed hints
 */
export async function getDismissedHints(): Promise<DismissedHints> {
  try {
    const supabase = await createClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return {};

    const { data, error } = await supabase
      .from("users")
      .select("dismissed_hints")
      .eq("id", user.id)
      .single();

    if (error || !data?.dismissed_hints) return {};
    return data.dismissed_hints as DismissedHints;
  } catch (error) {
    console.error("Error fetching dismissed hints:", error);
    return {};
  }
}

/**
 * Dismiss a single hint by key
 */
export async function dismissHint(key: string): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = await createClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return { success: false, error: "Not authenticated" };

    // Get current hints and merge
    const { data: userData } = await supabase
      .from("users")
      .select("dismissed_hints")
      .eq("id", user.id)
      .single();

    const current = (userData?.dismissed_hints as DismissedHints) || {};
    const updated = { ...current, [key]: true };

    const { error } = await supabase
      .from("users")
      .update({ dismissed_hints: updated })
      .eq("id", user.id);

    if (error) {
      const result = handleActionError(error, { action: "dismissHint" });
      return { success: false, error: result.error };
    }

    return { success: true };
  } catch (error) {
    const result = handleActionError(error, { action: "dismissHint" });
    return { success: false, error: result.error };
  }
}

/**
 * Bulk-dismiss multiple hints at once (for localStorage migration)
 */
export async function bulkDismissHints(
  keys: string[]
): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = await createClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return { success: false, error: "Not authenticated" };

    const { data: userData } = await supabase
      .from("users")
      .select("dismissed_hints")
      .eq("id", user.id)
      .single();

    const current = (userData?.dismissed_hints as DismissedHints) || {};
    const additions = Object.fromEntries(keys.map((k) => [k, true]));
    const updated = { ...current, ...additions };

    const { error } = await supabase
      .from("users")
      .update({ dismissed_hints: updated })
      .eq("id", user.id);

    if (error) {
      const result = handleActionError(error, { action: "bulkDismissHints" });
      return { success: false, error: result.error };
    }

    return { success: true };
  } catch (error) {
    const result = handleActionError(error, { action: "bulkDismissHints" });
    return { success: false, error: result.error };
  }
}
