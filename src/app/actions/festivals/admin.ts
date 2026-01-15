"use server";

/**
 * Festival Admin Operations
 *
 * Admin-only operations for festival management including
 * poster uploads, member/movie removal, and rating/guess overrides.
 */

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { handleActionError } from "@/lib/errors/handler";

/**
 * Upload a custom poster for a festival
 * Only producers and directors can upload posters
 */
export async function uploadFestivalPoster(
  festivalId: string,
  formData: FormData
): Promise<{ error: string } | { success: true; posterUrl: string }> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { error: "You must be signed in" };
  }

  // Get festival and check permissions
  const { data: festival, error: festivalError } = await supabase
    .from("festivals")
    .select("club_id, slug, poster_url")
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
    .maybeSingle();

  if (!membership || (membership.role !== "producer" && membership.role !== "director")) {
    return { error: "You do not have permission to perform this action" };
  }

  const posterFile = formData.get("poster") as File | null;

  if (!posterFile || posterFile.size === 0) {
    return { error: "No poster file provided" };
  }

  try {
    // Validate file size (15MB limit)
    const maxSize = 15 * 1024 * 1024;
    if (posterFile.size > maxSize) {
      return { error: "Poster file size must be less than 15MB" };
    }

    // Validate file type
    const allowedTypes = ["image/jpeg", "image/jpg", "image/png", "image/gif", "image/webp"];
    if (!allowedTypes.includes(posterFile.type)) {
      return { error: "Poster must be an image file (JPEG, PNG, GIF, or WebP)" };
    }

    // Delete old poster if exists
    if (festival.poster_url) {
      try {
        const urlParts = festival.poster_url.split("/");
        const filenameIndex = urlParts.indexOf("festival-pictures");
        if (filenameIndex !== -1 && urlParts[filenameIndex + 1]) {
          await supabase.storage.from("festival-pictures").remove([urlParts[filenameIndex + 1]]);
        }
      } catch (err) {
        // Continue even if deletion fails - log silently
        handleActionError(err, { action: "uploadFestivalPoster", silent: true });
      }
    }

    // Generate unique filename
    const fileExt = posterFile.name.split(".").pop();
    const fileName = `${festivalId}-poster-${Date.now()}.${fileExt}`;

    // Upload to Supabase Storage
    const { error: uploadError } = await supabase.storage
      .from("festival-pictures")
      .upload(fileName, posterFile, {
        cacheControl: "3600",
        upsert: false,
      });

    if (uploadError) {
      return handleActionError(uploadError, "uploadFestivalPoster");
    }

    // Get public URL
    const { data: urlData } = supabase.storage.from("festival-pictures").getPublicUrl(fileName);

    const posterUrl = urlData.publicUrl;

    // Update festival with poster URL
    const { error: updateError } = await supabase
      .from("festivals")
      .update({ poster_url: posterUrl })
      .eq("id", festivalId);

    if (updateError) {
      return handleActionError(updateError, "uploadFestivalPoster");
    }

    // Get club slug for revalidation
    const { data: club } = await supabase
      .from("clubs")
      .select("slug")
      .eq("id", festival.club_id)
      .single();

    const clubSlug = club?.slug || festival.club_id;
    const festivalSlug = festival.slug || festivalId;

    revalidatePath(`/club/${clubSlug}/festival/${festivalSlug}`);

    return { success: true, posterUrl };
  } catch (err) {
    return handleActionError(err, "uploadFestivalPoster");
  }
}

/**
 * Remove festival poster
 */
