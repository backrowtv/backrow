import { Page, expect } from "@playwright/test";
import { createClient } from "@supabase/supabase-js";
import { config } from "dotenv";
import { resolve } from "path";

// Load environment variables from .env.local
config({ path: resolve(process.cwd(), ".env.local") });

/**
 * Festival E2E Test Helpers
 *
 * Provides utilities for comprehensive festival flow testing.
 * Uses direct database access for test data setup and verification.
 */

// Test configuration
export const TEST_USERS = {
  producer: { email: "producer@test.backrow.tv", password: "TestPassword123!" },
  director: { email: "director@test.backrow.tv", password: "TestPassword123!" },
  critic: { email: "critic@test.backrow.tv", password: "TestPassword123!" },
  visitor: { email: "visitor@test.backrow.tv", password: "TestPassword123!" },
} as const;

// Supabase client for direct database access (service role for bypassing RLS)
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!supabaseUrl || !supabaseServiceKey) {
  throw new Error(
    "Missing Supabase environment variables. Ensure .env.local contains NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY"
  );
}

export const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

// Festival type configurations
export type FestivalType = "standard" | "endless";

export const FESTIVAL_TYPE_SETTINGS: Record<
  FestivalType,
  {
    scoringEnabled: boolean;
    nominationGuessingEnabled: boolean;
    ratingScale: string;
    seasonStandingsEnabled: boolean;
  }
> = {
  standard: {
    scoringEnabled: true,
    nominationGuessingEnabled: true,
    ratingScale: "1-10",
    seasonStandingsEnabled: true,
  },
  endless: {
    scoringEnabled: false,
    nominationGuessingEnabled: false,
    ratingScale: "1-5",
    seasonStandingsEnabled: false,
  },
};

// Test movie IDs (well-known TMDB movies)
export const TEST_MOVIES = {
  dieHard: { tmdbId: 562, title: "Die Hard" },
  aliens: { tmdbId: 679, title: "Aliens" },
  predator: { tmdbId: 106, title: "Predator" },
  terminator: { tmdbId: 218, title: "The Terminator" },
  backToTheFuture: { tmdbId: 105, title: "Back to the Future" },
};

// ============================================
// AUTHENTICATION HELPERS
// ============================================

export async function login(page: Page, user: keyof typeof TEST_USERS) {
  // Clear auth cookies to ensure clean login state
  await page.context().clearCookies();

  await page.goto("/sign-in");
  await page.waitForLoadState("networkidle");

  // If still redirected (cached session), wait and retry
  if (!page.url().includes("sign-in")) {
    await page.goto("/sign-in");
    await page.waitForLoadState("networkidle");
  }

  await page.fill('input[type="email"]', TEST_USERS[user].email);
  await page.fill('input[type="password"]', TEST_USERS[user].password);
  await page.click('button[type="submit"]');
  await page.waitForURL((url) => !url.pathname.includes("sign-in"), { timeout: 15000 });
  await page.waitForLoadState("networkidle");
}

export async function logout(page: Page) {
  // Use test auth widget if available
  const signOutButton = page.locator('button:has-text("Sign Out")');
  if (await signOutButton.isVisible({ timeout: 2000 }).catch(() => false)) {
    await signOutButton.click();
    await page.waitForLoadState("networkidle");
  }
}

// ============================================
// DATABASE HELPERS - TEST DATA SETUP
// ============================================

export async function getUserId(email: string): Promise<string | null> {
  const { data } = await supabase.from("users").select("id").eq("email", email).single();
  return data?.id || null;
}

export async function createTestClub(options: {
  name: string;
  mode: FestivalType;
  ownerId: string;
}): Promise<{ clubId: string; clubSlug: string }> {
  const timestamp = Date.now();
  const slug = options.name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");

  const uniqueSlug = `${slug}-${timestamp}`;
  const uniqueName = `${options.name} ${timestamp}`;

  const modeSettings = FESTIVAL_TYPE_SETTINGS[options.mode];

  const { data: club, error } = await supabase
    .from("clubs")
    .insert({
      name: uniqueName,
      slug: uniqueSlug,
      producer_id: options.ownerId,
      privacy: "private",
      settings: {},
      festival_type: options.mode,
      scoring_enabled: modeSettings.scoringEnabled,
      nomination_guessing_enabled: modeSettings.nominationGuessingEnabled,
      season_standings_enabled: modeSettings.seasonStandingsEnabled,
      themes_enabled: true,
      theme_governance: "autocracy",
      allow_non_admin_nominations: true,
    })
    .select()
    .single();

  if (error) throw new Error(`Failed to create club: ${error.message}`);

  // Add owner as producer
  await supabase.from("club_members").insert({
    club_id: club.id,
    user_id: options.ownerId,
    role: "producer",
  });

  return { clubId: club.id, clubSlug: uniqueSlug };
}

