"use server";

/**
 * Club Admin Actions
 *
 * Administrative operations for clubs, including slug management.
 */

import { createClient } from "@/lib/supabase/server";
import { invalidateClub, invalidateDiscover } from "@/lib/cache/invalidate";
import { generateClubSlug } from "./_helpers";

/**
 * Fix club slug to match club name
 * Call this to sync the slug after renaming a club
 */
export async function fixClubSlug(clubId: string) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { error: "Not authenticated" };
  }

  // Get the club
  const { data: club, error: clubError } = await supabase
    .from("clubs")
    .select("id, name, slug")
    .eq("id", clubId)
    .single();

  if (clubError || !club) {
    return { error: "Club not found" };
  }

  // Generate correct slug from current name
  const correctSlug = generateClubSlug(club.name);

  // Update if different
  if (club.slug !== correctSlug) {
    const { error } = await supabase.from("clubs").update({ slug: correctSlug }).eq("id", clubId);

    if (error) {
      return { error: error.message };
    }

    invalidateClub(clubId);

    return { success: true, oldSlug: club.slug, newSlug: correctSlug };
  }

  return { success: true, message: "Slug already correct", slug: club.slug };
}

/**
 * Fix all club slugs to match their names
 */
export async function fixAllClubSlugs() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { error: "Not authenticated" };
  }

  // Get all clubs
  const { data: clubs, error: clubsError } = await supabase.from("clubs").select("id, name, slug");

  if (clubsError || !clubs) {
    return { error: "Failed to fetch clubs" };
  }

  const updates: Array<{ id: string; oldSlug: string; newSlug: string }> = [];

  for (const club of clubs) {
    const correctSlug = generateClubSlug(club.name);
    if (club.slug !== correctSlug) {
      const { error } = await supabase
        .from("clubs")
        .update({ slug: correctSlug })
        .eq("id", club.id);

      if (!error) {
        updates.push({ id: club.id, oldSlug: club.slug || "", newSlug: correctSlug });
      }
    }
  }

  for (const u of updates) invalidateClub(u.id);
  invalidateDiscover();

  return { success: true, updated: updates };
}