export async function removeFestivalPoster(
  festivalId: string
): Promise<{ error: string } | { success: true }> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { error: "You must be signed in" };
  }

  // Get festival and check permissions
  const { data: festival, error: festivalError } = await supabase
    .from("festivals")
    .select("club_id, slug, poster_url")
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
    .maybeSingle();

  if (!membership || (membership.role !== "producer" && membership.role !== "director")) {
    return { error: "You do not have permission to perform this action" };
  }

  // Delete poster from storage if exists
  if (festival.poster_url) {
    try {
      const urlParts = festival.poster_url.split("/");
      const filenameIndex = urlParts.indexOf("festival-pictures");
      if (filenameIndex !== -1 && urlParts[filenameIndex + 1]) {
        await supabase.storage.from("festival-pictures").remove([urlParts[filenameIndex + 1]]);
      }
    } catch (err) {
      // Log silently, continue with database update
      handleActionError(err, { action: "removeFestivalPoster", silent: true });
    }
  }

  // Clear poster URL in database
  const { error: updateError } = await supabase
    .from("festivals")
    .update({ poster_url: null })
    .eq("id", festivalId);

  if (updateError) {
    return handleActionError(updateError, "removeFestivalPoster");
  }

  // Get club slug for revalidation
  const { data: club } = await supabase
    .from("clubs")
    .select("slug")
    .eq("id", festival.club_id)
    .single();

  const clubSlug = club?.slug || festival.club_id;
  const festivalSlug = festival.slug || festivalId;

  revalidatePath(`/club/${clubSlug}/festival/${festivalSlug}`);

  return { success: true };
}

/**
 * Remove a member from a festival
 * This removes their nomination and all their ratings
 */
export async function removeMemberFromFestival(
  festivalId: string,
  userId: string
): Promise<{ error: string } | { success: true }> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { error: "You must be signed in" };
  }

  // Get festival and check permissions
  const { data: festival, error: festivalError } = await supabase
    .from("festivals")
    .select("club_id, slug")
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
    .maybeSingle();

  if (!membership || (membership.role !== "producer" && membership.role !== "director")) {
    return { error: "You do not have permission to perform this action" };
  }

  // Delete user's nomination (cascade will handle related data)
  const { error: nomError } = await supabase
    .from("nominations")
    .delete()
    .eq("festival_id", festivalId)
    .eq("user_id", userId);

  if (nomError) {
    handleActionError(nomError, { action: "removeMemberFromFestival", silent: true });
  }

  // Delete user's ratings
  const { error: ratingsError } = await supabase
    .from("ratings")
    .delete()
    .eq("festival_id", festivalId)
    .eq("user_id", userId);

  if (ratingsError) {
    handleActionError(ratingsError, { action: "removeMemberFromFestival", silent: true });
  }

  // Delete user's guesses
  const { error: guessesError } = await supabase
    .from("guesses")
    .delete()
    .eq("festival_id", festivalId)
    .eq("user_id", userId);

  if (guessesError) {
    handleActionError(guessesError, { action: "removeMemberFromFestival", silent: true });
  }

  // Delete user's festival results
  const { error: resultsError } = await supabase
    .from("festival_results")
    .delete()
    .eq("festival_id", festivalId)
    .eq("user_id", userId);

  if (resultsError) {
    handleActionError(resultsError, { action: "removeMemberFromFestival", silent: true });
  }

  // Get club slug for revalidation
  const { data: club } = await supabase
    .from("clubs")
    .select("slug")
    .eq("id", festival.club_id)
    .single();

  const clubSlug = club?.slug || festival.club_id;
  const festivalSlug = festival.slug || festivalId;

  revalidatePath(`/club/${clubSlug}/festival/${festivalSlug}`);

  return { success: true };
}

/**
 * Remove a movie (nomination) from a festival
 * This removes all ratings and guesses for that movie
 */
export async function removeMovieFromFestival(
  festivalId: string,
  nominationId: string
): Promise<{ error: string } | { success: true }> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { error: "You must be signed in" };
  }

  // Get nomination to get tmdb_id
  const { data: nomination, error: nomError } = await supabase
    .from("nominations")
    .select("id, tmdb_id, festival_id")
    .eq("id", nominationId)
    .single();

  if (nomError || !nomination) {
    return { error: "Nomination not found" };
  }

  // Get festival and check permissions
  const { data: festival, error: festivalError } = await supabase
    .from("festivals")
    .select("club_id, slug")
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
    .maybeSingle();

  if (!membership || (membership.role !== "producer" && membership.role !== "director")) {
    return { error: "You do not have permission to perform this action" };
  }

  // Delete ratings for this nomination
  const { error: ratingsError } = await supabase
    .from("ratings")
    .delete()
    .eq("nomination_id", nominationId);

  if (ratingsError) {
    handleActionError(ratingsError, { action: "removeMovieFromFestival", silent: true });
  }

  // Delete guesses for this nomination
  const { error: guessesError } = await supabase
    .from("guesses")
    .delete()
    .eq("nomination_id", nominationId);

  if (guessesError) {
    handleActionError(guessesError, { action: "removeMovieFromFestival", silent: true });
  }

  // Delete the nomination itself
  const { error: deleteNomError } = await supabase
    .from("nominations")
    .delete()
    .eq("id", nominationId);

  if (deleteNomError) {
    return handleActionError(deleteNomError, "removeMovieFromFestival");
  }

  // Get club slug for revalidation
  const { data: club } = await supabase
    .from("clubs")
    .select("slug")
    .eq("id", festival.club_id)
    .single();

  const clubSlug = club?.slug || festival.club_id;
  const festivalSlug = festival.slug || festivalId;

  revalidatePath(`/club/${clubSlug}/festival/${festivalSlug}`);

  return { success: true };
}