export async function addClubMember(
  clubId: string,
  userId: string,
  role: "producer" | "director" | "critic" = "critic"
) {
  const { error } = await supabase.from("club_members").insert({
    club_id: clubId,
    user_id: userId,
    role,
  });

  if (error && !error.message.includes("duplicate")) {
    throw new Error(`Failed to add member: ${error.message}`);
  }
}

export async function createTestSeason(clubId: string): Promise<string> {
  const now = new Date();
  const startDate = new Date(now);
  startDate.setDate(startDate.getDate() - 7); // Started a week ago

  const endDate = new Date(now);
  endDate.setMonth(endDate.getMonth() + 3); // Ends in 3 months

  const { data: season, error } = await supabase
    .from("seasons")
    .insert({
      club_id: clubId,
      name: `Test Season ${Date.now()}`,
      start_date: startDate.toISOString().split("T")[0],
      end_date: endDate.toISOString().split("T")[0],
    })
    .select()
    .single();

  if (error) throw new Error(`Failed to create season: ${error.message}`);
  return season.id;
}

export async function addThemesToPool(clubId: string, userId: string, themes: string[]) {
  for (const theme of themes) {
    await supabase.from("theme_pool").insert({
      club_id: clubId,
      theme_name: theme,
      submitted_by: userId,
      is_used: false,
    });
  }
}

export async function createTestFestival(options: {
  clubId: string;
  seasonId: string;
  theme: string;
  phase?: "theme_selection" | "nomination" | "watch_rate" | "results";
}): Promise<{ festivalId: string; festivalSlug: string }> {
  const now = new Date();

  const nominationDeadline = new Date(now);
  nominationDeadline.setDate(nominationDeadline.getDate() + 7);

  const ratingDeadline = new Date(now);
  ratingDeadline.setDate(ratingDeadline.getDate() + 14);

  const slug = options.theme
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
  const uniqueSlug = `${slug}-${Date.now()}`;

  // Map phase to status
  const phaseStatusMap: Record<string, string> = {
    theme_selection: "idle",
    nomination: "nominating",
    watch_rate: "watching",
    results: "completed",
  };

  const phase = options.phase || "nomination";
  const status = phaseStatusMap[phase] || "nominating";

  const { data: festival, error } = await supabase
    .from("festivals")
    .insert({
      club_id: options.clubId,
      season_id: options.seasonId,
      theme: options.theme,
      slug: uniqueSlug,
      phase,
      status,
      start_date: now.toISOString(),
      nomination_deadline: nominationDeadline.toISOString(),
      watch_deadline: ratingDeadline.toISOString(),
      rating_deadline: ratingDeadline.toISOString(),
      results_date: ratingDeadline.toISOString(),
      member_count_at_creation: 3,
      auto_advance: false,
    })
    .select()
    .single();

  if (error) throw new Error(`Failed to create festival: ${error.message}`);

  return { festivalId: festival.id, festivalSlug: uniqueSlug };
}

export async function createNomination(options: {
  festivalId: string;
  clubId: string;
  userId: string;
  tmdbId: number;
  movieTitle: string;
}): Promise<string> {
  // Ensure movie exists in movies table
  await supabase.from("movies").upsert(
    {
      tmdb_id: options.tmdbId,
      title: options.movieTitle,
    },
    { onConflict: "tmdb_id" }
  );

  const { data: nomination, error } = await supabase
    .from("nominations")
    .insert({
      festival_id: options.festivalId,
      user_id: options.userId,
      tmdb_id: options.tmdbId,
    })
    .select()
    .single();

  if (error) throw new Error(`Failed to create nomination: ${error.message}`);
  return nomination.id;
}

export async function createRating(options: {
  nominationId: string;
  festivalId: string;
  userId: string;
  rating: number;
}): Promise<string> {
  const { data: ratingRecord, error } = await supabase
    .from("ratings")
    .insert({
      nomination_id: options.nominationId,
      festival_id: options.festivalId,
      user_id: options.userId,
      rating: options.rating,
    })
    .select()
    .single();

  if (error) throw new Error(`Failed to create rating: ${error.message}`);
  return ratingRecord.id;
}

export async function advanceFestivalPhase(festivalId: string): Promise<void> {
  const { data: festival, error: fetchError } = await supabase
    .from("festivals")
    .select("phase, status")
    .eq("id", festivalId)
    .single();

  if (fetchError) throw new Error(`Failed to fetch festival: ${fetchError.message}`);

  const phaseOrder = ["theme_selection", "nomination", "watch_rate", "results"];
  const statusOrder = ["idle", "nominating", "watching", "completed"];
  const currentIndex = phaseOrder.indexOf(festival.phase);

  if (currentIndex >= phaseOrder.length - 1) {
    throw new Error("Festival is already at final phase");
  }

  const nextPhase = phaseOrder[currentIndex + 1];
  const nextStatus = statusOrder[currentIndex + 1];

  const { error } = await supabase
    .from("festivals")
    .update({ phase: nextPhase, status: nextStatus })
    .eq("id", festivalId);

  if (error) throw new Error(`Failed to advance phase: ${error.message}`);
}

