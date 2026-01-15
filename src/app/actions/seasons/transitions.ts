"use server";

/**
 * Season Transitions
 *
 * Season rollover and conclusion functionality.
 * Seasons are only used for standard (competitive) festivals.
 * Endless festivals are season-independent.
 */

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { logClubActivity } from "@/lib/activity/logger";
import { createNotificationsForUsers } from "../notifications";
import { getClubSlug } from "../clubs/_helpers";

export async function checkAndRolloverSeasons(): Promise<{ rolledOver: boolean }> {
  const supabase = await createClient();

  // Get current time in EST
  const now = new Date();
  const estTime = new Date(now.toLocaleString("en-US", { timeZone: "America/New_York" }));

  // Check if it's midnight EST (within 1 hour window)
  const hours = estTime.getHours();
  const minutes = estTime.getMinutes();

  // Only rollover if it's between 00:00 and 00:59 EST
  if (hours !== 0 || minutes > 59) {
    return { rolledOver: false };
  }

  // Get all seasons ending today in EST
  const todayStart = new Date(estTime);
  todayStart.setHours(0, 0, 0, 0);
  const todayEnd = new Date(estTime);
  todayEnd.setHours(23, 59, 59, 999);

  const { data: endingSeasons } = await supabase
    .from("seasons")
    .select("id, club_id, name, subtitle, end_date, clubs!inner(festival_type)")
    .gte("end_date", todayStart.toISOString())
    .lte("end_date", todayEnd.toISOString())
    .neq("clubs.festival_type", "endless"); // Skip clubs in endless mode

  if (!endingSeasons || endingSeasons.length === 0) {
    return { rolledOver: false };
  }

  let rolledOverCount = 0;

  for (const season of endingSeasons) {
    // Check for active standard festivals (nominating status)
    const { data: standardActiveFestivals } = await supabase
      .from("festivals")
      .select("id")
      .eq("season_id", season.id)
      .eq("status", "nominating")
      .limit(1);

    // Skip rollover if standard active festivals exist
    if (standardActiveFestivals && standardActiveFestivals.length > 0) {
      continue;
    }

    // Check for any watching festivals in this season
    const { data: otherWatchingFestivals } = await supabase
      .from("festivals")
      .select("id")
      .eq("season_id", season.id)
      .eq("status", "watching")
      .limit(1);

    if (otherWatchingFestivals && otherWatchingFestivals.length > 0) {
      continue;
    }

    // Get all seasons for this club to determine next season number
    const { data: allSeasons } = await supabase
      .from("seasons")
      .select("name")
      .eq("club_id", season.club_id)
      .order("start_date", { ascending: false });

    // Extract season number from name (e.g., "Season 1" -> 1)
    const seasonNumbers = (allSeasons || [])
      .map((s) => {
        const match = s.name.match(/Season\s+(\d+)/i);
        return match ? parseInt(match[1]) : 0;
      })
      .filter((n) => n > 0);

    const nextSeasonNumber = seasonNumbers.length > 0 ? Math.max(...seasonNumbers) + 1 : 1;
    const newSeasonName = `Season ${nextSeasonNumber}`;

    // Check if new season already exists
    const { data: existingSeason } = await supabase
      .from("seasons")
      .select("id")
      .eq("club_id", season.club_id)
      .eq("name", newSeasonName)
      .maybeSingle();

    if (existingSeason) {
      continue; // Skip if season already exists
    }

    // Create new season starting immediately after current season ends
    const seasonEnd = new Date(season.end_date);
    const newSeasonStart = new Date(seasonEnd);
    newSeasonStart.setSeconds(newSeasonStart.getSeconds() + 1); // Start 1 second after end

    // Default end date: 9 months from start
    const newSeasonEnd = new Date(newSeasonStart);
    newSeasonEnd.setMonth(newSeasonEnd.getMonth() + 9);

    const { error: createError } = await supabase.from("seasons").insert({
      club_id: season.club_id,
      name: newSeasonName,
      subtitle: season.subtitle, // Preserve subtitle
      start_date: newSeasonStart.toISOString(),
      end_date: newSeasonEnd.toISOString(),
    });

    if (!createError) {
      rolledOverCount++;

      // Log club activity (season ended and new one started)
      await logClubActivity(season.club_id, "season_ended", {
        season_name: season.name,
        action: "rolled_over",
      });
      await logClubActivity(season.club_id, "season_started", {
        season_name: newSeasonName,
        previous_season: season.name,
      });
    }
  }

  return { rolledOver: rolledOverCount > 0 };
}

