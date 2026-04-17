"use server";

/**
 * Club Ownership Actions
 *
 * Server actions for transferring ownership and deleting clubs.
 * These actions require producer (owner) permissions.
 */

import { createClient } from "@/lib/supabase/server";
import { invalidateClub } from "@/lib/cache/invalidate";
import { checkProducerPermission, checkMembership } from "./_helpers";

export async function transferOwnership(clubId: string, newOwnerId: string) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { error: "You must be signed in" };
  }

  // Check user is producer
  const isProducer = await checkProducerPermission(supabase, clubId, user.id);
  if (!isProducer) {
    return { error: "Only the club producer can transfer ownership" };
  }

  // Check new owner is a member
  const { isMember } = await checkMembership(supabase, clubId, newOwnerId);
  if (!isMember) {
    return { error: "New owner must be a member of the club" };
  }

  // Update club producer_id
  const { error: clubError } = await supabase
    .from("clubs")
    .update({ producer_id: newOwnerId })
    .eq("id", clubId);

  if (clubError) {
    return { error: clubError.message };
  }

  // Update old producer to director, new owner to producer
  const [oldOwnerResult, newOwnerResult] = await Promise.all([
    supabase
      .from("club_members")
      .update({ role: "director" })
      .eq("club_id", clubId)
      .eq("user_id", user.id),
    supabase
      .from("club_members")
      .update({ role: "producer" })
      .eq("club_id", clubId)
      .eq("user_id", newOwnerId),
  ]);

  if (oldOwnerResult.error) return { error: oldOwnerResult.error.message };
  if (newOwnerResult.error) return { error: newOwnerResult.error.message };

  invalidateClub(clubId);
  return { success: true };
}

export async function deleteClub(clubId: string) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { error: "You must be signed in" };
  }

  // Check user is producer
  const isProducer = await checkProducerPermission(supabase, clubId, user.id);
  if (!isProducer) {
    return { error: "Only the club producer can delete the club" };
  }

  // 1. Delete storage files (club backgrounds)
  const { data: backgroundFiles } = await supabase.storage.from("club-backgrounds").list(clubId);

  if (backgroundFiles?.length) {
    await supabase.storage
      .from("club-backgrounds")
      .remove(backgroundFiles.map((f) => `${clubId}/${f.name}`));
  }

  // 2. Delete storage files (club pictures)
  const { data: pictureFiles } = await supabase.storage.from("club-pictures").list(clubId);

  if (pictureFiles?.length) {
    await supabase.storage
      .from("club-pictures")
      .remove(pictureFiles.map((f) => `${clubId}/${f.name}`));
  }

  // 3. Delete background_images records (TEXT entity_id, no cascade)
  await supabase
    .from("background_images")
    .delete()
    .eq("entity_type", "club")
    .eq("entity_id", clubId);

  // 4. Hard delete the club (cascades to all related tables)
  const { error } = await supabase.from("clubs").delete().eq("id", clubId);

  if (error) {
    return { error: error.message };
  }

  invalidateClub(clubId);
  return { success: true };
}
