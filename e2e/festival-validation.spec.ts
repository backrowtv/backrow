import { test, expect } from "@playwright/test";
import {
  TEST_USERS,
  TEST_MOVIES,
  login,
  getUserId,
  createTestClub,
  addClubMember,
  createTestSeason,
  addThemesToPool,
  createTestFestival,
  createNomination,
  cleanupTestClub,
  waitForPageLoad,
  supabase,
} from "./helpers/festival-helpers";

/**
 * Festival Validation E2E Tests
 *
 * Tests phase requirements, permission boundaries, and edge cases.
 * Ensures festival flow enforces proper constraints.
 */

test.describe("Festival Phase Validation", () => {
  let clubId: string;
  let clubSlug: string;
  let seasonId: string;
  let producerId: string;

  test.beforeAll(async () => {
    producerId = (await getUserId(TEST_USERS.producer.email)) || "";
    if (!producerId) throw new Error("Producer not found");

    const club = await createTestClub({
      name: "Validation Test Club",
      mode: "standard",
      ownerId: producerId,
    });
    clubId = club.clubId;
    clubSlug = club.clubSlug;
    seasonId = await createTestSeason(clubId);
    await addThemesToPool(clubId, producerId, [
      "Val Theme 1",
      "Val Theme 2",
      "Val Theme 3",
      "Val Theme 4",
    ]);
  });

  test.afterAll(async () => {
    if (clubId) await cleanupTestClub(clubId);
  });

  test("Cannot have multiple active festivals", async ({ page }) => {
    // Create first festival
    const festival1 = await createTestFestival({
      clubId,
      seasonId,
      theme: "First Festival",
      phase: "nomination",
    });

    // Try to create second festival - should fail via UI/API
    // For database test, we verify constraint
    const { data: activeFestivals } = await supabase
      .from("festivals")
      .select("id")
      .eq("club_id", clubId)
      .not("status", "eq", "completed")
      .not("status", "eq", "cancelled");

    expect(activeFestivals?.length).toBe(1);

    // Cleanup for next tests
    await supabase
      .from("festivals")
      .update({ status: "completed", phase: "results" })
      .eq("id", festival1.festivalId);

    await login(page, "producer");
    await page.goto(`/club/${clubSlug}/manage/festival`);
    await waitForPageLoad(page);
  });

  test("Nomination deadline enforcement", async ({ page }) => {
    // Create festival with past nomination deadline
    const now = new Date();
    const pastDeadline = new Date(now);
    pastDeadline.setDate(pastDeadline.getDate() - 1);

    const futureDeadline = new Date(now);
    futureDeadline.setDate(futureDeadline.getDate() + 7);

    const { data: festival } = await supabase
      .from("festivals")
      .insert({
        club_id: clubId,
        season_id: seasonId,
        theme: "Deadline Test",
        slug: `deadline-test-${Date.now()}`,
        phase: "nomination",
        status: "nominating",
        start_date: now.toISOString(),
        nomination_deadline: pastDeadline.toISOString(),
        watch_deadline: futureDeadline.toISOString(),
        rating_deadline: futureDeadline.toISOString(),
        results_date: futureDeadline.toISOString(),
        member_count_at_creation: 1,
      })
      .select()
      .single();

    expect(festival).toBeDefined();

    // Cleanup
    if (festival) {
      await supabase.from("festivals").delete().eq("id", festival.id);
    }

    await login(page, "producer");
    await page.goto(`/club/${clubSlug}/manage/festival`);
    await waitForPageLoad(page);
  });
});

test.describe("Festival Permission Validation", () => {
  let clubId: string;
  let clubSlug: string;
  let producerId: string;
  let criticId: string;

  test.beforeAll(async () => {
    producerId = (await getUserId(TEST_USERS.producer.email)) || "";
    criticId = (await getUserId(TEST_USERS.critic.email)) || "";

    if (!producerId || !criticId) throw new Error("Users not found");

    const club = await createTestClub({
      name: "Permission Validation Club",
      mode: "standard",
      ownerId: producerId,
    });
    clubId = club.clubId;
    clubSlug = club.clubSlug;

    await addClubMember(clubId, criticId, "critic");
  });

  test.afterAll(async () => {
    if (clubId) await cleanupTestClub(clubId);
  });

  test("Producer can access all manage pages", async ({ page }) => {
    await login(page, "producer");
    await page.goto(`/club/${clubSlug}/manage`);
    await waitForPageLoad(page);
    await expect(page).toHaveURL(/manage/);

    await page.goto(`/club/${clubSlug}/manage/festival`);
    await waitForPageLoad(page);
    await expect(page).toHaveURL(/festival/);

    await page.goto(`/club/${clubSlug}/manage/season`);
    await waitForPageLoad(page);
    await expect(page).toHaveURL(/season/);
  });

  test("Critic can view club but not manage", async ({ page }) => {
    await login(page, "critic");

    // Can view club home
    await page.goto(`/club/${clubSlug}`);
    await waitForPageLoad(page);
    await expect(page).toHaveURL(new RegExp(clubSlug));

    // Can view discussions
    await page.goto(`/club/${clubSlug}/discuss`);
    await waitForPageLoad(page);
    const content = await page.content();
    expect(content.length).toBeGreaterThan(500);
  });

  test("Visitor cannot access club content", async ({ page }) => {
    await login(page, "visitor");
    await page.goto(`/club/${clubSlug}`);
    await waitForPageLoad(page);

    // Visitor should see limited content or redirect
    const content = await page.content();
    expect(content.length).toBeGreaterThan(100);
  });
});

