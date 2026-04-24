"use server";

/**
 * Theme Voting Actions
 *
 * Functions for voting on themes (both festival selection and pool voting).
 */

import { createClient } from "@/lib/supabase/server";
import { invalidateFestival, invalidateClub } from "@/lib/cache/invalidate";
import { actionRateLimit } from "@/lib/security/action-rate-limit";
import { requireVerifiedEmail } from "@/lib/security/require-verified-email";

/**
 * Vote for a theme during theme_selection phase
 * Members can vote for one theme per festival
 */
export async function voteForTheme(festivalId: string, themeId: string) {
  const rateCheck = await actionRateLimit("voteForTheme", { limit: 20, windowMs: 60_000 });
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

  // Get festival to check phase and club
  const { data: festival, error: festivalError } = await supabase
    .from("festivals")
    .select("club_id, phase, theme")
    .eq("id", festivalId)
    .single();

  if (festivalError || !festival) {
    return { error: "Festival not found" };
  }

  if (festival.phase !== "theme_selection") {
    return { error: "Voting is only available during theme selection phase" };
  }

  // Check user is a member
  const { data: membership, error: membershipError } = await supabase
    .from("club_members")
    .select("club_id, user_id")
    .eq("club_id", festival.club_id)
    .eq("user_id", user.id)
    .maybeSingle();

  if (membershipError) {
    return { error: membershipError.message };
  }

  if (!membership) {
    return { error: "You must be a member of this club" };
  }

  // Check theme exists and belongs to club
  const { data: theme, error: themeError } = await supabase
    .from("theme_pool")
    .select("id, club_id, is_used")
    .eq("id", themeId)
    .single();

  if (themeError || !theme) {
    return { error: "Theme not found" };
  }

  if (theme.club_id !== festival.club_id) {
    return { error: "Theme does not belong to this club" };
  }

  if (theme.is_used) {
    return { error: "This theme has already been used" };
  }

  // Upsert vote (update if exists, insert if not)
  // UNIQUE constraint on (festival_id, user_id) ensures one vote per member
  const { error } = await supabase.from("theme_votes").upsert(
    {
      festival_id: festivalId,
      user_id: user.id,
      theme_id: themeId,
    },
    {
      onConflict: "festival_id,user_id",
    }
  );

  if (error) {
    return { error: error.message };
  }

  await invalidateFestival(festivalId, { clubId: festival.club_id });
  return { success: true };
}

/**
 * Get voting results for a festival
 * Returns vote counts per theme
 */
export async function getThemeVotes(festivalId: string) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { error: "You must be signed in", data: null };
  }

  // Get festival to check club
  const { data: festival, error: festivalError } = await supabase
    .from("festivals")
    .select("club_id, phase")
    .eq("id", festivalId)
    .single();

  if (festivalError || !festival) {
    return { error: "Festival not found", data: null };
  }

  // Check user is a member
  const { data: membership, error: membershipError } = await supabase
    .from("club_members")
    .select("club_id, user_id")
    .eq("club_id", festival.club_id)
    .eq("user_id", user.id)
    .maybeSingle();

  if (membershipError) {
    return { error: membershipError.message, data: null };
  }

  if (!membership) {
    return { error: "You must be a member of this club", data: null };
  }

  // Get all votes for this festival
  const { data: votes, error: votesError } = await supabase
    .from("theme_votes")
    .select("theme_id, user_id")
    .eq("festival_id", festivalId);

  if (votesError) {
    return { error: votesError.message, data: null };
  }

  // Get available themes for this club
  const { data: themes, error: themesError } = await supabase
    .from("theme_pool")
    .select("id, theme_name")
    .eq("club_id", festival.club_id)
    .eq("is_used", false);

  if (themesError) {
    return { error: themesError.message, data: null };
  }

  if (!themes || !votes) {
    return { error: null, data: [] };
  }

  // Count votes per theme
  const voteCounts = themes.map((theme) => {
    const count = votes.filter((v) => v.theme_id === theme.id).length;
    return {
      theme_id: theme.id,
      theme_name: theme.theme_name,
      vote_count: count,
    };
  });

  // Sort by vote count descending
  voteCounts.sort((a, b) => b.vote_count - a.vote_count);

  // Get user's current vote
  const userVote = votes.find((v) => v.user_id === user.id);

  return {
    error: null,
    data: {
      votes: voteCounts,
      user_vote: userVote?.theme_id || null,
      total_votes: votes.length,
    },
  };
}

