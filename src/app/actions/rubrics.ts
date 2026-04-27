"use server";

import { createClient } from "@/lib/supabase/server";
import { invalidateMember, invalidateUser } from "@/lib/cache/invalidate";
import { actionRateLimit } from "@/lib/security/action-rate-limit";
import { requireVerifiedEmail } from "@/lib/security/require-verified-email";
import type { RatingRubric } from "@/types/club-settings";
import type { UserRubric, FestivalRubricLock, ActionResult } from "./rubrics.types";

// ============================================================================
// User Rubric CRUD Actions
// ============================================================================

/**
 * Get all rubrics for the current user
 */
export async function getUserRubrics(): Promise<ActionResult<UserRubric[]>> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { error: "You must be signed in" };
  }

  const { data, error } = await supabase
    .from("user_rubrics")
    .select("id, user_id, name, categories, is_default, created_at, updated_at")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  if (error) {
    return { error: error.message };
  }

  return { success: true, data: data as UserRubric[] };
}

/**
 * Get a single rubric by ID
 */
export async function getRubric(rubricId: string): Promise<ActionResult<UserRubric>> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { error: "You must be signed in" };
  }

  const { data, error } = await supabase
    .from("user_rubrics")
    .select("id, user_id, name, categories, is_default, created_at, updated_at")
    .eq("id", rubricId)
    .eq("user_id", user.id)
    .single();

  if (error) {
    return { error: error.message };
  }

  return { success: true, data: data as UserRubric };
}

/**
 * Create a new rubric
 */
export async function createRubric(
  name: string,
  categories: RatingRubric[],
  isDefault: boolean = false
): Promise<ActionResult<UserRubric>> {
  const rateCheck = await actionRateLimit("createRubric", { limit: 10, windowMs: 60_000 });
  if (!rateCheck.success) return { error: rateCheck.error };

  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { error: "You must be signed in" };
  }

  const verified = requireVerifiedEmail(user);
  if (!verified.ok) return { error: verified.error };

  // Validate categories
  if (!name.trim()) {
    return { error: "Rubric name is required" };
  }

  if (categories.length === 0) {
    return { error: "At least one category is required" };
  }

  const totalWeight = categories.reduce((sum, c) => sum + c.weight, 0);
  if (Math.abs(totalWeight - 100) > 0.01) {
    return { error: "Category weights must total 100%" };
  }

  const hasEmptyNames = categories.some((c) => !c.name.trim());
  if (hasEmptyNames) {
    return { error: "All categories must have a name" };
  }

  const { data, error } = await supabase
    .from("user_rubrics")
    .insert({
      user_id: user.id,
      name: name.trim(),
      categories,
      is_default: isDefault,
    })
    .select()
    .single();

  if (error) {
    return { error: error.message };
  }

  invalidateUser(user.id);
  return { success: true, data: data as UserRubric };
}

/**
 * Update an existing rubric
 */
export async function updateRubric(
  rubricId: string,
  updates: {
    name?: string;
    categories?: RatingRubric[];
    is_default?: boolean;
  }
): Promise<ActionResult<UserRubric>> {
  const rateCheck = await actionRateLimit("updateRubric", { limit: 20, windowMs: 60_000 });
  if (!rateCheck.success) return { error: rateCheck.error };

  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { error: "You must be signed in" };
  }

  const verified = requireVerifiedEmail(user);
  if (!verified.ok) return { error: verified.error };

  // Validate if categories are being updated
  if (updates.categories) {
    const totalWeight = updates.categories.reduce((sum, c) => sum + c.weight, 0);
    if (Math.abs(totalWeight - 100) > 0.01) {
      return { error: "Category weights must total 100%" };
    }

    const hasEmptyNames = updates.categories.some((c) => !c.name.trim());
    if (hasEmptyNames) {
      return { error: "All categories must have a name" };
    }
  }

  if (updates.name !== undefined && !updates.name.trim()) {
    return { error: "Rubric name is required" };
  }

  const { data, error } = await supabase
    .from("user_rubrics")
    .update({
      ...updates,
      name: updates.name?.trim(),
      updated_at: new Date().toISOString(),
    })
    .eq("id", rubricId)
    .eq("user_id", user.id)
    .select()
    .single();

  if (error) {
    return { error: error.message };
  }

  invalidateUser(user.id);
  return { success: true, data: data as UserRubric };
}

