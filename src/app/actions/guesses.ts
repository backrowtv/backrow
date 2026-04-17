"use server";

import { createClient } from "@/lib/supabase/server";
import { invalidateFestival } from "@/lib/cache/invalidate";

export async function saveGuesses(festivalId: string, guesses: Record<string, string>) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { error: "You must be signed in" };
  }

  if (!festivalId || !guesses) {
    return { error: "Festival ID and guesses are required" };
  }

  // Get festival to check phase and club
  const { data: festival } = await supabase
    .from("festivals")
    .select("club_id, phase, status")
    .eq("id", festivalId)
    .single();

  if (!festival) {
    return { error: "Festival not found" };
  }

  // Check if watch/rate phase is active
  if (festival.phase !== "watch_rate" && festival.status !== "watching") {
    return { error: "Guessing is only available during the Watch & Rate phase" };
  }

  // Check user is a member
  const { data: membership } = await supabase
    .from("club_members")
    .select("role")
    .eq("club_id", festival.club_id)
    .eq("user_id", user.id)
    .maybeSingle();

  if (!membership) {
    return { error: "You must be a member of this club" };
  }

  // Check member count (must be 3+ for guessing)
  const { count: memberCount } = await supabase
    .from("club_members")
    .select("*", { count: "exact", head: true })
    .eq("club_id", festival.club_id);

  if (!memberCount || memberCount < 3) {
    return { error: "Guessing requires at least 3 club members" };
  }

  // Validate guesses format: should be Record<nomination_id, guessed_user_id>
  // Also verify that user isn't guessing themselves for their own nomination
  const { data: nominations } = await supabase
    .from("nominations")
    .select("id, user_id")
    .eq("festival_id", festivalId)
    .is("deleted_at", null);

  const validatedGuesses: Record<string, string> = {};
  for (const [nominationId, guessedUserId] of Object.entries(guesses)) {
    if (nominationId && guessedUserId) {
      // Check if this is the user's own nomination
      const nomination = nominations?.find((n) => n.id === nominationId);
      if (nomination?.user_id === user.id) {
        // Skip guessing your own nomination
        continue;
      }
      // Check if user is guessing themselves
      if (guessedUserId === user.id) {
        // Skip - can't guess yourself
        continue;
      }
      validatedGuesses[nominationId] = guessedUserId;
    }
  }

  // Check if user already has guesses for this festival
  const { data: existingGuesses } = await supabase
    .from("nomination_guesses")
    .select("id, guesses")
    .eq("festival_id", festivalId)
    .eq("user_id", user.id)
    .maybeSingle();

  if (existingGuesses) {
    // Update existing guesses
    const { error } = await supabase
      .from("nomination_guesses")
      .update({
        guesses: validatedGuesses,
      })
      .eq("id", existingGuesses.id);

    if (error) {
      return { error: error.message };
    }
  } else {
    // Create new guesses record
    const { error } = await supabase.from("nomination_guesses").insert({
      festival_id: festivalId,
      user_id: user.id,
      guesses: validatedGuesses,
    });

    if (error) {
      return { error: error.message };
    }
  }

  await invalidateFestival(festivalId, { clubId: festival.club_id });
  return { success: true };
}
