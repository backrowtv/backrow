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
 * Standard Casual Festival Flow E2E Tests
 *
 * Standard festival with casual settings - no scoring, half-point ratings, extended reviews.
 * Focus: Deep analysis without competitive pressure.
 *
 * Key differences from competitive standard:
 * - No scoring/competition
 * - 1-10 scale with half-point increments (0.5)
 * - Extended review format (1000+ chars)
 * - Discussion-focused
 */

test.describe.serial("Standard Casual Festival - Film Criticism Mode", () => {
  let clubId: string;
  let clubSlug: string;
  let seasonId: string;
  let festivalId: string;
  let festivalSlug: string;
  let producerId: string;
  let directorId: string;
  let criticId: string;

  test.beforeAll(async () => {
    producerId = (await getUserId(TEST_USERS.producer.email)) || "";
    directorId = (await getUserId(TEST_USERS.director.email)) || "";
    criticId = (await getUserId(TEST_USERS.critic.email)) || "";

    if (!producerId || !directorId || !criticId) {
      throw new Error("Test users not found");
    }

    // Create test club with Standard Casual mode
    const club = await createTestClub({
      name: "Standard Casual Test Club",
      mode: "standard",
      ownerId: producerId,
    });
    clubId = club.clubId;
    clubSlug = club.clubSlug;

    // Verify Standard Casual settings
    const settings = FESTIVAL_TYPE_SETTINGS.standard;
    expect(settings.scoringEnabled).toBe(false);
    expect(settings.ratingScale).toBe("1-10-half");

    await addClubMember(clubId, directorId, "director");
    await addClubMember(clubId, criticId, "critic");

    seasonId = await createTestSeason(clubId);
    await addThemesToPool(clubId, producerId, [
      "Directorial Debuts",
      "Foreign Cinema",
      "Film Noir",
      "New Wave",
    ]);
  });

  test.afterAll(async () => {
    if (clubId) await cleanupTestClub(clubId);
  });

  test("1. Create Standard Casual festival", async ({ page }) => {
    const festival = await createTestFestival({
      clubId,
      seasonId,
      theme: "Directorial Debuts",
      phase: "nomination",
    });
    festivalId = festival.festivalId;
    festivalSlug = festival.festivalSlug;

    const { data: f } = await supabase.from("festivals").select("*").eq("id", festivalId).single();
    expect(f?.theme).toBe("Directorial Debuts");

    await login(page, "producer");
    await page.goto(`/club/${clubSlug}`);
    await waitForPageLoad(page);

    // Club page should display the festival theme
    const content = await page.content();
    expect(content).toContain("Directorial Debuts");
  });

  test("2. Nominate movies for analysis", async ({ page }) => {
    await createNomination({
      festivalId,
      clubId,
      userId: producerId,
      tmdbId: TEST_MOVIES.aliens.tmdbId,
      movieTitle: TEST_MOVIES.aliens.title,
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
    expect(content).toContain("Aliens");
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

    // Phase should reflect Watch & Rate
    const content = await page.content();
    expect(content).toContain("Watch");

    // Movies should still be visible
    expect(content).toContain("Aliens");
    expect(content).toContain("The Terminator");
  });

  test("4. Rate with half-point increments (Standard Casual)", async ({ page }) => {
    const nominations = await getNominations(festivalId);
    const producerNom = nominations.find((n) => n.user_id === producerId);
    const directorNom = nominations.find((n) => n.user_id === directorId);

    // Standard Casual mode allows half-point ratings (7.5, 8.5, etc.)
    if (directorNom) {
      await createRating({
        nominationId: directorNom.id,
        festivalId,
        userId: producerId,
        rating: 8.5, // Half-point rating
      });
    }

    if (producerNom) {
      await createRating({
        nominationId: producerNom.id,
        festivalId,
        userId: directorId,
        rating: 9.5, // Half-point rating
      });
    }

    const ratings = await getRatings(festivalId);
    expect(ratings.length).toBe(2);

    // Verify half-point ratings work
    const halfPointRatings = ratings.filter((r) => r.rating % 1 !== 0);
    expect(halfPointRatings.length).toBeGreaterThan(0);

    await login(page, "producer");
    await page.goto(`/club/${clubSlug}/festival/${festivalSlug}`);
    await waitForPageLoad(page);

    // Festival page should still show movies during rating
    const content = await page.content();
    expect(content).toContain("Aliens");
    expect(content).toContain("The Terminator");
  });

  test("5. Complete festival - analysis focus, no competition", async ({ page }) => {
    await setFestivalPhase(festivalId, "results");

    const { data: festival } = await supabase
      .from("festivals")
      .select("phase, status")
      .eq("id", festivalId)
      .single();
    expect(festival?.phase).toBe("results");
    expect(festival?.status).toBe("completed");

    // Standard Casual mode has no standings (no scoring)
    const { data: standings } = await supabase
      .from("festival_standings")
      .select("*")
      .eq("festival_id", festivalId);

    expect(standings?.length || 0).toBe(0);

    await login(page, "producer");
    await page.goto(`/club/${clubSlug}/festival/${festivalSlug}`);
    await waitForPageLoad(page);

    // Results phase should be indicated
    const content = await page.content();
    expect(content).toContain("Results");

    // Theme should still show
    expect(content).toContain("Directorial Debuts");

    // Movies should appear in results
    expect(content).toContain("Aliens");
    expect(content).toContain("The Terminator");

    // Standard Casual mode: scoring is disabled, so no standings/points should appear
    // (The standings table is empty for this festival -- verified in DB above)
  });

  test("6. Verify discussion threads for analysis", async ({ page }) => {
    // Create discussion thread for the festival
    await supabase.from("discussion_threads").insert({
      club_id: clubId,
      festival_id: festivalId,
      title: "Discussion: Directorial Debuts - Film Analysis",
      content: "Festival discussion thread",
      author_id: producerId,
      thread_type: "festival",
      slug: `discussion-directorial-debuts-${Date.now()}`,
    });

    const { data: threads } = await supabase
      .from("discussion_threads")
      .select("*")
      .eq("festival_id", festivalId);

    expect(threads?.length).toBeGreaterThan(0);

    await login(page, "producer");
    await page.goto(`/club/${clubSlug}/discuss`);
    await waitForPageLoad(page);
    await expect(page).toHaveURL(/discuss/);
  });
});
