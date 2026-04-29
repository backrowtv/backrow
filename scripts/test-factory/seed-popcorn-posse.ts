/**
 * Seed: The Popcorn Posse [SANDBOX]
 *
 * Mirrors the live ocularr "Popcorn Posse" club (10 members, 7 festivals,
 * F1–F6 completed + F7 mid-watch) into the BackRow Supabase as a private
 * sandbox club owned by the existing stephen@backrow.tv user.
 *
 *   ssh stephen@192.168.1.121  →  ocularr Postgres (read-only)
 *   service-role Supabase      →  BackRow Postgres (writes)
 *
 * Idempotent. Re-running should be a no-op once the sandbox exists.
 * Teardown lives in ./teardown-popcorn-posse.ts.
 *
 * Run:  bun tsx scripts/test-factory/seed-popcorn-posse.ts
 */

import { spawnSync } from "node:child_process";
import { supabase } from "./client";
import { createUser } from "./users";

// ── Constants ───────────────────────────────────────────────────

const STEPHEN_EMAIL = "stephen@backrow.tv";
const SANDBOX_PREFIX = "ppsandbox";
const CLUB_NAME = "The Popcorn Posse [SANDBOX]";
const CLUB_SLUG = "popcorn-posse-sandbox";
const SPOOF_PASSWORD = "sandbox-throwaway-2026";
const OCULARR_HOST = "stephen@192.168.1.121";
const OCULARR_CLUB_ID = 5;

// Map BackRow expects 'results'/'completed' for finished, 'watch_rate'/'watching' for in-progress
const PHASE_MAP: Record<string, { phase: string; status: string }> = {
  idle: { phase: "results", status: "completed" },
  watching: { phase: "watch_rate", status: "watching" },
};

// ── Types (ocularr side) ────────────────────────────────────────

interface OcMember {
  user_id: number;
  username: string;
  display_name: string | null;
  club_display_name: string | null;
  is_active: boolean;
  joined_at: string;
}
interface OcTheme {
  id: number;
  theme_text: string;
  is_used: boolean;
  submitted_by: number | null;
}
interface OcSeason {
  id: number;
  season_number: number;
  name: string | null;
  subtitle: string | null;
  start_date: string;
  end_date: string;
  is_active: boolean;
}
interface OcFestival {
  id: number;
  festival_number: number;
  theme_text: string;
  phase: string;
  season_year: number;
  season_id: number | null;
  started_at: string;
  nomination_deadline: string | null;
  watching_deadline: string | null;
  ranking_deadline: string | null;
  completed_at: string | null;
  winner_user_id: number | null;
  winner_movie_id: number | null;
  winner_points: number | null;
  average_rating: number | null;
}
interface OcNomination {
  id: number;
  festival_id: number;
  user_id: number;
  tmdb_id: number;
  title: string;
  year: number | null;
  poster_path: string | null;
  overview: string | null;
  release_date: string | null;
  director: string | null;
  runtime: number | null;
  submitted_at: string;
}
interface OcRating {
  user_id: number;
  festival_id: number;
  nomination_id: number;
  watched: boolean;
  watched_at: string | null;
  rating: number | null;
}
interface OcGuess {
  user_id: number;
  festival_id: number;
  nomination_id: number;
  guessed_nominator_id: number;
  is_correct: boolean | null;
}
interface OcResult {
  festival_id: number;
  user_id: number;
  nomination_id: number;
  final_rank: number;
  average_rank: number;
  points_earned: number;
  guess_accuracy: number;
  total_votes_received: number;
}

interface OcSnapshot {
  club: { id: number; name: string; description: string | null; created_at: string };
  members: OcMember[];
  themes: OcTheme[];
  seasons: OcSeason[];
  festivals: OcFestival[];
  nominations: OcNomination[];
  ratings: OcRating[];
  guesses: OcGuess[];
  results: OcResult[];
}

// ── 0. Pull a snapshot of the live ocularr club ─────────────────

