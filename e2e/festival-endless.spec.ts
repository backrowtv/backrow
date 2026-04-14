import { test, expect } from "@playwright/test";
import {
  TEST_USERS,
  TEST_MOVIES,
  FESTIVAL_TYPE_SETTINGS,
  login,
  getUserId,
  createTestClub,
  addClubMember,
  createTestSeason,
  addThemesToPool,
  createTestFestival,
  createNomination,
  createRating,
  setFestivalPhase,
  getNominations,
  getRatings,
  cleanupTestClub,
  waitForPageLoad,
  supabase,
} from "./helpers/festival-helpers";

/**
 * Endless Festival Flow E2E Tests
 *
 * Endless mode is casual - no scoring, no competition, 1-5 star ratings.
 * Focus: Relaxed movie watching experience without competitive pressure.
 *
 * Key differences from standard:
 * - No scoring/points
 * - No standings
 * - 1-5 star rating scale
 * - No nomination guessing
 */

test.describe.serial("Endless Festival - Casual Mode Flow", () => {
  let clubId: string;
  let clubSlug: string;
  let seasonId: string;
  let festivalId: string;
  let festivalSlug: string;
  let producerId: string;
  let directorId: string;
  let criticId: string;

  test.beforeAll(async () => {
    // Get user IDs
    producerId = (await getUserId(TEST_USERS.producer.email)) || "";
    directorId = (await getUserId(TEST_USERS.director.email)) || "";
    criticId = (await getUserId(TEST_USERS.critic.email)) || "";

    if (!producerId || !directorId || !criticId) {
      throw new Error("Test users not found");
    }

    // Create test club with Endless mode
    const club = await createTestClub({
      name: "Endless Test Club",
      mode: "endless",
      ownerId: producerId,
    });
    clubId = club.clubId;
    clubSlug = club.clubSlug;

    // Verify Endless settings
    const settings = FESTIVAL_TYPE_SETTINGS.endless;
    expect(settings.scoringEnabled).toBe(false);
    expect(settings.ratingScale).toBe("1-5");

    // Add members
    await addClubMember(clubId, directorId, "director");
    await addClubMember(clubId, criticId, "critic");

    // Create season and themes
    seasonId = await createTestSeason(clubId);
    await addThemesToPool(clubId, producerId, [
      "Family Movie Night",
      "Comfort Films",
      "Feel Good",
      "Adventure",
    ]);
  });

  test.afterAll(async () => {
    if (clubId) await cleanupTestClub(clubId);
  });

  test("1. Create Endless festival", async ({ page }) => {
    const festival = await createTestFestival({
      clubId,
      seasonId,
      theme: "Family Movie Night",
      phase: "nomination",
    });
    festivalId = festival.festivalId;
    festivalSlug = festival.festivalSlug;

    // Verify festival created
    const { data: f } = await supabase.from("festivals").select("*").eq("id", festivalId).single();
    expect(f?.theme).toBe("Family Movie Night");

    // Verify via UI
    await login(page, "producer");
    await page.goto(`/club/${clubSlug}`);
    await waitForPageLoad(page);

    // Club page should show the festival theme
    const content = await page.content();
    expect(content).toContain("Family Movie Night");
  });

  test("2. Multiple users nominate movies", async ({ page }) => {
    await createNomination({
      festivalId,
      clubId,
      userId: producerId,
      tmdbId: TEST_MOVIES.backToTheFuture.tmdbId,
      movieTitle: TEST_MOVIES.backToTheFuture.title,
    });

    await createNomination({
      festivalId,
      clubId,
      userId: directorId,
      tmdbId: TEST_MOVIES.terminator.tmdbId,
      movieTitle: TEST_MOVIES.terminator.title,
    });

    const nominations = await getNominations(festivalId);
    expect(nominations.length).toBe(2);

    await login(page, "producer");
    await page.goto(`/club/${clubSlug}/festival/${festivalSlug}`);
    await waitForPageLoad(page);

    // Both nominated movies should appear
    const content = await page.content();
    expect(content).toContain("Back to the Future");
    expect(content).toContain("The Terminator");

    // Phase should show Nomination
    expect(content).toContain("Nomination");
  });

  test("3. Advance to Watch & Rate phase", async ({ page }) => {
    await setFestivalPhase(festivalId, "watch_rate");

    const { data: festival } = await supabase
      .from("festivals")
      .select("phase")
      .eq("id", festivalId)
      .single();
    expect(festival?.phase).toBe("watch_rate");

    await login(page, "producer");
    await page.goto(`/club/${clubSlug}/festival/${festivalSlug}`);
    await waitForPageLoad(page);

    // Phase should show Watch & Rate
    const content = await page.content();
    expect(content).toContain("Watch");

    // Movies should still be visible
    expect(content).toContain("Back to the Future");
    expect(content).toContain("The Terminator");
  });

  test("4. Users rate with 1-5 scale (Endless)", async ({ page }) => {
    const nominations = await getNominations(festivalId);
    const producerNom = nominations.find((n) => n.user_id === producerId);
    const directorNom = nominations.find((n) => n.user_id === directorId);

    // Rate with 1-5 scale (Endless mode)
    if (directorNom) {
      await createRating({
        nominationId: directorNom.id,
        festivalId,
        userId: producerId,
        rating: 4, // 4 out of 5 stars
      });
    }

    if (producerNom) {
      await createRating({
        nominationId: producerNom.id,
        festivalId,
        userId: directorId,
        rating: 5, // 5 out of 5 stars
      });
    }

    const ratings = await getRatings(festivalId);
    expect(ratings.length).toBe(2);

    // Verify ratings are in 1-5 range
    ratings.forEach((r) => {
      expect(r.rating).toBeGreaterThanOrEqual(1);
      expect(r.rating).toBeLessThanOrEqual(5);
    });

    await login(page, "producer");
    await page.goto(`/club/${clubSlug}/festival/${festivalSlug}`);
    await waitForPageLoad(page);

    // Movies should still be visible during rating phase
    const content = await page.content();
    expect(content).toContain("Back to the Future");
    expect(content).toContain("The Terminator");
  });

  test("5. Complete festival - no standings in Endless mode", async ({ page }) => {
    await setFestivalPhase(festivalId, "results");

    const { data: festival } = await supabase
      .from("festivals")
      .select("phase, status")
      .eq("id", festivalId)
      .single();
    expect(festival?.phase).toBe("results");
    expect(festival?.status).toBe("completed");

    // Endless mode should NOT have standings (no scoring)
    const { data: standings } = await supabase
      .from("festival_standings")
      .select("*")
      .eq("festival_id", festivalId);

    // Standings should be empty for Endless
    expect(standings?.length || 0).toBe(0);

    await login(page, "producer");
    await page.goto(`/club/${clubSlug}/festival/${festivalSlug}`);
    await waitForPageLoad(page);

    // Results phase should show
    const content = await page.content();
    expect(content).toContain("Results");

    // Theme should still be visible
    expect(content).toContain("Family Movie Night");

    // Movies should appear in results
    expect(content).toContain("Back to the Future");
    expect(content).toContain("The Terminator");
  });

  test("6. Verify club history shows Endless festival", async ({ page }) => {
    await login(page, "producer");
    await page.goto(`/club/${clubSlug}/history`);
    await waitForPageLoad(page);
    await expect(page).toHaveURL(/history/);

    // History page should show the completed festival theme
    const content = await page.content();
    expect(content).toContain("Family Movie Night");
  });

  test("7. Critic sees the same completed results", async ({ page }) => {
    await login(page, "critic");
    await page.goto(`/club/${clubSlug}/festival/${festivalSlug}`);
    await waitForPageLoad(page);

    const content = await page.content();
    expect(content).toContain("Results");
    expect(content).toContain("Family Movie Night");
    expect(content).toContain("Back to the Future");
  });
});