/**
 * Toggle upvote on a theme in the theme pool
 * This is separate from festival theme selection voting
 */
export async function voteOnThemePool(themeId: string) {
  const rateCheck = await actionRateLimit("voteOnThemePool", { limit: 30, windowMs: 60_000 });
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

  // Get theme to check club and voting enabled
  const { data: theme, error: themeError } = await supabase
    .from("theme_pool")
    .select("id, club_id, is_used")
    .eq("id", themeId)
    .single();

  if (themeError || !theme) {
    return { error: "Theme not found" };
  }

  if (theme.is_used) {
    return { error: "Cannot vote on themes that have been used" };
  }

  // Check user is a member
  const { data: membership, error: membershipError } = await supabase
    .from("club_members")
    .select("club_id, user_id")
    .eq("club_id", theme.club_id)
    .eq("user_id", user.id)
    .maybeSingle();

  if (membershipError) {
    return { error: membershipError.message };
  }

  if (!membership) {
    return { error: "You must be a member of this club" };
  }

  // Block votes while the theme pool is disabled — preserves existing votes
  // (we don't delete them) but freezes new ones until admins re-enable.
  const { data: club } = await supabase
    .from("clubs")
    .select("settings")
    .eq("id", theme.club_id)
    .single();

  const clubSettings = (club?.settings as Record<string, unknown>) || {};
  if (clubSettings.themes_enabled === false) {
    return { error: "The theme pool is currently disabled for this club" };
  }

  // Note: Votes persist even when voting is disabled
  // We don't check voting enabled status here - votes are always allowed
  // The UI will hide voting buttons when voting is disabled, but existing votes remain

  // Check if user already voted
  const { data: existingVote, error: voteCheckError } = await supabase
    .from("theme_pool_votes")
    .select("id")
    .eq("theme_id", themeId)
    .eq("user_id", user.id)
    .maybeSingle();

  if (voteCheckError && voteCheckError.code !== "PGRST116") {
    // PGRST116 = no rows returned
    return { error: voteCheckError.message };
  }

  // Toggle: if vote exists, remove it; otherwise add it
  if (existingVote) {
    const { error: deleteError } = await supabase
      .from("theme_pool_votes")
      .delete()
      .eq("theme_id", themeId)
      .eq("user_id", user.id);

    if (deleteError) {
      return { error: deleteError.message };
    }

    invalidateClub(theme.club_id);
    return { success: true, voted: false };
  }

  // Add upvote
  const { error: insertError } = await supabase.from("theme_pool_votes").insert({
    theme_id: themeId,
    user_id: user.id,
    vote_type: "upvote",
  });

  if (insertError) {
    return { error: insertError.message };
  }

  invalidateClub(theme.club_id);
  return { success: true, voted: true };
}

/**
 * Get vote counts for themes in a club's theme pool
 */
export async function getThemePoolVotes(clubId: string) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { error: "You must be signed in", data: null };
  }

  // Check user is a member
  const { data: membership, error: membershipError } = await supabase
    .from("club_members")
    .select("club_id, user_id")
    .eq("club_id", clubId)
    .eq("user_id", user.id)
    .maybeSingle();

  if (membershipError) {
    return { error: membershipError.message, data: null };
  }

  if (!membership) {
    return { error: "You must be a member of this club", data: null };
  }

  // Get all themes for this club first
  const { data: themes, error: themesError } = await supabase
    .from("theme_pool")
    .select("id")
    .eq("club_id", clubId);

  if (themesError) {
    return { error: themesError.message, data: null };
  }

  if (!themes || themes.length === 0) {
    return { error: null, data: {} };
  }

  const themeIds = themes.map((t) => t.id);

  // Get all votes for themes in this club
  const { data: votes, error: votesError } = await supabase
    .from("theme_pool_votes")
    .select("theme_id, user_id")
    .in("theme_id", themeIds);

  if (votesError) {
    return { error: votesError.message, data: null };
  }

  if (!votes) {
    return { error: null, data: {} };
  }

  // Calculate vote counts per theme (upvotes only now)
  const voteCounts: Record<string, { upvotes: number; userVote: "upvote" | null }> = {};

  votes.forEach((vote) => {
    if (!voteCounts[vote.theme_id]) {
      voteCounts[vote.theme_id] = { upvotes: 0, userVote: null };
    }

    voteCounts[vote.theme_id].upvotes++;

    if (vote.user_id === user.id) {
      voteCounts[vote.theme_id].userVote = "upvote";
    }
  });

  return { error: null, data: voteCounts };
}