function fetchOcularrSnapshot(): OcSnapshot {
  const sql = `
WITH cfg AS (SELECT ${OCULARR_CLUB_ID}::int AS club_id)
SELECT jsonb_build_object(
  'club', (SELECT row_to_json(c) FROM clubs c, cfg WHERE c.id = cfg.club_id),
  'members', (SELECT COALESCE(json_agg(row_to_json(m)), '[]'::json)
              FROM (
                SELECT cm.user_id, u.username, u.display_name, cm.club_display_name,
                       cm.is_active, cm.joined_at
                FROM club_members cm JOIN users u ON u.id = cm.user_id, cfg
                WHERE cm.club_id = cfg.club_id
                ORDER BY cm.user_id
              ) m),
  'themes', (SELECT COALESCE(json_agg(row_to_json(t)), '[]'::json)
             FROM (
               SELECT id, theme_text, is_used, submitted_by
               FROM themes, cfg WHERE themes.club_id = cfg.club_id
               ORDER BY id
             ) t),
  'seasons', (SELECT COALESCE(json_agg(row_to_json(s)), '[]'::json)
              FROM (
                SELECT id, season_number, name, subtitle,
                       to_char(start_date, 'YYYY-MM-DD') AS start_date,
                       to_char(end_date,   'YYYY-MM-DD') AS end_date,
                       is_active
                FROM seasons, cfg WHERE seasons.club_id = cfg.club_id
                ORDER BY season_number
              ) s),
  'festivals', (SELECT COALESCE(json_agg(row_to_json(f)), '[]'::json)
                FROM (
                  SELECT id, festival_number, theme_text, phase::text AS phase,
                         season_year, season_id,
                         started_at, nomination_deadline, watching_deadline,
                         ranking_deadline, completed_at,
                         winner_user_id, winner_movie_id, winner_points, average_rating
                  FROM festivals, cfg WHERE festivals.club_id = cfg.club_id
                  ORDER BY festival_number
                ) f),
  'nominations', (SELECT COALESCE(json_agg(row_to_json(n)), '[]'::json)
                  FROM (
                    SELECT n.id, n.festival_id, n.user_id, n.tmdb_id, n.title,
                           n.year, n.poster_path, n.overview,
                           to_char(n.release_date, 'YYYY-MM-DD') AS release_date,
                           n.director, n.runtime, n.submitted_at
                    FROM nominations n
                    WHERE n.festival_id IN (SELECT id FROM festivals, cfg WHERE festivals.club_id = cfg.club_id)
                    ORDER BY n.festival_id, n.id
                  ) n),
  'ratings', (SELECT COALESCE(json_agg(row_to_json(r)), '[]'::json)
              FROM (
                SELECT wp.user_id, wp.festival_id, wp.nomination_id, wp.watched,
                       wp.watched_at, wp.rating
                FROM watch_progress wp
                WHERE wp.festival_id IN (SELECT id FROM festivals, cfg WHERE festivals.club_id = cfg.club_id)
                  AND wp.rating IS NOT NULL
                ORDER BY wp.festival_id, wp.user_id, wp.nomination_id
              ) r),
  'guesses', (SELECT COALESCE(json_agg(row_to_json(g)), '[]'::json)
              FROM (
                SELECT g.user_id, g.festival_id, g.nomination_id, g.guessed_nominator_id, g.is_correct
                FROM guesses g
                WHERE g.festival_id IN (SELECT id FROM festivals, cfg WHERE festivals.club_id = cfg.club_id)
                ORDER BY g.festival_id, g.user_id, g.nomination_id
              ) g),
  'results', (SELECT COALESCE(json_agg(row_to_json(fr)), '[]'::json)
              FROM (
                SELECT festival_id, user_id, nomination_id, final_rank,
                       average_rank::float AS average_rank,
                       points_earned::float AS points_earned,
                       guess_accuracy::float AS guess_accuracy,
                       total_votes_received
                FROM festival_results
                WHERE festival_id IN (SELECT id FROM festivals, cfg WHERE festivals.club_id = cfg.club_id)
                ORDER BY festival_id, final_rank
              ) fr)
);
`.trim();

  console.log("→ Fetching ocularr snapshot via SSH…");

  // Pass SQL via stdin (no shell escaping needed). spawnSync executes ssh
  // with array args, so OCULARR_HOST is never interpreted by a local shell.
  const result = spawnSync(
    "ssh",
    [OCULARR_HOST, "docker exec -i ocularr-db psql -U ocularr -d ocularr -t -A"],
    {
      input: sql,
      encoding: "utf8",
      maxBuffer: 64 * 1024 * 1024,
    }
  );
  if (result.status !== 0) {
    throw new Error(`ssh+psql failed (status ${result.status}): ${result.stderr}`);
  }
  return JSON.parse(result.stdout.trim()) as OcSnapshot;
}