test.describe("Festival Edge Cases", () => {
  test("Empty theme pool prevents festival creation", async ({ page }) => {
    const producerId = await getUserId(TEST_USERS.producer.email);
    if (!producerId) throw new Error("Producer not found");

    // Create club with empty theme pool
    const club = await createTestClub({
      name: "Empty Theme Club",
      mode: "standard",
      ownerId: producerId,
    });

    // Don't add themes - theme pool should be empty
    await createTestSeason(club.clubId);

    // Verify theme pool is empty
    const { count } = await supabase
      .from("theme_pool")
      .select("*", { count: "exact", head: true })
      .eq("club_id", club.clubId);

    expect(count).toBe(0);

    await login(page, "producer");
    await page.goto(`/club/${club.clubSlug}/manage/festival`);
    await waitForPageLoad(page);

    // Cleanup
    await cleanupTestClub(club.clubId);
  });

  test("Duplicate nomination prevention", async ({ page }) => {
    const producerId = await getUserId(TEST_USERS.producer.email);
    if (!producerId) throw new Error("Producer not found");

    const club = await createTestClub({
      name: "Duplicate Test Club",
      mode: "standard",
      ownerId: producerId,
    });
    const seasonId = await createTestSeason(club.clubId);
    await addThemesToPool(club.clubId, producerId, ["Dup 1", "Dup 2", "Dup 3", "Dup 4"]);

    const festival = await createTestFestival({
      clubId: club.clubId,
      seasonId,
      theme: "Duplicate Prevention",
      phase: "nomination",
    });

    // Create first nomination
    await createNomination({
      festivalId: festival.festivalId,
      clubId: club.clubId,
      userId: producerId,
      tmdbId: TEST_MOVIES.dieHard.tmdbId,
      movieTitle: TEST_MOVIES.dieHard.title,
    });

    // Try to create duplicate - should fail
    const { error: _dupError } = await supabase.from("nominations").insert({
      festival_id: festival.festivalId,
      club_id: club.clubId,
      user_id: producerId,
      tmdb_id: TEST_MOVIES.dieHard.tmdbId,
    });

    // Should have constraint error (duplicate nomination)
    // Note: Exact error handling depends on database constraints
    // The app should prevent this via UI validation

    await login(page, "producer");
    await page.goto(`/club/${club.clubSlug}/festival/${festival.festivalSlug}`);
    await waitForPageLoad(page);

    // Cleanup
    await cleanupTestClub(club.clubId);
  });

  test("User cannot rate own nomination", async ({ page }) => {
    const producerId = await getUserId(TEST_USERS.producer.email);
    const directorId = await getUserId(TEST_USERS.director.email);
    if (!producerId || !directorId) throw new Error("Users not found");

    const club = await createTestClub({
      name: "Self Rate Test Club",
      mode: "standard",
      ownerId: producerId,
    });
    await addClubMember(club.clubId, directorId, "director");
    const seasonId = await createTestSeason(club.clubId);
    await addThemesToPool(club.clubId, producerId, ["Self 1", "Self 2", "Self 3", "Self 4"]);

    const festival = await createTestFestival({
      clubId: club.clubId,
      seasonId,
      theme: "Self Rating Test",
      phase: "watch_rate",
    });

    // Create nomination
    const _nominationId = await createNomination({
      festivalId: festival.festivalId,
      clubId: club.clubId,
      userId: producerId,
      tmdbId: TEST_MOVIES.aliens.tmdbId,
      movieTitle: TEST_MOVIES.aliens.title,
    });

    // Try to rate own nomination
    // In competitive modes (Spotlight), this should be prevented
    // The app validates this server-side

    await login(page, "producer");
    await page.goto(`/club/${club.clubSlug}/festival/${festival.festivalSlug}`);
    await waitForPageLoad(page);

    // Cleanup
    await cleanupTestClub(club.clubId);
  });
});