/**
 * Admin override a user's rating for a movie
 */
export async function adminOverrideRating(
  festivalId: string,
  userId: string,
  nominationId: string,
  newRating: number
): Promise<{ error: string } | { success: true }> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { error: "You must be signed in" };
  }

  if (newRating < 0 || newRating > 10) {
    return { error: "Rating must be between 0 and 10" };
  }

  // Get festival and check permissions
  const { data: festival, error: festivalError } = await supabase
    .from("festivals")
    .select("club_id, slug")
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
    .maybeSingle();

  if (!membership || (membership.role !== "producer" && membership.role !== "director")) {
    return { error: "You do not have permission to perform this action" };
  }

  // Check if rating exists
  const { data: existingRating } = await supabase
    .from("ratings")
    .select("id")
    .eq("festival_id", festivalId)
    .eq("user_id", userId)
    .eq("nomination_id", nominationId)
    .maybeSingle();

  if (existingRating) {
    // Update existing rating
    const { error: updateError } = await supabase
      .from("ratings")
      .update({ rating: newRating })
      .eq("id", existingRating.id);

    if (updateError) {
      return handleActionError(updateError, "adminOverrideRating");
    }
  } else {
    // Insert new rating
    const { error: insertError } = await supabase.from("ratings").insert({
      festival_id: festivalId,
      user_id: userId,
      nomination_id: nominationId,
      rating: newRating,
    });

    if (insertError) {
      return handleActionError(insertError, "adminOverrideRating");
    }
  }

  // Get club slug for revalidation
  const { data: club } = await supabase
    .from("clubs")
    .select("slug")
    .eq("id", festival.club_id)
    .single();

  const clubSlug = club?.slug || festival.club_id;
  const festivalSlug = festival.slug || festivalId;

  revalidatePath(`/club/${clubSlug}/festival/${festivalSlug}`);

  return { success: true };
}

/**
 * Admin override a user's guess for who nominated a movie
 * The nomination_guesses table stores guesses as JSON: { [nominationId]: guessedUserId }
 */
export async function adminOverrideGuess(
  festivalId: string,
  userId: string,
  nominationId: string,
  guessedUserId: string
): Promise<{ error: string } | { success: true }> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { error: "You must be signed in" };
  }

  // Get festival and check permissions
  const { data: festival, error: festivalError } = await supabase
    .from("festivals")
    .select("club_id, slug")
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
    .maybeSingle();

  if (!membership || (membership.role !== "producer" && membership.role !== "director")) {
    return { error: "You do not have permission to perform this action" };
  }

  // Check if guess record exists for this user
  const { data: existingGuess } = await supabase
    .from("nomination_guesses")
    .select("id, guesses")
    .eq("festival_id", festivalId)
    .eq("user_id", userId)
    .maybeSingle();

  if (existingGuess) {
    // Update existing guesses JSON
    const currentGuesses = (existingGuess.guesses as Record<string, string>) || {};
    const updatedGuesses = { ...currentGuesses, [nominationId]: guessedUserId };

    const { error: updateError } = await supabase
      .from("nomination_guesses")
      .update({ guesses: updatedGuesses })
      .eq("id", existingGuess.id);

    if (updateError) {
      return handleActionError(updateError, "adminOverrideGuess");
    }
  } else {
    // Insert new guess record
    const { error: insertError } = await supabase.from("nomination_guesses").insert({
      festival_id: festivalId,
      user_id: userId,
      guesses: { [nominationId]: guessedUserId },
    });

    if (insertError) {
      return handleActionError(insertError, "adminOverrideGuess");
    }
  }

  // Get club slug for revalidation
  const { data: club } = await supabase
    .from("clubs")
    .select("slug")
    .eq("id", festival.club_id)
    .single();

  const clubSlug = club?.slug || festival.club_id;
  const festivalSlug = festival.slug || festivalId;

  revalidatePath(`/club/${clubSlug}/festival/${festivalSlug}`);

  return { success: true };
}

