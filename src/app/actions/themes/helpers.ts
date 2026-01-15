/**
 * Theme Helpers
 *
 * Shared utilities for theme actions.
 * NOTE: No 'use server' - these are internal helpers, not exposed server actions.
 */

import type { SupabaseClient } from "@supabase/supabase-js";

// Maximum length for theme names
export const MAX_THEME_LENGTH = 50;

// Helper function to get club slug from club ID
export async function getClubSlug(supabase: SupabaseClient, clubId: string): Promise<string> {
  const { data: club } = await supabase.from("clubs").select("slug").eq("id", clubId).maybeSingle();
  return club?.slug || clubId;
}

// Helper function to get festival slug from festival ID
export async function getFestivalSlug(
  supabase: SupabaseClient,
  festivalId: string
): Promise<string> {
  const { data: festival } = await supabase
    .from("festivals")
    .select("slug")
    .eq("id", festivalId)
    .maybeSingle();
  return festival?.slug || festivalId;
}

// Generate a unique slug for a festival within a club
export async function generateUniqueSlug(
  supabase: SupabaseClient,
  inputText: string,
  clubId: string,
  festivalId: string
): Promise<string> {
  const { data: slugResult } = await supabase.rpc("generate_slug", {
    input_text: inputText,
  });

  const baseSlug =
    slugResult ||
    inputText
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "");

  let finalSlug = baseSlug;
  let slugSuffix = 1;
  let isUnique = false;

  while (!isUnique && slugSuffix < 100) {
    const { data: existingFestival } = await supabase
      .from("festivals")
      .select("id")
      .eq("club_id", clubId)
      .eq("slug", finalSlug)
      .neq("id", festivalId)
      .maybeSingle();

    if (!existingFestival) {
      isUnique = true;
    } else {
      finalSlug = `${baseSlug}-${slugSuffix}`;
      slugSuffix++;
    }
  }

  return finalSlug;
}