// ── 1. Resolve user IDs (Stephen + 9 spoofed) ───────────────────

async function resolveStephen(): Promise<string> {
  const { data, error } = await supabase
    .from("users")
    .select("id")
    .eq("email", STEPHEN_EMAIL)
    .maybeSingle();
  if (error) throw new Error(`Lookup ${STEPHEN_EMAIL} failed: ${error.message}`);
  if (!data) throw new Error(`${STEPHEN_EMAIL} does not exist in BackRow auth — abort.`);
  return data.id;
}

async function buildUserMap(snap: OcSnapshot): Promise<Map<number, string>> {
  const userMap = new Map<number, string>();
  const stephenId = await resolveStephen();
  console.log(`→ Stephen (swstack) → ${stephenId}`);

  for (const m of snap.members) {
    if (m.username === "swstack") {
      userMap.set(m.user_id, stephenId);
      continue;
    }
    const email = `${SANDBOX_PREFIX}-${m.username.toLowerCase()}@backrow.test`;
    const displayName = m.club_display_name || m.display_name || m.username;
    const created = await createUser(email, displayName, SPOOF_PASSWORD);
    userMap.set(m.user_id, created.id);
    console.log(`→ ${m.username} → ${created.id}  (${email})`);
  }
  return userMap;
}

// ── 2. Upsert all referenced movies into public.movies ──────────

async function upsertMovies(snap: OcSnapshot): Promise<void> {
  const seen = new Set<number>();
  const rows: Array<Record<string, unknown>> = [];
  for (const n of snap.nominations) {
    if (seen.has(n.tmdb_id)) continue;
    seen.add(n.tmdb_id);
    const releaseYear = n.release_date
      ? parseInt(n.release_date.slice(0, 4), 10)
      : (n.year ?? null);
    rows.push({
      tmdb_id: n.tmdb_id,
      title: n.title,
      year: releaseYear,
      poster_url: n.poster_path ? `https://image.tmdb.org/t/p/w500${n.poster_path}` : null,
      overview: n.overview,
      director: n.director,
      runtime: n.runtime,
      cached_at: new Date().toISOString(),
    });
  }
  console.log(`→ Upserting ${rows.length} movies…`);
  const { error } = await supabase.from("movies").upsert(rows, { onConflict: "tmdb_id" });
  if (error) throw new Error(`movies upsert failed: ${error.message}`);
}

// ── 3. Club + members + season ──────────────────────────────────

interface CreatedClub {
  id: string;
  slug: string;
}

