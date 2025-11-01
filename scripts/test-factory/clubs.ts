/**
 * Test Factory — Club Creation
 *
 * Create clubs with full settings control and member assignment.
 */

import { supabase } from "./client";

export interface ClubSettings {
  [key: string]: unknown;
}

export interface CreatedClub {
  id: string;
  slug: string;
  name: string;
}

// Preset settings for test club configurations
export const PRESET_SETTINGS: Record<string, Partial<ClubSettings>> = {
  endless: {
    festival_type: "endless",
    themes_enabled: true,
    theme_governance: "autocracy",
    max_nominations_per_user: 3,
    blind_nominations_enabled: false,
    allow_non_admin_nominations: true,
    club_ratings_enabled: true,
    rating_min: 1,
    rating_max: 5,
    rating_increment: 1,
    rating_unit: "visual",
    rating_visual_icon: "stars",
    scoring_enabled: false,
    nomination_guessing_enabled: false,
    season_standings_enabled: false,
    movie_pool_enabled: true,
    movie_pool_voting_enabled: true,
    movie_pool_governance: "autocracy",
    allow_non_admin_movie_pool: true,
  },
  standard_competitive: {
    festival_type: "standard",
    themes_enabled: true,
    theme_governance: "random",
    max_nominations_per_user: 1,
    blind_nominations_enabled: true,
    allow_non_admin_nominations: true,
    club_ratings_enabled: true,
    rating_min: 1,
    rating_max: 10,
    rating_increment: 0.5,
    rating_unit: "numbers",
    scoring_enabled: true,
    nomination_guessing_enabled: true,
    season_standings_enabled: true,
    placement_points: { type: "default" },
  },
  standard_casual: {
    festival_type: "standard",
    themes_enabled: true,
    theme_governance: "autocracy",
    max_nominations_per_user: 1,
    blind_nominations_enabled: false,
    allow_non_admin_nominations: true,
    club_ratings_enabled: true,
    rating_min: 1,
    rating_max: 10,
    rating_increment: 0.5,
    rating_unit: "numbers",
    scoring_enabled: false,
    nomination_guessing_enabled: false,
    season_standings_enabled: false,
  },
};

function generateSlug(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

/**
 * Create a club with specific settings.
 */
export async function createClub(opts: {
  name: string;
  ownerId: string;
  settings?: Partial<ClubSettings>;
  privacy?: string;
  festivalType?: "standard" | "endless";
}): Promise<CreatedClub> {
  const timestamp = Date.now().toString(36);
  const slug = `${generateSlug(opts.name)}-${timestamp}`;
  const name = `${opts.name} [${timestamp}]`;

  const settings = opts.settings || {};
  const festivalType = opts.festivalType || (settings.festival_type as string) || "standard";

  const { data: club, error } = await supabase
    .from("clubs")
    .insert({
      name,
      slug,
      producer_id: opts.ownerId,
      privacy: opts.privacy || "private",
      settings,
      festival_type: festivalType,
      // Spread top-level columns that mirror settings
      themes_enabled: settings.themes_enabled ?? true,
      theme_governance: settings.theme_governance ?? "democracy",
      scoring_enabled: settings.scoring_enabled ?? false,
      club_ratings_enabled: settings.club_ratings_enabled ?? true,
      rating_min: settings.rating_min ?? 0,
      rating_max: settings.rating_max ?? 10,
      rating_increment: settings.rating_increment ?? 0.1,
      rating_unit: settings.rating_unit ?? "numbers",
      blind_nominations_enabled: settings.blind_nominations_enabled ?? false,
      allow_non_admin_nominations: settings.allow_non_admin_nominations ?? true,
      nomination_guessing_enabled: settings.nomination_guessing_enabled ?? false,
      season_standings_enabled: settings.season_standings_enabled ?? false,
    })
    .select("id, slug, name")
    .single();

  if (error) throw new Error(`Failed to create club "${opts.name}": ${error.message}`);

  // Add owner as producer member
  await supabase.from("club_members").insert({
    club_id: club.id,
    user_id: opts.ownerId,
    role: "producer",
  });

  return { id: club.id, slug: club.slug, name: club.name };
}

/**
 * Create a club using a preset configuration.
 */
export async function createPresetClub(
  preset: "endless" | "standard_competitive" | "standard_casual",
  ownerId: string,
  namePrefix?: string
): Promise<CreatedClub> {
  const settings = PRESET_SETTINGS[preset];
  const defaultName = preset
    .split("_")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
  return createClub({
    name: `${namePrefix || defaultName} Club`,
    ownerId,
    settings,
    festivalType: settings.festival_type as "standard" | "endless",
  });
}

/**
 * Add members to a club in bulk.
 */
export async function addMembers(
  clubId: string,
  members: { userId: string; role: "producer" | "director" | "critic" }[]
): Promise<void> {
  for (const member of members) {
    const { error } = await supabase.from("club_members").upsert(
      {
        club_id: clubId,
        user_id: member.userId,
        role: member.role,
      },
      { onConflict: "club_id,user_id" }
    );
    if (error) {
      console.warn(`Warning: Could not add member ${member.userId}: ${error.message}`);
    }
  }
}

/**
 * Create a season for a club.
 * Optional opts.startDate / opts.endDate override defaults (now-7d / now+3mo).
 */
export async function createSeason(
  clubId: string,
  name?: string,
  opts?: { startDate?: string; endDate?: string }
): Promise<string> {
  let startDate: string;
  let endDate: string;

  if (opts?.startDate && opts?.endDate) {
    startDate = opts.startDate;
    endDate = opts.endDate;
  } else {
    const now = new Date();
    const start = new Date(now);
    start.setDate(start.getDate() - 7);
    const end = new Date(now);
    end.setMonth(end.getMonth() + 3);
    startDate = start.toISOString().split("T")[0];
    endDate = end.toISOString().split("T")[0];
  }

  const { data, error } = await supabase
    .from("seasons")
    .insert({
      club_id: clubId,
      name: name || `Season ${Date.now().toString(36)}`,
      start_date: startDate,
      end_date: endDate,
    })
    .select("id")
    .single();

  if (error) throw new Error(`Failed to create season: ${error.message}`);
  return data.id;
}
