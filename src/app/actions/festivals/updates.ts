"use server";

import { createClient } from "@/lib/supabase/server";
import { invalidateFestival } from "@/lib/cache/invalidate";
import { createNotificationsForUsers } from "../notifications";
import { handleActionError } from "@/lib/errors/handler";
import { logClubActivity } from "@/lib/activity/logger";
import { generateUniqueSlug } from "../themes/helpers";

/**
 * Update the theme of an active festival (for endless festivals)
 */
export async function updateFestivalTheme(
  festivalId: string,
  theme: string
): Promise<{ error: string } | { success: true; newSlug: string }> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { error: "Not authenticated" };
  }

  // Get festival and club info
  const { data: festival, error: festivalError } = await supabase
    .from("festivals")
    .select("id, club_id, status, slug")
    .eq("id", festivalId)
    .single();

  if (festivalError || !festival) {
    return { error: "Festival not found" };
  }

  // Check if user is admin
  const { data: membership } = await supabase
    .from("club_members")
    .select("role")
    .eq("club_id", festival.club_id)
    .eq("user_id", user.id)
    .single();

  if (!membership || !["producer", "director"].includes(membership.role)) {
    return { error: "Only admins can update festival theme" };
  }

  // Generate new slug from the updated theme
  const newSlug = await generateUniqueSlug(supabase, theme.trim(), festival.club_id, festivalId);

  // Update the festival theme and slug
  const { error: updateError } = await supabase
    .from("festivals")
    .update({
      theme: theme.trim(),
      slug: newSlug,
      updated_at: new Date().toISOString(),
    })
    .eq("id", festivalId);

  if (updateError) {
    return { error: updateError.message };
  }

  await invalidateFestival(festivalId, { clubId: festival.club_id });

  return { success: true, newSlug };
}

/**
 * Cancel a festival with proper cleanup
 * Movies remain in user watch history, no points are awarded
 * Discussion threads are archived
 */
export async function cancelFestival(festivalId: string) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { error: "You must be signed in" };
  }

  // Get festival
  const { data: festival, error: festivalError } = await supabase
    .from("festivals")
    .select("id, club_id, phase, status, theme, slug")
    .eq("id", festivalId)
    .single();

  if (festivalError || !festival) {
    return { error: "Festival not found" };
  }

  // Check if already cancelled or completed
  if (festival.status === "cancelled") {
    return { error: "Festival is already cancelled" };
  }
  if (festival.status === "completed") {
    return { error: "Cannot cancel a completed festival" };
  }

  // Check user is producer or director
  const { data: membership } = await supabase
    .from("club_members")
    .select("role")
    .eq("club_id", festival.club_id)
    .eq("user_id", user.id)
    .maybeSingle();

  if (!membership || (membership.role !== "producer" && membership.role !== "director")) {
    return { error: "Only producers and directors can cancel festivals" };
  }

  // Update festival status to cancelled
  const { error: updateError } = await supabase
    .from("festivals")
    .update({
      status: "cancelled",
      updated_at: new Date().toISOString(),
    })
    .eq("id", festivalId);

  if (updateError) {
    return { error: updateError.message };
  }

  // Archive discussion threads related to this festival
  // Mark them with a cancelled flag but keep them visible
  await supabase
    .from("discussion_threads")
    .update({
      is_archived: true,
      archived_reason: "festival_cancelled",
      updated_at: new Date().toISOString(),
    })
    .eq("festival_id", festivalId);

  // Log club activity
  await logClubActivity(festival.club_id, "festival_cancelled", {
    festival_id: festivalId,
    festival_slug: festival.slug || festivalId,
    festival_theme: festival.theme || "Festival",
  });

  await invalidateFestival(festivalId, { clubId: festival.club_id });

  return { success: true };
}

/**
 * Get incomplete participants for a festival
 * Shows who hasn't completed rating and their progress
 */