export async function concludeSeason(clubId: string): Promise<{
  error?: string;
  newSeasonName?: string;
}> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { error: "You must be signed in" };
  }

  // Check user is producer or director
  const { data: membership } = await supabase
    .from("club_members")
    .select("role")
    .eq("club_id", clubId)
    .eq("user_id", user.id)
    .maybeSingle();

  if (!membership || (membership.role !== "producer" && membership.role !== "director")) {
    return { error: "Only producers and directors can conclude seasons" };
  }

  // Get current active season
  const now = new Date();
  const { data: currentSeason } = await supabase
    .from("seasons")
    .select("id, name, subtitle, end_date")
    .eq("club_id", clubId)
    .lte("start_date", now.toISOString())
    .or(`end_date.is.null,end_date.gte.${now.toISOString()}`)
    .order("start_date", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!currentSeason) {
    return { error: "No active season found" };
  }

  // Check for active standard festivals (nominating status)
  const { data: standardActiveFestivals } = await supabase
    .from("festivals")
    .select("id")
    .eq("season_id", currentSeason.id)
    .eq("status", "nominating")
    .limit(1);

  if (standardActiveFestivals && standardActiveFestivals.length > 0) {
    return {
      error:
        "Cannot conclude season with active festivals. Complete or cancel active festivals first.",
    };
  }

  // Check for any watching festivals in this season
  const { data: watchingFestivals } = await supabase
    .from("festivals")
    .select("id")
    .eq("season_id", currentSeason.id)
    .eq("status", "watching")
    .limit(1);

  if (watchingFestivals && watchingFestivals.length > 0) {
    return {
      error:
        "Cannot conclude season with active festivals. Complete or cancel active festivals first.",
    };
  }

  // Conclude current season (set end_date to now)
  const { error: concludeError } = await supabase
    .from("seasons")
    .update({ end_date: now.toISOString() })
    .eq("id", currentSeason.id);

  if (concludeError) {
    return { error: concludeError.message };
  }

  // Get all seasons for this club to determine next season number
  const { data: allSeasons } = await supabase
    .from("seasons")
    .select("name")
    .eq("club_id", clubId)
    .order("start_date", { ascending: false });

  // Extract season number from name
  const seasonNumbers = (allSeasons || [])
    .map((s) => {
      const match = s.name.match(/Season\s+(\d+)/i);
      return match ? parseInt(match[1]) : 0;
    })
    .filter((n) => n > 0);

  const nextSeasonNumber = seasonNumbers.length > 0 ? Math.max(...seasonNumbers) + 1 : 1;
  const newSeasonName = `Season ${nextSeasonNumber}`;

  // Create new season starting immediately
  const newSeasonStart = new Date(now);
  const newSeasonEnd = new Date(newSeasonStart);
  newSeasonEnd.setMonth(newSeasonEnd.getMonth() + 9); // Default: 9 months

  const { data: _newSeason, error: createError } = await supabase
    .from("seasons")
    .insert({
      club_id: clubId,
      name: newSeasonName,
      subtitle: currentSeason.subtitle, // Preserve subtitle
      start_date: newSeasonStart.toISOString(),
      end_date: newSeasonEnd.toISOString(),
    })
    .select()
    .single();

  if (createError) {
    return { error: createError.message };
  }

  // Log club activity (season ended and new one started)
  await logClubActivity(clubId, "season_ended", {
    season_name: currentSeason.name,
    action: "concluded",
  });
  await logClubActivity(clubId, "season_started", {
    season_name: newSeasonName,
    previous_season: currentSeason.name,
  });

  // Notify all club members about season end and new season start
  const { data: members } = await supabase
    .from("club_members")
    .select("user_id")
    .eq("club_id", clubId)
    .neq("user_id", user.id); // Don't notify the admin who concluded it

  if (members && members.length > 0) {
    const clubSlugForLink = await getClubSlug(supabase, clubId);

    // Notify about season end
    await createNotificationsForUsers({
      userIds: members.map((m) => m.user_id),
      type: "season_ended",
      title: "Season Ended",
      message: `"${currentSeason.name}" has concluded.`,
      link: `/club/${clubSlugForLink}`,
      clubId: clubId,
    });

    // Notify about new season start
    await createNotificationsForUsers({
      userIds: members.map((m) => m.user_id),
      type: "season_started",
      title: "New Season",
      message: `"${newSeasonName}" has started!`,
      link: `/club/${clubSlugForLink}`,
      clubId: clubId,
    });
  }

  const clubSlug = await getClubSlug(supabase, clubId);
  revalidatePath(`/club/${clubSlug}`);
  revalidatePath(`/club/${clubSlug}/history`);
  revalidatePath(`/club/${clubSlug}/settings`);

  return { newSeasonName };
}