async function ensureClub(stephenId: string, snap: OcSnapshot): Promise<CreatedClub> {
  const { data: existing } = await supabase
    .from("clubs")
    .select("id, slug")
    .eq("slug", CLUB_SLUG)
    .maybeSingle();
  if (existing) {
    console.log(`→ Club already exists at slug=${CLUB_SLUG} (id=${existing.id})`);
    return { id: existing.id, slug: existing.slug };
  }

  const settings = {
    festival_type: "standard",
    themes_enabled: true,
    theme_governance: "democracy",
    max_nominations_per_user: 1,
    blind_nominations_enabled: false,
    allow_non_admin_nominations: true,
    rating_min: 0,
    rating_max: 10,
    rating_increment: 0.5,
    rating_unit: "numbers",
    club_ratings_enabled: true,
    scoring_enabled: true,
    nomination_guessing_enabled: true,
    season_standings_enabled: true,
  };

  const { data: club, error } = await supabase
    .from("clubs")
    .insert({
      name: CLUB_NAME,
      slug: CLUB_SLUG,
      description:
        snap.club.description ??
        "Sandbox mirror of the real Popcorn Posse club from ocularr — F1–F6 complete, F7 mid-watch.",
      producer_id: stephenId,
      privacy: "private",
      settings,
      // Top-level columns mirror the settings JSON (BackRow keeps both in sync)
      festival_type: "standard",
      themes_enabled: true,
      theme_governance: "democracy",
      max_nominations_per_user: 1,
      blind_nominations_enabled: false,
      allow_non_admin_nominations: true,
      rating_min: 0,
      rating_max: 10,
      rating_increment: 0.5,
      rating_unit: "numbers",
      club_ratings_enabled: true,
      scoring_enabled: true,
      nomination_guessing_enabled: true,
      season_standings_enabled: true,
    })
    .select("id, slug")
    .single();
  if (error) throw new Error(`club insert failed: ${error.message}`);

  console.log(`→ Created club ${CLUB_NAME} (id=${club.id})`);
  return { id: club.id, slug: club.slug };
}

async function ensureMembers(
  clubId: string,
  userMap: Map<number, string>,
  snap: OcSnapshot
): Promise<void> {
  const rows = snap.members.map((m) => ({
    club_id: clubId,
    user_id: userMap.get(m.user_id)!,
    role: m.username === "swstack" ? "producer" : "critic",
    club_display_name: m.club_display_name,
    joined_at: m.joined_at,
  }));
  console.log(`→ Upserting ${rows.length} club_members…`);
  const { error } = await supabase
    .from("club_members")
    .upsert(rows, { onConflict: "club_id,user_id" });
  if (error) throw new Error(`club_members upsert failed: ${error.message}`);
}

async function ensureSeasons(clubId: string, snap: OcSnapshot): Promise<Map<number, string>> {
  // BackRow's check_festival_dates trigger requires every festival's date range
  // to fit inside its season's range. Ocularr's own seasons (e.g. "Movie Club
  // Virgins" 2025-08-18→2025-12-31) don't cover boundary-spanning festivals like
  // F4 (Dec 7 2025 → Jan 24 2026). For a sandbox, the cleanest fix is one season
  // that bounds every festival start and results_date in the snapshot.

  const SEASON_NAME = "Movie Club Virgins";
  const { data: existing } = await supabase
    .from("seasons")
    .select("id")
    .eq("club_id", clubId)
    .eq("name", SEASON_NAME)
    .maybeSingle();

  let seasonId: string;
  if (existing) {
    seasonId = existing.id;
  } else {
    const earliestStart = snap.festivals.reduce(
      (acc, f) => (f.started_at < acc ? f.started_at : acc),
      snap.festivals[0]!.started_at
    );
    const latestEnd = snap.festivals.reduce((acc, f) => {
      const end = f.completed_at ?? f.watching_deadline ?? f.started_at;
      return end > acc ? end : acc;
    }, snap.festivals[0]!.started_at);

    // Pad the boundaries by a few days so deadlines don't tickle the constraint
    const startDate = earliestStart.slice(0, 10);
    const endDateRaw = new Date(latestEnd);
    endDateRaw.setDate(endDateRaw.getDate() + 30);
    const endDate = endDateRaw.toISOString().slice(0, 10);

    const { data, error } = await supabase
      .from("seasons")
      .insert({
        club_id: clubId,
        name: SEASON_NAME,
        subtitle: "Sandbox season — all 7 ocularr festivals",
        start_date: startDate,
        end_date: endDate,
      })
      .select("id")
      .single();
    if (error) throw new Error(`season insert failed: ${error.message}`);
    seasonId = data.id;
    console.log(`→ Created season "${SEASON_NAME}" (${startDate} → ${endDate})`);
  }

  // All ocularr seasons map to this single sandbox season
  const map = new Map<number, string>();
  for (const s of snap.seasons) map.set(s.id, seasonId);
  return map;
}

// ── 4. Theme pool ───────────────────────────────────────────────