export async function getIncompleteParticipants(festivalId: string) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { error: "You must be signed in" };
  }

  // Get festival
  const { data: festival, error: festivalError } = await supabase
    .from("festivals")
    .select("id, club_id")
    .eq("id", festivalId)
    .single();

  if (festivalError || !festival) {
    return { error: "Festival not found" };
  }

  // Check user is producer or director
  const { data: membership } = await supabase
    .from("club_members")
    .select("role")
    .eq("club_id", festival.club_id)
    .eq("user_id", user.id)
    .maybeSingle();

  if (!membership || (membership.role !== "producer" && membership.role !== "director")) {
    return { error: "Only producers and directors can view participant progress" };
  }

  // Get all club members
  const { data: members, error: membersError } = await supabase
    .from("club_members")
    .select(
      "user_id, users:user_id(id, display_name, email, avatar_url, avatar_icon, avatar_color_index, avatar_border_color_index)"
    )
    .eq("club_id", festival.club_id);

  if (membersError) {
    return { error: membersError.message };
  }

  // Get total nominations count
  const { count: totalNominations } = await supabase
    .from("nominations")
    .select("*", { count: "exact", head: true })
    .eq("festival_id", festivalId)
    .is("deleted_at", null);

  // Get all ratings for this festival
  const { data: ratings } = await supabase
    .from("ratings")
    .select("user_id, nomination_id")
    .eq("festival_id", festivalId);

  // Get all guesses for this festival (if guessing enabled)
  const { data: guesses } = await supabase
    .from("guesses")
    .select("user_id, nomination_id")
    .eq("festival_id", festivalId);

  // Build participant progress
  const participantProgress = (members || []).map((member) => {
    const memberUser = Array.isArray(member.users) ? member.users[0] : member.users;
    const userId = member.user_id;

    const userRatings = ratings?.filter((r) => r.user_id === userId) || [];
    const userGuesses = guesses?.filter((g) => g.user_id === userId) || [];

    const ratingsComplete = userRatings.length;
    const guessesComplete = userGuesses.length;
    const totalMovies = totalNominations || 0;

    return {
      user_id: userId,
      display_name:
        (memberUser as { display_name?: string; email?: string } | null)?.display_name ||
        (memberUser as { display_name?: string; email?: string } | null)?.email ||
        "Unknown",
      avatar_url: (memberUser as { avatar_url?: string } | null)?.avatar_url || null,
      ratings_complete: ratingsComplete,
      ratings_total: totalMovies,
      guesses_complete: guessesComplete,
      guesses_total: totalMovies,
      is_complete: ratingsComplete >= totalMovies,
    };
  });

  // Separate into complete and incomplete
  const incomplete = participantProgress.filter((p) => !p.is_complete);
  const complete = participantProgress.filter((p) => p.is_complete);

  return {
    data: {
      incomplete,
      complete,
      total_movies: totalNominations || 0,
      has_guessing: (guesses?.length || 0) > 0,
    },
  };
}

/**
 * Update the appearance of a festival (picture and background)
 */
