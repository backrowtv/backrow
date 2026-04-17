"use server";

/**
 * Club Announcements Actions
 *
 * Server actions for creating, updating, and deleting club announcements.
 */

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { getClubSlug, checkAdminPermission } from "./_helpers";
import { logClubActivity } from "@/lib/activity/logger";
import { sanitizeForStorage } from "@/lib/security/sanitize";
import { handleActionError } from "@/lib/errors/handler";
import { actionRateLimit } from "@/lib/security/action-rate-limit";
import { requireVerifiedEmail } from "@/lib/security/require-verified-email";
import { enqueueNotificationFanout } from "@/lib/jobs/producers";
import { dedupKey } from "@/lib/jobs/dedup";
import {
  parseCreateAnnouncementFormData,
  parseCreateRichAnnouncementFormData,
  UpdateAnnouncementSchema,
  UUIDSchema,
} from "@/lib/validation/server-actions";

export async function createAnnouncement(prevState: unknown, formData: FormData) {
  const rateCheck = await actionRateLimit("createAnnouncement", { limit: 10, windowMs: 60_000 });
  if (!rateCheck.success) return { error: rateCheck.error };

  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { error: "You must be signed in" };
  }

  const emailGate = requireVerifiedEmail(user);
  if (!emailGate.ok) return { error: emailGate.error };

  // Validate input with Zod
  const parseResult = parseCreateAnnouncementFormData(formData);
  if (!parseResult.success) {
    return { error: parseResult.error };
  }

  const { clubId, title, message, expiresAt } = parseResult.data;

  // Check admin permissions
  const { isAdmin } = await checkAdminPermission(supabase, clubId, user.id);
  if (!isAdmin) {
    return { error: "You do not have permission to create announcements" };
  }

  const { data, error } = await supabase
    .from("club_announcements")
    .insert({
      club_id: clubId,
      user_id: user.id,
      title: title.trim(),
      message: message.trim(),
      expires_at: expiresAt || null,
    })
    .select(
      "id, club_id, user_id, title, message, content_html, image_url, image_opacity, announcement_type, expires_at, created_at"
    )
    .single();

  if (error) {
    return { error: error.message };
  }

  // Log activity
  await logClubActivity(clubId, "announcement_posted", {
    announcement_title: title.trim(),
  });

  // Notify all club members about the new announcement
  const { data: members } = await supabase
    .from("club_members")
    .select("user_id")
    .eq("club_id", clubId)
    .neq("user_id", user.id); // Don't notify the creator

  if (members && members.length > 0) {
    const clubSlugForLink = await getClubSlug(supabase, clubId);
    await enqueueNotificationFanout({
      dedupId: dedupKey("announcement", data.id),
      userIds: members.map((m) => m.user_id),
      type: "announcement",
      title: "New Announcement",
      message: `${title.trim()}`,
      link: `/club/${clubSlugForLink}`,
      clubId,
    });
  }

  const clubSlug = await getClubSlug(supabase, clubId);
  revalidatePath(`/club/${clubSlug}`);
  return { success: true, data };
}

/**
 * Create a rich announcement with HTML content and optional image
 */