async function ensureThemePool(
  clubId: string,
  userMap: Map<number, string>,
  snap: OcSnapshot
): Promise<void> {
  // Idempotence: if the count already matches the snapshot exactly, skip.
  // Otherwise wipe & reinsert to keep state deterministic. Duplicates are
  // allowed (migration 0016 dropped UNIQUE(club_id, theme_name)).
  const { count: existingCount } = await supabase
    .from("theme_pool")
    .select("id", { count: "exact", head: true })
    .eq("club_id", clubId);

  if (existingCount === snap.themes.length) {
    console.log(`→ theme_pool already populated (${existingCount} themes)`);
    return;
  }

  if ((existingCount ?? 0) > 0) {
    console.log(`→ Resetting theme_pool (had ${existingCount}, want ${snap.themes.length})…`);
    await supabase.from("theme_pool").delete().eq("club_id", clubId);
  }

  const rows = snap.themes.map((t) => ({
    club_id: clubId,
    theme_name: t.theme_text,
    added_by: t.submitted_by ? (userMap.get(t.submitted_by) ?? null) : null,
    is_used: t.is_used,
  }));
  console.log(`→ Inserting ${rows.length} theme_pool rows (duplicates included)…`);
  const { error } = await supabase.from("theme_pool").insert(rows);
  if (error) throw new Error(`theme_pool insert failed: ${error.message}`);
}

// ── 5. Festivals + descendants ──────────────────────────────────

async function ensureFestivals(
  clubId: string,
  userMap: Map<number, string>,
  seasonMap: Map<number, string>,
  snap: OcSnapshot
): Promise<{ festivalMap: Map<number, string>; nomMap: Map<number, string> }> {
  const festivalMap = new Map<number, string>();
  const nomMap = new Map<number, string>();

  for (const f of snap.festivals) {
    const map = PHASE_MAP[f.phase];
    if (!map) throw new Error(`Unknown ocularr phase: ${f.phase}`);

    const { data: existing } = await supabase
      .from("festivals")
      .select("id")
      .eq("club_id", clubId)
      .eq("theme", f.theme_text)
      .maybeSingle();

    let festivalId: string;
    if (existing) {
      festivalId = existing.id;
      console.log(`→ Festival F${f.festival_number} "${f.theme_text}" already exists`);
    } else {
      const { data, error } = await supabase
        .from("festivals")
        .insert({
          club_id: clubId,
          season_id: f.season_id ? (seasonMap.get(f.season_id) ?? null) : null,
          theme: f.theme_text,
          phase: map.phase,
          status: map.status,
          member_count_at_creation: 10,
          start_date: f.started_at,
          nomination_deadline: f.nomination_deadline,
          watch_deadline: f.watching_deadline,
          rating_deadline: f.ranking_deadline,
          results_date: f.completed_at,
          theme_source: "custom",
          created_at: f.started_at,
        })
        .select("id")
        .single();
      if (error) throw new Error(`festival F${f.festival_number} insert failed: ${error.message}`);
      festivalId = data.id;
      console.log(`→ Created F${f.festival_number} "${f.theme_text}" (${map.phase}/${map.status})`);
    }
    festivalMap.set(f.id, festivalId);

    await ensureNominations(festivalId, userMap, snap, f.id, nomMap);
    await ensureRatings(festivalId, userMap, nomMap, snap, f.id);
    await ensureGuesses(festivalId, userMap, nomMap, snap, f.id);

    if (f.phase === "idle") {
      await writeStandingsAndResults(festivalId, userMap, nomMap, snap, f);
    }
  }

  await ensureWatchHistory(userMap, snap);

  return { festivalMap, nomMap };
}