export async function updateFestivalAppearance(prevState: unknown, formData: FormData) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { error: "Not authenticated" };
  }

  const festivalId = formData.get("festivalId") as string;
  const backgroundType = formData.get("background_type") as string | null;
  const backgroundValue = formData.get("background_value") as string | null;
  const backgroundImage = formData.get("background_image") as File | null;
  const pictureFile = formData.get("picture") as File | null;

  if (!festivalId) {
    return { error: "Festival ID is required" };
  }

  // Get festival and club info
  const { data: festival, error: festivalError } = await supabase
    .from("festivals")
    .select("id, club_id, picture_url, background_type, background_value, slug")
    .eq("id", festivalId)
    .single();

  if (festivalError || !festival) {
    return { error: "Festival not found" };
  }

  // Check if user is admin
  const { data: membership } = await supabase
    .from("club_members")
    .select("role")
    .eq("club_id", festival.club_id)
    .eq("user_id", user.id)
    .single();

  if (!membership || !["producer", "director"].includes(membership.role)) {
    return { error: "Only admins can update festival appearance" };
  }

  const updateData: {
    picture_url?: string | null;
    background_type?: string | null;
    background_value?: string | null;
    updated_at: string;
  } = {
    updated_at: new Date().toISOString(),
  };

  // Handle picture upload
  if (pictureFile && pictureFile.size > 0) {
    const maxSize = 5 * 1024 * 1024; // 5MB
    if (pictureFile.size > maxSize) {
      return { error: "Festival picture must be less than 5MB" };
    }

    const allowedTypes = ["image/jpeg", "image/jpg", "image/png", "image/gif", "image/webp"];
    if (!allowedTypes.includes(pictureFile.type)) {
      return { error: "Picture must be an image file (JPEG, PNG, GIF, or WebP)" };
    }

    try {
      // Delete old picture if exists
      if (festival.picture_url) {
        const urlParts = festival.picture_url.split("/");
        const filenameIndex = urlParts.findIndex((part: string) => part === "festival-pictures");
        if (filenameIndex !== -1 && urlParts[filenameIndex + 1]) {
          try {
            await supabase.storage.from("festival-pictures").remove([urlParts[filenameIndex + 1]]);
          } catch {
            // Ignore errors
          }
        }
      }

      const fileExt = pictureFile.name.split(".").pop();
      const fileName = `${festivalId}-${Date.now()}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from("festival-pictures")
        .upload(fileName, pictureFile, { cacheControl: "3600", upsert: false });

      if (uploadError) {
        if (uploadError.message?.includes("Bucket not found")) {
          return {
            error:
              'Storage bucket "festival-pictures" does not exist. Please create it in Supabase Dashboard → Storage.',
          };
        }
        return handleActionError(uploadError, { action: "updateFestivalAppearance" });
      }

      const { data: urlData } = supabase.storage.from("festival-pictures").getPublicUrl(fileName);
      if (urlData?.publicUrl) {
        updateData.picture_url = urlData.publicUrl;
      }
    } catch (error) {
      return handleActionError(error, { action: "updateFestivalAppearance" });
    }
  }

  // Handle background
  if (backgroundType) {
    updateData.background_type = backgroundType;

    if (backgroundType === "custom_image" && backgroundImage && backgroundImage.size > 0) {
      const maxSize = 5 * 1024 * 1024; // 5MB
      if (backgroundImage.size > maxSize) {
        return { error: "Background image must be less than 5MB" };
      }

      const allowedTypes = ["image/jpeg", "image/jpg", "image/png", "image/gif", "image/webp"];
      if (!allowedTypes.includes(backgroundImage.type)) {
        return { error: "Background must be an image file (JPEG, PNG, GIF, or WebP)" };
      }

      try {
        // Delete old background if it was a custom image
        if (festival.background_type === "custom_image" && festival.background_value) {
          const urlParts = festival.background_value.split("/");
          const filenameIndex = urlParts.findIndex(
            (part: string) => part === "festival-backgrounds"
          );
          if (filenameIndex !== -1 && urlParts[filenameIndex + 1]) {
            try {
              await supabase.storage
                .from("festival-backgrounds")
                .remove([urlParts[filenameIndex + 1]]);
            } catch {
              // Ignore errors
            }
          }
        }

        const fileExt = backgroundImage.name.split(".").pop();
        const fileName = `${festivalId}-${Date.now()}.${fileExt}`;

        const { error: uploadError } = await supabase.storage
          .from("festival-backgrounds")
          .upload(fileName, backgroundImage, { cacheControl: "3600", upsert: false });

        if (uploadError) {
          if (uploadError.message?.includes("Bucket not found")) {
            return {
              error:
                'Storage bucket "festival-backgrounds" does not exist. Please create it in Supabase Dashboard → Storage.',
            };
          }
          return handleActionError(uploadError, { action: "updateFestivalAppearance" });
        }

        const { data: urlData } = supabase.storage
          .from("festival-backgrounds")
          .getPublicUrl(fileName);
        if (urlData?.publicUrl) {
          updateData.background_value = urlData.publicUrl;
        }
      } catch (error) {
        return handleActionError(error, { action: "updateFestivalAppearance" });
      }
    } else if (backgroundType !== "custom_image" && backgroundValue) {
      updateData.background_value = backgroundValue;
    }
  } else if (backgroundType === "") {
    // Clear background
    updateData.background_type = null;
    updateData.background_value = null;
  }

  // Update festival
  const { error: updateError } = await supabase
    .from("festivals")
    .update(updateData)
    .eq("id", festivalId);

  if (updateError) {
    return { error: updateError.message };
  }

  await invalidateFestival(festivalId, { clubId: festival.club_id });

  return { success: true };
}

/**
 * Update festival deadlines
 * Sends notifications to club members when deadlines change
 */
export async function updateFestivalDeadlines(
  festivalId: string,
  deadlines: {
    nominationDeadline?: string;
    watchDeadline?: string;
    ratingDeadline?: string;
  }
) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { error: "You must be signed in" };
  }

  // Get festival with current deadlines
  const { data: festival, error: festivalError } = await supabase
    .from("festivals")
    .select("id, club_id, theme, slug, nomination_deadline, watch_deadline, rating_deadline")
    .eq("id", festivalId)
    .single();

  if (festivalError || !festival) {
    return { error: "Festival not found" };
  }

  // Check user is producer or director
  const { data: membership } = await supabase
    .from("club_members")
    .select("role")
    .eq("club_id", festival.club_id)
    .eq("user_id", user.id)
    .maybeSingle();

  if (!membership || (membership.role !== "producer" && membership.role !== "director")) {
    return { error: "Only producers and directors can update festival deadlines" };
  }

  // Track which deadlines changed
  const changedDeadlines: string[] = [];
  const updateData: Record<string, string> = {};

  if (
    deadlines.nominationDeadline &&
    deadlines.nominationDeadline !== festival.nomination_deadline
  ) {
    updateData.nomination_deadline = deadlines.nominationDeadline;
    changedDeadlines.push("nomination");
  }
  if (deadlines.watchDeadline && deadlines.watchDeadline !== festival.watch_deadline) {
    updateData.watch_deadline = deadlines.watchDeadline;
    changedDeadlines.push("watch");
  }
  if (deadlines.ratingDeadline && deadlines.ratingDeadline !== festival.rating_deadline) {
    updateData.rating_deadline = deadlines.ratingDeadline;
    changedDeadlines.push("rating");
  }

  if (changedDeadlines.length === 0) {
    return { success: true, message: "No changes" };
  }

  // Update deadlines
  const { error: updateError } = await supabase
    .from("festivals")
    .update({
      ...updateData,
      updated_at: new Date().toISOString(),
    })
    .eq("id", festivalId);

  if (updateError) {
    return { error: updateError.message };
  }

  // Notify all club members about the deadline change
  const { data: members } = await supabase
    .from("club_members")
    .select("user_id")
    .eq("club_id", festival.club_id)
    .neq("user_id", user.id); // Don't notify the person who made the change

  if (members && members.length > 0) {
    const memberIds = members.map((m) => m.user_id);
    const festivalName = festival.theme || "the festival";
    const deadlineText =
      changedDeadlines.length === 1 ? `The ${changedDeadlines[0]} deadline` : "Deadlines";

    await createNotificationsForUsers({
      userIds: memberIds,
      type: "deadline_changed",
      title: "Festival Deadline Updated",
      message: `${deadlineText} for "${festivalName}" ${changedDeadlines.length === 1 ? "has" : "have"} been changed.`,
      link: `/club/${festival.club_id}/festival/${festival.slug || festivalId}`,
      clubId: festival.club_id,
      festivalId: festivalId,
    });
  }

  await invalidateFestival(festivalId, { clubId: festival.club_id });

  return { success: true, changedDeadlines };
}