export async function createRichAnnouncement(prevState: unknown, formData: FormData) {
  const rateCheck = await actionRateLimit("createRichAnnouncement", {
    limit: 10,
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

  const emailGate = requireVerifiedEmail(user);
  if (!emailGate.ok) return { error: emailGate.error };

  // Validate input with Zod
  const parseResult = parseCreateRichAnnouncementFormData(formData);
  if (!parseResult.success) {
    return { error: parseResult.error };
  }

  const { clubId, title, contentHtml, imageUrl, imageOpacity, expiresAt } = parseResult.data;

  // Sanitize HTML content to prevent XSS attacks
  const safeContentHtml = sanitizeForStorage(contentHtml);

  // Check admin permissions
  const { isAdmin } = await checkAdminPermission(supabase, clubId, user.id);
  if (!isAdmin) {
    return { error: "You do not have permission to create announcements" };
  }

  // For rich announcements, we store the plain text version in 'message' for backwards compatibility
  // and the sanitized HTML in 'content_html'
  let plainTextMessage = safeContentHtml
    .replace(/<[^>]*>/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  // Truncate plain text message if too long
  if (plainTextMessage.length > 500) {
    plainTextMessage = plainTextMessage.substring(0, 497) + "...";
  }

  const { data, error } = await supabase
    .from("club_announcements")
    .insert({
      club_id: clubId,
      user_id: user.id,
      title: title.trim(),
      message: plainTextMessage || title.trim(),
      content_html: safeContentHtml,
      image_url: imageUrl || null,
      image_opacity: imageUrl ? imageOpacity : null,
      announcement_type: "rich",
      expires_at: expiresAt || null,
    })
    .select(
      "id, club_id, user_id, title, message, content_html, image_url, image_opacity, announcement_type, expires_at, created_at"
    )
    .single();

  if (error) {
    return handleActionError(error, "createRichAnnouncement");
  }

  // Log activity
  await logClubActivity(clubId, "announcement_posted", {
    announcement_title: title.trim(),
  });

  // Notify all club members about the new announcement
  const { data: members } = await supabase
    .from("club_members")
    .select("user_id")
    .eq("club_id", clubId)
    .neq("user_id", user.id); // Don't notify the creator

  if (members && members.length > 0) {
    const clubSlugForLink = await getClubSlug(supabase, clubId);
    await enqueueNotificationFanout({
      dedupId: dedupKey("announcement", data.id),
      userIds: members.map((m) => m.user_id),
      type: "announcement",
      title: "New Announcement",
      message: `${title.trim()}`,
      link: `/club/${clubSlugForLink}`,
      clubId,
    });
  }

  const clubSlug = await getClubSlug(supabase, clubId);
  revalidatePath(`/club/${clubSlug}`);
  revalidatePath(`/club/${clubSlug}/director/announcements`);
  return { success: true, data };
}

export async function updateAnnouncement(
  announcementId: string,
  title: string,
  message: string,
  expiresAt: string | null
) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { error: "You must be signed in" };
  }

  // Validate input with Zod
  const parseResult = UpdateAnnouncementSchema.safeParse({
    announcementId,
    title,
    message,
    expiresAt,
  });
  if (!parseResult.success) {
    return { error: parseResult.error.issues[0]?.message || "Invalid input" };
  }

  // Get announcement to check permissions
  const { data: announcement, error: announcementError } = await supabase
    .from("club_announcements")
    .select("club_id, user_id")
    .eq("id", announcementId)
    .single();

  if (announcementError || !announcement) {
    return { error: "Announcement not found" };
  }

  // Check admin permissions
  const { isAdmin } = await checkAdminPermission(supabase, announcement.club_id, user.id);
  if (!isAdmin) {
    return { error: "You do not have permission to update announcements" };
  }

  if (announcement.user_id !== user.id) {
    return { error: "You can only update your own announcements" };
  }

  const { error } = await supabase
    .from("club_announcements")
    .update({
      title: title.trim(),
      message: message.trim(),
      expires_at: expiresAt || null,
    })
    .eq("id", announcementId);

  if (error) {
    return { error: error.message };
  }

  const clubSlug = await getClubSlug(supabase, announcement.club_id);
  revalidatePath(`/club/${clubSlug}`);
  return { success: true };
}

export async function deleteAnnouncement(announcementId: string) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { error: "You must be signed in" };
  }

  // Validate input with Zod
  const parseResult = UUIDSchema.safeParse(announcementId);
  if (!parseResult.success) {
    return { error: "Invalid announcement ID" };
  }

  // Get announcement to check permissions
  const { data: announcement, error: announcementError } = await supabase
    .from("club_announcements")
    .select("club_id")
    .eq("id", announcementId)
    .single();

  if (announcementError || !announcement) {
    return { error: "Announcement not found" };
  }

  // Check admin permissions
  const { isAdmin } = await checkAdminPermission(supabase, announcement.club_id, user.id);
  if (!isAdmin) {
    return { error: "You do not have permission to delete announcements" };
  }

  const { error } = await supabase.from("club_announcements").delete().eq("id", announcementId);

  if (error) {
    return { error: error.message };
  }

  const clubSlug = await getClubSlug(supabase, announcement.club_id);
  revalidatePath(`/club/${clubSlug}`);
  return { success: true };
}