/**
 * Recalculate festival results
 * This should be called after any admin changes that affect results
 */
export async function recalculateFestivalResults(
  festivalId: string
): Promise<{ error: string } | { success: true; message?: string }> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { error: "You must be signed in" };
  }

  // Get festival and check permissions
  const { data: festival, error: festivalError } = await supabase
    .from("festivals")
    .select("club_id, slug")
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
    .maybeSingle();

  if (!membership || (membership.role !== "producer" && membership.role !== "director")) {
    return { error: "You do not have permission to perform this action" };
  }

  // Delete existing results
  const { error: deleteError } = await supabase
    .from("festival_results")
    .delete()
    .eq("festival_id", festivalId);

  if (deleteError) {
    handleActionError(deleteError, { action: "recalculateFestivalResults", silent: true });
  }

  // Get all ratings for the festival
  const { data: ratings } = await supabase
    .from("ratings")
    .select("user_id, nomination_id, rating")
    .eq("festival_id", festivalId);

  if (!ratings || ratings.length === 0) {
    // No ratings, nothing to calculate
    return { success: true, message: "No ratings to calculate" };
  }

  // Get nominations to map user_ids
  const { data: nominations } = await supabase
    .from("nominations")
    .select("id, user_id")
    .eq("festival_id", festivalId)
    .is("deleted_at", null);

  const nominationUserMap = new Map((nominations || []).map((n) => [n.id, n.user_id]));

  // Calculate average ratings per nomination
  const nominationRatings = new Map<string, number[]>();
  for (const rating of ratings) {
    const arr = nominationRatings.get(rating.nomination_id) || [];
    arr.push(rating.rating);
    nominationRatings.set(rating.nomination_id, arr);
  }

  const nominationAverages = new Map<string, number>();
  for (const [nomId, ratingsArr] of nominationRatings) {
    const avg = ratingsArr.reduce((a, b) => a + b, 0) / ratingsArr.length;
    nominationAverages.set(nomId, avg);
  }

  // Calculate points per user based on their nomination's average rating
  const userPoints = new Map<string, number>();
  for (const [nomId, avg] of nominationAverages) {
    const userId = nominationUserMap.get(nomId);
    if (userId) {
      userPoints.set(userId, avg);
    }
  }

  // Insert new results
  const resultsToInsert = Array.from(userPoints.entries()).map(([userId, points]) => ({
    festival_id: festivalId,
    user_id: userId,
    total_points: points,
    rank: 0, // Will be calculated
  }));

  // Sort by points and assign ranks
  resultsToInsert.sort((a, b) => b.total_points - a.total_points);
  let rank = 1;
  for (let i = 0; i < resultsToInsert.length; i++) {
    if (i > 0 && resultsToInsert[i].total_points < resultsToInsert[i - 1].total_points) {
      rank = i + 1;
    }
    resultsToInsert[i].rank = rank;
  }

  if (resultsToInsert.length > 0) {
    const { error: insertError } = await supabase.from("festival_results").insert(resultsToInsert);

    if (insertError) {
      return handleActionError(insertError, "recalculateFestivalResults");
    }
  }

  // Get club slug for revalidation
  const { data: club } = await supabase
    .from("clubs")
    .select("slug")
    .eq("id", festival.club_id)
    .single();

  const clubSlug = club?.slug || festival.club_id;
  const festivalSlug = festival.slug || festivalId;

  revalidatePath(`/club/${clubSlug}/festival/${festivalSlug}`);

  return { success: true };
}