async function ensureWatchHistory(userMap: Map<number, string>, snap: OcSnapshot): Promise<void> {
  // Rating implies watching. Mirror every non-NULL rating in watch_history so
  // the per-member "watched count" UI on the festival page reflects ocularr.
  const seen = new Set<string>();
  const rows: Array<Record<string, unknown>> = [];
  for (const r of snap.ratings) {
    if (r.rating == null) continue;
    const userId = userMap.get(r.user_id);
    if (!userId) continue;
    const nom = snap.nominations.find((n) => n.id === r.nomination_id);
    if (!nom) continue;
    const key = `${userId}:${nom.tmdb_id}`;
    if (seen.has(key)) continue;
    seen.add(key);
    rows.push({
      user_id: userId,
      tmdb_id: nom.tmdb_id,
      first_watched_at: r.watched_at ?? new Date().toISOString(),
    });
  }
  if (rows.length === 0) return;
  console.log(`→ Upserting ${rows.length} watch_history rows…`);
  const batchSize = 500;
  for (let i = 0; i < rows.length; i += batchSize) {
    const batch = rows.slice(i, i + batchSize);
    const { error } = await supabase
      .from("watch_history")
      .upsert(batch, { onConflict: "user_id,tmdb_id" });
    if (error) throw new Error(`watch_history upsert failed: ${error.message}`);
  }
}

async function ensureNominations(
  festivalId: string,
  userMap: Map<number, string>,
  snap: OcSnapshot,
  ocFestivalId: number,
  nomMap: Map<number, string>
): Promise<void> {
  const noms = snap.nominations.filter((n) => n.festival_id === ocFestivalId);

  const { data: existing } = await supabase
    .from("nominations")
    .select("id, tmdb_id")
    .eq("festival_id", festivalId);
  const existingByTmdb = new Map<number, string>(
    (existing ?? []).map((e) => [e.tmdb_id as number, e.id as string])
  );

  for (const n of noms) {
    if (existingByTmdb.has(n.tmdb_id)) {
      nomMap.set(n.id, existingByTmdb.get(n.tmdb_id)!);
      continue;
    }
    const { data, error } = await supabase
      .from("nominations")
      .insert({
        festival_id: festivalId,
        user_id: userMap.get(n.user_id)!,
        tmdb_id: n.tmdb_id,
        pitch: null,
        created_at: n.submitted_at,
      })
      .select("id")
      .single();
    if (error) throw new Error(`nomination insert failed: ${error.message}`);
    nomMap.set(n.id, data.id);
  }
}

async function ensureRatings(
  festivalId: string,
  userMap: Map<number, string>,
  nomMap: Map<number, string>,
  snap: OcSnapshot,
  ocFestivalId: number
): Promise<void> {
  const ratings = snap.ratings.filter(
    (r) => r.festival_id === ocFestivalId && r.rating != null && r.rating >= 0.1
  );
  if (ratings.length === 0) return;

  const rows = ratings.map((r) => ({
    festival_id: festivalId,
    nomination_id: nomMap.get(r.nomination_id)!,
    user_id: userMap.get(r.user_id)!,
    rating: r.rating,
    created_at: r.watched_at ?? new Date().toISOString(),
  }));

  const batchSize = 500;
  for (let i = 0; i < rows.length; i += batchSize) {
    const batch = rows.slice(i, i + batchSize);
    const { error } = await supabase
      .from("ratings")
      .upsert(batch, { onConflict: "nomination_id,user_id" });
    if (error) throw new Error(`ratings upsert failed: ${error.message}`);
  }
}

async function ensureGuesses(
  festivalId: string,
  userMap: Map<number, string>,
  nomMap: Map<number, string>,
  snap: OcSnapshot,
  ocFestivalId: number
): Promise<void> {
  const guesses = snap.guesses.filter((g) => g.festival_id === ocFestivalId);
  if (guesses.length === 0) return;

  const byUser = new Map<number, Record<string, string>>();
  for (const g of guesses) {
    const uuidMap = byUser.get(g.user_id) ?? {};
    const newNomId = nomMap.get(g.nomination_id);
    const newGuessedId = userMap.get(g.guessed_nominator_id);
    if (newNomId && newGuessedId) uuidMap[newNomId] = newGuessedId;
    byUser.set(g.user_id, uuidMap);
  }

  const rows = [...byUser.entries()].map(([ocUserId, gMap]) => ({
    festival_id: festivalId,
    user_id: userMap.get(ocUserId)!,
    guesses: gMap,
  }));

  const userIds = rows.map((r) => r.user_id);
  await supabase
    .from("nomination_guesses")
    .delete()
    .eq("festival_id", festivalId)
    .in("user_id", userIds);

  const { error } = await supabase.from("nomination_guesses").insert(rows);
  if (error) throw new Error(`nomination_guesses insert failed: ${error.message}`);
}

