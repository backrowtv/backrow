"use server";

/**
 * Season CRUD Operations
 *
 * Create, update, and delete season functionality.
 */

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { logClubActivity } from "@/lib/activity/logger";
import { createNotificationsForUsers } from "../notifications";
import { getClubSlug } from "../clubs/_helpers";

export async function createSeason(prevState: unknown, formData: FormData) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { error: "You must be signed in" };
  }

  const clubId = formData.get("clubId") as string;
  const name = formData.get("name") as string;
  const subtitle = formData.get("subtitle") as string | null;
  const startDate = formData.get("startDate") as string;
  const endDate = formData.get("endDate") as string;

  if (!clubId || !name || !startDate || !endDate) {
    return { error: "All required fields must be provided" };
  }

  // Check user is producer or director
  const { data: membership } = await supabase
    .from("club_members")
    .select("role")
    .eq("club_id", clubId)
    .eq("user_id", user.id)
    .maybeSingle();

  if (!membership || (membership.role !== "producer" && membership.role !== "director")) {
    return { error: "Only producers and directors can create seasons" };
  }

  // Validate dates
  const start = new Date(startDate);
  const end = new Date(endDate);

  if (isNaN(start.getTime()) || isNaN(end.getTime())) {
    return { error: "Invalid date format" };
  }

  if (start >= end) {
    return { error: "End date must be after start date" };
  }

  // Check for overlapping seasons
  const { data: overlappingSeasons } = await supabase
    .from("seasons")
    .select("id, name")
    .eq("club_id", clubId)
    .or(`and(start_date.lte.${endDate},end_date.gte.${startDate})`);

  if (overlappingSeasons && overlappingSeasons.length > 0) {
    return { error: "Seasons cannot overlap with existing seasons" };
  }

  // Create season
  const { data: season, error } = await supabase
    .from("seasons")
    .insert({
      club_id: clubId,
      name: name.trim(),
      subtitle: subtitle?.trim() || null,
      start_date: startDate,
      end_date: endDate,
    })
    .select()
    .single();

  if (error) {
    return { error: error.message };
  }

  await logClubActivity(clubId, "season_started", {
    season_name: season.name,
    season_id: season.id,
  });

  // Notify all club members about the new season
  const { data: members } = await supabase
    .from("club_members")
    .select("user_id")
    .eq("club_id", clubId)
    .neq("user_id", user.id); // Don't notify the creator

  if (members && members.length > 0) {
    const clubSlugForLink = await getClubSlug(supabase, clubId);
    await createNotificationsForUsers({
      userIds: members.map((m) => m.user_id),
      type: "season_started",
      title: "New Season",
      message: `"${season.name}" has started!`,
      link: `/club/${clubSlugForLink}`,
      clubId: clubId,
    });
  }

  // Get club slug for revalidation
  const { data: club } = await supabase.from("clubs").select("slug").eq("id", clubId).single();

  const clubSlug = club?.slug || clubId;

  revalidatePath(`/club/${clubSlug}`);
  revalidatePath(`/club/${clubSlug}/manage/season`);
  revalidatePath(`/club/${clubSlug}/history`);

  return { success: true, seasonId: season.id, clubSlug };
}