export async function setFestivalPhase(
  festivalId: string,
  phase: "theme_selection" | "nomination" | "watch_rate" | "results"
): Promise<void> {
  const statusMap: Record<string, string> = {
    theme_selection: "idle",
    nomination: "nominating",
    watch_rate: "watching",
    results: "completed",
  };

  const { error } = await supabase
    .from("festivals")
    .update({ phase, status: statusMap[phase] })
    .eq("id", festivalId);

  if (error) throw new Error(`Failed to set phase: ${error.message}`);
}

// ============================================
// VERIFICATION HELPERS
// ============================================

export async function getDiscussionThreads(festivalId: string): Promise<
  Array<{
    id: string;
    title: string;
    festival_id: string | null;
    tmdb_id: number | null;
    thread_type: string | null;
  }>
> {
  const { data } = await supabase
    .from("discussion_threads")
    .select("id, title, festival_id, tmdb_id, thread_type")
    .eq("festival_id", festivalId);

  return data || [];
}

export async function getFestivalStandings(
  festivalId: string
): Promise<Array<{ user_id: string; rank: number; points: number }>> {
  const { data } = await supabase
    .from("festival_standings")
    .select("user_id, rank, points")
    .eq("festival_id", festivalId)
    .order("rank", { ascending: true });

  return data || [];
}

export async function getNominations(festivalId: string): Promise<
  Array<{
    id: string;
    user_id: string;
    tmdb_id: number;
  }>
> {
  const { data } = await supabase
    .from("nominations")
    .select("id, user_id, tmdb_id")
    .eq("festival_id", festivalId)
    .is("deleted_at", null);

  return data || [];
}

export async function getRatings(
  festivalId: string
): Promise<Array<{ id: string; user_id: string; nomination_id: string; rating: number }>> {
  const { data } = await supabase
    .from("ratings")
    .select("id, user_id, nomination_id, rating")
    .eq("festival_id", festivalId);

  return data || [];
}

export async function getActivityFeedEntries(
  clubId: string,
  limit: number = 20
): Promise<Array<{ item_type: string; metadata: Record<string, unknown> }>> {
  const { data } = await supabase
    .from("club_activity")
    .select("item_type, metadata")
    .eq("club_id", clubId)
    .order("created_at", { ascending: false })
    .limit(limit);

  return data || [];
}

// ============================================
// CLEANUP HELPERS
// ============================================

export async function cleanupTestClub(clubId: string): Promise<void> {
  // Get festival IDs for this club first
  const { data: festivals } = await supabase.from("festivals").select("id").eq("club_id", clubId);
  const festivalIds = festivals?.map((f) => f.id) || [];

  // Get thread IDs for this club
  const { data: threads } = await supabase
    .from("discussion_threads")
    .select("id")
    .eq("club_id", clubId);
  const threadIds = threads?.map((t) => t.id) || [];

  // Delete in order to respect foreign key constraints
  if (festivalIds.length > 0) {
    await supabase.from("ratings").delete().in("festival_id", festivalIds);
    await supabase.from("nominations").delete().in("festival_id", festivalIds);
  }

  if (festivalIds.length > 0) {
    await supabase.from("festival_results").delete().in("festival_id", festivalIds);
    await supabase.from("festival_standings").delete().in("festival_id", festivalIds);
  }

  if (threadIds.length > 0) {
    await supabase.from("discussion_comments").delete().in("thread_id", threadIds);
  }

  await supabase.from("discussion_threads").delete().eq("club_id", clubId);
  await supabase.from("festivals").delete().eq("club_id", clubId);
  await supabase.from("seasons").delete().eq("club_id", clubId);
  await supabase.from("theme_pool").delete().eq("club_id", clubId);
  await supabase.from("club_activity").delete().eq("club_id", clubId);
  await supabase.from("club_members").delete().eq("club_id", clubId);
  await supabase.from("clubs").delete().eq("id", clubId);
}

// ============================================
// UI ASSERTION HELPERS
// ============================================

export async function expectPhaseIndicator(page: Page, expectedPhase: string) {
  // Look for phase indicator in various common locations
  const phaseText = await page
    .locator(`text=${expectedPhase}`)
    .first()
    .isVisible({ timeout: 5000 })
    .catch(() => false);

  expect(phaseText).toBeTruthy();
}

export async function expectNominationCount(page: Page, count: number) {
  const content = await page.content();
  expect(content).toContain(`${count}`);
}

export async function waitForPageLoad(page: Page) {
  await page.waitForLoadState("networkidle");
  await page.waitForTimeout(500); // Extra buffer for React hydration
}
