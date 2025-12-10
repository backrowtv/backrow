"use server";

/**
 * Club Archive Action
 *
 * Server action for archiving clubs (soft delete).
 */

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { logClubActivity, logMemberActivity } from "@/lib/activity/logger";
import { getClubSlug, checkProducerPermission } from "./_helpers";
import { createNotificationsForUsers } from "../notifications";

/**
 * Archive a club (soft delete)
 */
export async function archiveClub(clubId: string) {
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
    return { error: "Only the club producer can archive this club" };
  }

  // Update club to archived
  const { error } = await supabase
    .from("clubs")
    .update({ archived: true, updated_at: new Date().toISOString() })
    .eq("id", clubId);

  if (error) {
    return { error: error.message };
  }

  // Get club name for logging
  const { data: clubForLog } = await supabase
    .from("clubs")
    .select("name, slug")
    .eq("id", clubId)
    .single();

  // Log club activity (visible to members)
  await logClubActivity(clubId, "club_archived", {
    club_name: clubForLog?.name,
  });

  // Log member activity (for the producer who archived)
  await logMemberActivity(user.id, "user_archived_club", {
    club_id: clubId,
    club_name: clubForLog?.name,
    club_slug: clubForLog?.slug || clubId,
  });

  // Notify all club members about the archiving
  const { data: members } = await supabase
    .from("club_members")
    .select("user_id")
    .eq("club_id", clubId)
    .neq("user_id", user.id); // Don't notify the producer who archived it

  const { data: club } = await supabase.from("clubs").select("name").eq("id", clubId).single();

  if (members && members.length > 0) {
    await createNotificationsForUsers({
      userIds: members.map((m) => m.user_id),
      type: "club_archived",
      title: "Club Archived",
      message: `"${club?.name || "The club"}" has been archived.`,
      link: `/clubs`,
      clubId: clubId,
    });
  }

  const clubSlug = await getClubSlug(supabase, clubId);
  revalidatePath(`/club/${clubSlug}/settings`);
  revalidatePath(`/club/${clubSlug}`);
  revalidatePath("/");

  return { success: true };
}