export async function updateSeason(prevState: unknown, formData: FormData) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { error: "You must be signed in" };
  }

  const seasonId = formData.get("seasonId") as string;
  const name = formData.get("name") as string;
  const subtitle = formData.get("subtitle") as string | null;
  const startDate = formData.get("startDate") as string;
  const endDate = formData.get("endDate") as string;

  if (!seasonId || !name || !startDate || !endDate) {
    return { error: "All required fields must be provided" };
  }

  // Get season to check club and permissions
  const { data: season } = await supabase
    .from("seasons")
    .select("club_id, name, start_date, end_date")
    .eq("id", seasonId)
    .single();

  if (!season) {
    return { error: "Season not found" };
  }

  // Check user is producer or director
  const { data: membership } = await supabase
    .from("club_members")
    .select("role")
    .eq("club_id", season.club_id)
    .eq("user_id", user.id)
    .maybeSingle();

  if (!membership || (membership.role !== "producer" && membership.role !== "director")) {
    return { error: "Only producers and directors can update seasons" };
  }

  // Validate dates
  const start = new Date(startDate);
  const end = new Date(endDate);

  if (isNaN(start.getTime()) || isNaN(end.getTime())) {
    return { error: "Invalid date format" };
  }

  if (start >= end) {
    return { error: "End date must be after start date" };
  }

  // Check for overlapping seasons (excluding current season)
  const { data: overlappingSeasons } = await supabase
    .from("seasons")
    .select("id, name")
    .eq("club_id", season.club_id)
    .neq("id", seasonId)
    .or(`and(start_date.lte.${endDate},end_date.gte.${startDate})`);

  if (overlappingSeasons && overlappingSeasons.length > 0) {
    return { error: "Seasons cannot overlap with existing seasons" };
  }

  // Update season
  const { error } = await supabase
    .from("seasons")
    .update({
      name: name.trim(),
      subtitle: subtitle?.trim() || null,
      start_date: startDate,
      end_date: endDate,
    })
    .eq("id", seasonId);

  if (error) {
    return { error: error.message };
  }

  // Notify club members about season changes
  const { data: members } = await supabase
    .from("club_members")
    .select("user_id")
    .eq("club_id", season.club_id)
    .neq("user_id", user.id); // Don't notify the admin who made changes

  if (members && members.length > 0) {
    const clubSlugForLink = await getClubSlug(supabase, season.club_id);
    const seasonName = name.trim();

    // Check if name changed
    if (season.name !== name.trim()) {
      await createNotificationsForUsers({
        userIds: members.map((m) => m.user_id),
        type: "season_name_changed",
        title: "Season Renamed",
        message: `"${season.name}" has been renamed to "${seasonName}"`,
        link: `/club/${clubSlugForLink}`,
        clubId: season.club_id,
      });

      // Log activity
      await logClubActivity(season.club_id, "season_renamed", {
        season_name: seasonName,
        new_name: seasonName,
      });
    }

    // Check if dates changed
    if (season.start_date !== startDate || season.end_date !== endDate) {
      await createNotificationsForUsers({
        userIds: members.map((m) => m.user_id),
        type: "season_date_changed",
        title: "Season Dates Updated",
        message: `"${seasonName}" dates have been updated.`,
        link: `/club/${clubSlugForLink}`,
        clubId: season.club_id,
      });

      // Log activity
      await logClubActivity(season.club_id, "season_dates_changed", {
        season_name: seasonName,
      });
    }
  }

  // Get slugs for revalidation
  const { data: club } = await supabase
    .from("clubs")
    .select("slug")
    .eq("id", season.club_id)
    .single();

  const { data: seasonData } = await supabase
    .from("seasons")
    .select("slug")
    .eq("id", seasonId)
    .single();

  const clubSlug = club?.slug || season.club_id;
  const seasonSlug = seasonData?.slug || seasonId;

  revalidatePath(`/club/${clubSlug}`);
  revalidatePath(`/club/${clubSlug}/history`);
  revalidatePath(`/club/${clubSlug}/season/${seasonSlug}`);
  return { success: true };
}

export async function deleteSeason(seasonId: string) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { error: "You must be signed in" };
  }

  // Get season to check club and permissions
  const { data: season } = await supabase
    .from("seasons")
    .select("club_id, name")
    .eq("id", seasonId)
    .single();

  if (!season) {
    return { error: "Season not found" };
  }

  // Check user is producer
  const { data: membership } = await supabase
    .from("club_members")
    .select("role")
    .eq("club_id", season.club_id)
    .eq("user_id", user.id)
    .maybeSingle();

  if (!membership || membership.role !== "producer") {
    return { error: "Only the producer can delete seasons" };
  }

  // Check for festivals in this season
  const { data: festivals } = await supabase
    .from("festivals")
    .select("id")
    .eq("season_id", seasonId)
    .limit(1);

  if (festivals && festivals.length > 0) {
    return { error: "Cannot delete season with festivals. Delete or move festivals first." };
  }

  // Delete season
  const { error } = await supabase.from("seasons").delete().eq("id", seasonId);

  if (error) {
    return { error: error.message };
  }

  await logClubActivity(season.club_id, "season_ended", {
    season_name: season.name,
    action: "deleted",
  });

  const clubSlug = await getClubSlug(supabase, season.club_id);
  revalidatePath(`/club/${clubSlug}`);
  revalidatePath(`/club/${clubSlug}/history`);
  return { success: true };
}