// ── 6. Standings + results JSONB (ocularr-style scoring) ────────

async function writeStandingsAndResults(
  festivalId: string,
  userMap: Map<number, string>,
  nomMap: Map<number, string>,
  snap: OcSnapshot,
  f: OcFestival
): Promise<void> {
  const ocResults = snap.results
    .filter((r) => r.festival_id === f.id)
    .sort((a, b) => a.final_rank - b.final_rank);
  if (ocResults.length === 0) {
    console.warn(`  ! F${f.festival_number} marked completed but has no results — skipping`);
    return;
  }

  const N = ocResults.length;
  for (const r of ocResults) {
    const expected = N - r.final_rank + 1;
    if (Math.abs(expected - r.points_earned) > 0.01) {
      throw new Error(
        `F${f.festival_number} rank ${r.final_rank}: expected ${expected} pts, ocularr stored ${r.points_earned}`
      );
    }
  }

  const userIds = ocResults.map((r) => userMap.get(r.user_id)!);
  const { data: dbUsers } = await supabase
    .from("users")
    .select("id, display_name, email")
    .in("id", userIds);
  const userNameMap = new Map<string, string>();
  (dbUsers ?? []).forEach((u) => {
    userNameMap.set(u.id, u.display_name || u.email?.split("@")[0] || "Unknown");
  });

  const nomIds = ocResults.map((r) => nomMap.get(r.nomination_id)!);
  const { data: dbNoms } = await supabase
    .from("nominations")
    .select("id, tmdb_id, user_id")
    .in("id", nomIds);
  const { data: dbMovies } = await supabase
    .from("movies")
    .select("tmdb_id, title")
    .in(
      "tmdb_id",
      (dbNoms ?? []).map((n) => n.tmdb_id)
    );
  const movieTitleByTmdb = new Map<number, string>();
  (dbMovies ?? []).forEach((m) => movieTitleByTmdb.set(m.tmdb_id, m.title));

  // Compute correct_guesses per ocularr user
  const guessesByUser = new Map<number, OcGuess[]>();
  for (const g of snap.guesses.filter((gg) => gg.festival_id === f.id)) {
    const list = guessesByUser.get(g.user_id) ?? [];
    list.push(g);
    guessesByUser.set(g.user_id, list);
  }

  const standingsRows = ocResults.map((r) => {
    const userId = userMap.get(r.user_id)!;
    const ratingsCount = snap.ratings.filter(
      (rt) => rt.festival_id === f.id && rt.user_id === r.user_id && rt.rating != null
    ).length;
    const userGuesses = guessesByUser.get(r.user_id) ?? [];
    const correctGuesses = userGuesses.filter((g) => g.is_correct === true).length;
    return {
      festival_id: festivalId,
      user_id: userId,
      rank: r.final_rank,
      points: r.points_earned,
      nominations_count: 1,
      ratings_count: ratingsCount,
      average_rating: r.average_rank,
      correct_guesses: correctGuesses,
      guessing_accuracy: r.guess_accuracy,
      guessing_points: 0,
      created_at: f.completed_at ?? new Date().toISOString(),
    };
  });

  await supabase
    .from("festival_standings")
    .upsert(standingsRows, { onConflict: "festival_id,user_id" });

  const nominationsBlock = ocResults.map((r) => {
    const newNomId = nomMap.get(r.nomination_id);
    const dbNom = (dbNoms ?? []).find((n) => n.id === newNomId);
    return {
      nomination_id: newNomId,
      tmdb_id: dbNom?.tmdb_id,
      movie_title: dbNom ? (movieTitleByTmdb.get(dbNom.tmdb_id) ?? null) : null,
      average_rating: r.average_rank,
      rating_count: r.total_votes_received,
      nominator_user_id: userMap.get(r.user_id),
      placement: r.final_rank,
    };
  });

  const standingsBlock = standingsRows
    .map((s) => ({
      user_id: s.user_id,
      user_name: userNameMap.get(s.user_id) || "Unknown",
      points: s.points,
    }))
    .sort((a, b) => b.points - a.points);

  const nominatorReveals: Record<string, string> = {};
  ocResults.forEach((r) => {
    const newNomId = nomMap.get(r.nomination_id);
    const nominatorUuid = userMap.get(r.user_id);
    if (newNomId && nominatorUuid) nominatorReveals[newNomId] = nominatorUuid;
  });

  const guesserRecords: Array<{
    user_id: string;
    user_name: string;
    guesses: Record<string, string>;
    correct_count: number;
    total_guessed: number;
    accuracy: number;
  }> = [];
  for (const [ocUserId, ocGuesses] of guessesByUser) {
    const userId = userMap.get(ocUserId)!;
    const gMap: Record<string, string> = {};
    let correct = 0;
    for (const g of ocGuesses) {
      const newNomId = nomMap.get(g.nomination_id);
      const guessedUuid = userMap.get(g.guessed_nominator_id);
      if (newNomId && guessedUuid) {
        gMap[newNomId] = guessedUuid;
        if (g.is_correct === true) correct++;
      }
    }
    const total = ocGuesses.length;
    guesserRecords.push({
      user_id: userId,
      user_name: userNameMap.get(userId) || "Unknown",
      guesses: gMap,
      correct_count: correct,
      total_guessed: total,
      accuracy: total > 0 ? Math.round((correct / total) * 1000) / 10 : 0,
    });
  }
  guesserRecords.sort((a, b) => b.accuracy - a.accuracy);
  const totalGuessers = guesserRecords.length;
  const totalGuesses = guesserRecords.reduce((s, g) => s + g.total_guessed, 0);
  const totalCorrect = guesserRecords.reduce((s, g) => s + g.correct_count, 0);
  const avgAccuracy =
    totalGuessers > 0
      ? Math.round((guesserRecords.reduce((s, g) => s + g.accuracy, 0) / totalGuessers) * 10) / 10
      : 0;

  const results = {
    nominations: nominationsBlock,
    standings: standingsBlock,
    guesses: {
      guessers: guesserRecords,
      stats: {
        total_guessers: totalGuessers,
        total_guesses: totalGuesses,
        total_correct: totalCorrect,
        average_accuracy: avgAccuracy,
      },
      nominator_reveals: nominatorReveals,
    },
    calculated_at: new Date().toISOString(),
    member_count_at_creation: 10,
  };

  await supabase.from("festival_results").upsert(
    {
      festival_id: festivalId,
      results,
      calculated_at: new Date().toISOString(),
      is_final: true,
    },
    { onConflict: "festival_id" }
  );

  console.log(`  ✓ F${f.festival_number}: ${ocResults.length} standings + results JSONB written`);
}

// ── Main ────────────────────────────────────────────────────────

async function main() {
  console.log("=== Seed Popcorn Posse [SANDBOX] ===\n");

  const snap = fetchOcularrSnapshot();
  console.log(
    `→ Snapshot loaded: ${snap.members.length} members, ${snap.themes.length} themes, ` +
      `${snap.festivals.length} festivals, ${snap.nominations.length} nominations, ` +
      `${snap.ratings.length} ratings, ${snap.guesses.length} guesses, ${snap.results.length} result rows\n`
  );

  const userMap = await buildUserMap(snap);
  console.log("");

  await upsertMovies(snap);
  console.log("");

  const stephenId = userMap.get(snap.members.find((m) => m.username === "swstack")!.user_id)!;
  const club = await ensureClub(stephenId, snap);
  await ensureMembers(club.id, userMap, snap);
  const seasonMap = await ensureSeasons(club.id, snap);
  await ensureThemePool(club.id, userMap, snap);
  console.log("");

  await ensureFestivals(club.id, userMap, seasonMap, snap);
  console.log("");

  console.log(`✓ Sandbox ready: https://backrow.tv/clubs/${club.slug}\n`);
}

main().catch((err) => {
  console.error("Fatal:", err);
  process.exit(1);
});