/**
 * Delete a rubric
 */
export async function deleteRubric(rubricId: string): Promise<ActionResult> {
  const rateCheck = await actionRateLimit("deleteRubric", { limit: 20, windowMs: 60_000 });
  if (!rateCheck.success) return { error: rateCheck.error };

  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { error: "You must be signed in" };
  }

  const verified = requireVerifiedEmail(user);
  if (!verified.ok) return { error: verified.error };

  const { error } = await supabase
    .from("user_rubrics")
    .delete()
    .eq("id", rubricId)
    .eq("user_id", user.id);

  if (error) {
    return { error: error.message };
  }

  invalidateUser(user.id);
  return { success: true };
}

/**
 * Duplicate an existing rubric
 */
export async function duplicateRubric(rubricId: string): Promise<ActionResult<UserRubric>> {
  const rateCheck = await actionRateLimit("duplicateRubric", { limit: 10, windowMs: 60_000 });
  if (!rateCheck.success) return { error: rateCheck.error };

  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { error: "You must be signed in" };
  }

  const verified = requireVerifiedEmail(user);
  if (!verified.ok) return { error: verified.error };

  // Get the original rubric
  const { data: original, error: fetchError } = await supabase
    .from("user_rubrics")
    .select("id, user_id, name, categories, is_default, created_at, updated_at")
    .eq("id", rubricId)
    .eq("user_id", user.id)
    .single();

  if (fetchError || !original) {
    return { error: "Rubric not found" };
  }

  // Create a copy with new IDs for categories
  const newCategories = (original.categories as RatingRubric[]).map((c) => ({
    ...c,
    id: `category-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
  }));

  // Smart copy naming: strip existing (Copy) / (Copy N) suffix, then find next number
  const baseName = (original.name as string).replace(/\s*\(Copy(?:\s+\d+)?\)$/, "").trim();

  // Query existing rubrics to find the highest copy number
  const { data: existingRubrics, error: existingError } = await supabase
    .from("user_rubrics")
    .select("name")
    .eq("user_id", user.id)
    .like("name", `${baseName} (Copy%`);

  if (existingError) {
    console.error("Failed to check existing rubric copies:", existingError);
    return { error: "Failed to check existing rubric names" };
  }

  let copyName: string;
  if (!existingRubrics || existingRubrics.length === 0) {
    // Also check if plain "(Copy)" exists
    const { data: exactMatch, error: exactMatchError } = await supabase
      .from("user_rubrics")
      .select("name")
      .eq("user_id", user.id)
      .eq("name", `${baseName} (Copy)`);

    if (exactMatchError) {
      console.error("Failed to check exact copy match:", exactMatchError);
      return { error: "Failed to check rubric names" };
    }

    copyName = exactMatch && exactMatch.length > 0 ? `${baseName} (Copy 2)` : `${baseName} (Copy)`;
  } else {
    // Find the highest copy number
    let maxNum = 1; // "(Copy)" counts as 1
    for (const r of existingRubrics) {
      const match = (r.name as string).match(/\(Copy(?:\s+(\d+))?\)$/);
      if (match) {
        const num = match[1] ? parseInt(match[1], 10) : 1;
        if (num > maxNum) maxNum = num;
      }
    }
    copyName = `${baseName} (Copy ${maxNum + 1})`;
  }

  const { data, error } = await supabase
    .from("user_rubrics")
    .insert({
      user_id: user.id,
      name: copyName,
      categories: newCategories,
      is_default: false,
    })
    .select()
    .single();

  if (error) {
    return { error: error.message };
  }

  invalidateUser(user.id);
  return { success: true, data: data as UserRubric };
}

/**
 * Set a rubric as the default
 */
export async function setDefaultRubric(rubricId: string): Promise<ActionResult> {
  const rateCheck = await actionRateLimit("setDefaultRubric", { limit: 20, windowMs: 60_000 });
  if (!rateCheck.success) return { error: rateCheck.error };

  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { error: "You must be signed in" };
  }

  const verified = requireVerifiedEmail(user);
  if (!verified.ok) return { error: verified.error };

  const { error } = await supabase
    .from("user_rubrics")
    .update({ is_default: true, updated_at: new Date().toISOString() })
    .eq("id", rubricId)
    .eq("user_id", user.id);

  if (error) {
    return { error: error.message };
  }

  invalidateUser(user.id);
  return { success: true };
}

/**
 * Create a rubric from a preset template
 */
export async function createRubricFromPreset(
  presetId: string,
  customName?: string
): Promise<ActionResult<UserRubric>> {
  // Rate limit + email gate are enforced inside createRubric below.

  const { PRESET_RUBRICS, createRubricsFromPreset } = await import("@/types/club-settings");

  const preset = PRESET_RUBRICS.find((p) => p.id === presetId);
  if (!preset) {
    return { error: "Preset not found" };
  }

  const categories = createRubricsFromPreset(preset);
  const name = customName?.trim() || preset.name;

  return createRubric(name, categories, false);
}

// ============================================================================
// Festival Rubric Lock Actions
// ============================================================================

/**
 * Get the rubric lock for a user in a festival
 */
export async function getFestivalRubricLock(
  festivalId: string
): Promise<ActionResult<FestivalRubricLock | null>> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { error: "You must be signed in" };
  }

  const { data, error } = await supabase
    .from("festival_rubric_locks")
    .select(
      "id, festival_id, user_id, rubric_id, rubric_snapshot, use_club_rubric, opted_out, dont_ask_again, locked_at"
    )
    .eq("festival_id", festivalId)
    .eq("user_id", user.id)
    .maybeSingle();

  if (error) {
    return { error: error.message };
  }

  return { success: true, data: data as FestivalRubricLock | null };
}

/**
 * Lock a rubric choice for a festival
 */
export async function lockFestivalRubric(
  festivalId: string,
  options: {
    rubricId?: string; // Personal rubric ID
    useClubRubric?: boolean; // Use club's rubric
    optOut?: boolean; // Use simple rating
    dontAskAgain?: boolean;
  }
): Promise<ActionResult<FestivalRubricLock>> {
  const rateCheck = await actionRateLimit("lockFestivalRubric", { limit: 10, windowMs: 60_000 });
  if (!rateCheck.success) return { error: rateCheck.error };

  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { error: "You must be signed in" };
  }

  const verified = requireVerifiedEmail(user);
  if (!verified.ok) return { error: verified.error };

  // Verify user is a member of the club for this festival
  const { data: festival, error: festivalError } = await supabase
    .from("festivals")
    .select("id, club_id")
    .eq("id", festivalId)
    .single();

  if (festivalError || !festival) {
    return { error: "Festival not found" };
  }

  const { data: membership, error: membershipError } = await supabase
    .from("club_members")
    .select("user_id")
    .eq("club_id", festival.club_id)
    .eq("user_id", user.id)
    .maybeSingle();

  if (membershipError) {
    console.error("Failed to check club membership for rubric lock:", membershipError);
    return { error: "Failed to verify club membership" };
  }

  if (!membership) {
    return { error: "You must be a member of this club" };
  }

  // Check if already locked
  const { data: existingLock, error: lockCheckError } = await supabase
    .from("festival_rubric_locks")
    .select("id")
    .eq("festival_id", festivalId)
    .eq("user_id", user.id)
    .maybeSingle();

  if (lockCheckError) {
    console.error("Failed to check existing rubric lock:", lockCheckError);
    return { error: "Failed to check existing rubric lock" };
  }

  if (existingLock) {
    return { error: "Rubric choice already locked for this festival" };
  }

  const { data, error } = await supabase
    .from("festival_rubric_locks")
    .insert({
      festival_id: festivalId,
      user_id: user.id,
      rubric_id: options.rubricId || null,
      use_club_rubric: options.useClubRubric || false,
      opted_out: options.optOut || false,
      dont_ask_again: options.dontAskAgain || false,
    })
    .select()
    .single();

  if (error) {
    return { error: error.message };
  }

  return { success: true, data: data as FestivalRubricLock };
}

/**
 * Check if user has "don't ask again" preference set
 */
export async function getUserRubricPreference(): Promise<ActionResult<{ dontAskAgain: boolean }>> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { error: "You must be signed in" };
  }

  // Check their most recent lock for dont_ask_again
  const { data, error } = await supabase
    .from("festival_rubric_locks")
    .select("dont_ask_again")
    .eq("user_id", user.id)
    .eq("dont_ask_again", true)
    .limit(1)
    .maybeSingle();

  if (error) {
    console.error("Failed to check rubric preference:", error);
    return { error: "Failed to check rubric preference" };
  }

  return {
    success: true,
    data: { dontAskAgain: !!data },
  };
}

/**
 * Update club member's selected rubric for a club
 */
export async function updateClubRubricSelection(
  clubId: string,
  rubricId: string | null // null = use club rubric or no rubric
): Promise<ActionResult> {
  const rateCheck = await actionRateLimit("updateClubRubricSelection", {
    limit: 30,
    windowMs: 60_000,
  });
  if (!rateCheck.success) return { error: rateCheck.error };

  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { error: "You must be signed in" };
  }

  const verified = requireVerifiedEmail(user);
  if (!verified.ok) return { error: verified.error };

  // Get current preferences
  const { data: membership, error: fetchError } = await supabase
    .from("club_members")
    .select("preferences")
    .eq("club_id", clubId)
    .eq("user_id", user.id)
    .maybeSingle();

  if (fetchError || !membership) {
    return { error: "You must be a member of this club" };
  }

  const currentPreferences = (membership.preferences as Record<string, unknown>) || {};

  const { error } = await supabase
    .from("club_members")
    .update({
      preferences: {
        ...currentPreferences,
        selected_rubric_id: rubricId,
      },
    })
    .eq("club_id", clubId)
    .eq("user_id", user.id);

  if (error) {
    return { error: error.message };
  }

  return { success: true };
}

// ============================================================================
// Per-Club Rubric Preferences
// ============================================================================

/**
 * Get the default rubric preference for a specific club
 */
export async function getClubRubricPreference(
  clubId: string
): Promise<ActionResult<{ default_rubric_id: string | null }>> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { error: "You must be signed in" };
  }

  const { data: membership, error } = await supabase
    .from("club_members")
    .select("preferences")
    .eq("club_id", clubId)
    .eq("user_id", user.id)
    .maybeSingle();

  if (error) {
    return { error: error.message };
  }

  if (!membership) {
    return { error: "You are not a member of this club" };
  }

  const preferences = (membership.preferences as Record<string, unknown>) || {};
  const defaultRubricId = (preferences.default_rubric_id as string) || null;

  return { success: true, data: { default_rubric_id: defaultRubricId } };
}

/**
 * Set the default rubric preference for a specific club
 */
export async function setClubRubricPreference(
  clubId: string,
  rubricId: string | null
): Promise<ActionResult> {
  const rateCheck = await actionRateLimit("setClubRubricPreference", {
    limit: 30,
    windowMs: 60_000,
  });
  if (!rateCheck.success) return { error: rateCheck.error };

  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { error: "You must be signed in" };
  }

  const verified = requireVerifiedEmail(user);
  if (!verified.ok) return { error: verified.error };

  // Get current preferences
  const { data: membership, error: fetchError } = await supabase
    .from("club_members")
    .select("preferences")
    .eq("club_id", clubId)
    .eq("user_id", user.id)
    .maybeSingle();

  if (fetchError || !membership) {
    return { error: "You are not a member of this club" };
  }

  const currentPreferences = (membership.preferences as Record<string, unknown>) || {};

  const { error } = await supabase
    .from("club_members")
    .update({
      preferences: {
        ...currentPreferences,
        default_rubric_id: rubricId,
      },
    })
    .eq("club_id", clubId)
    .eq("user_id", user.id);

  if (error) {
    return { error: error.message };
  }

  invalidateMember(clubId, user.id);
  return { success: true };
}

/**
 * Get all club rubric preferences for the current user
 */
export async function getAllClubRubricPreferences(): Promise<
  ActionResult<
    Array<{
      club_id: string;
      club_name: string;
      club_slug: string | null;
      default_rubric_id: string | null;
    }>
  >
> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { error: "You must be signed in" };
  }

  const { data: memberships, error } = await supabase
    .from("club_members")
    .select(
      `
      preferences,
      clubs:club_id (
        id,
        name,
        slug
      )
    `
    )
    .eq("user_id", user.id);

  if (error) {
    return { error: error.message };
  }

  const result = (memberships || [])
    .map((m) => {
      const club = Array.isArray(m.clubs) ? m.clubs[0] : m.clubs;
      const preferences = (m.preferences as Record<string, unknown>) || {};
      return {
        club_id: club?.id || "",
        club_name: club?.name || "",
        club_slug: club?.slug || null,
        default_rubric_id: (preferences.default_rubric_id as string) || null,
      };
    })
    .filter((c) => c.club_id);

  return { success: true, data: result };
}
