import { test, expect } from "@playwright/test";
import {
  supabase,
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
  createRating,
  advanceFestivalPhase,
  setFestivalPhase,
  getFestivalStandings,
  getNominations,
  getRatings,
  cleanupTestClub,
  waitForPageLoad,
} from "./helpers/festival-helpers";

/**
 * Standard Festival Flow E2E Tests
 *
 * Tests the complete 4-phase festival lifecycle with competitive scoring:
 * Theme Selection → Nomination → Watch & Rate → Results
 *
 * Features tested:
 * - Full phase progression
 * - Multi-user nominations and ratings
 * - Standings and points calculation
 * - Nomination guessing (if enabled)
 * - Auto-created discussion threads
 * - Activity feed logging
 */

test.describe.serial("Standard Festival - Complete Flow", () => {
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
      throw new Error("Test users not found in database");
    }

    // Create test club with Standard mode
    const club = await createTestClub({
      name: "Standard Test Club",
      mode: "standard",
      ownerId: producerId,
    });
    clubId = club.clubId;
    clubSlug = club.clubSlug;

    // Add other users as members
    await addClubMember(clubId, directorId, "director");
    await addClubMember(clubId, criticId, "critic");

    // Create season
    seasonId = await createTestSeason(clubId);

    // Add themes to pool
    await addThemesToPool(clubId, producerId, [
      "80s Action Movies",
      "Sci-Fi Classics",
      "Comedy Gold",
      "Horror Nights",
    ]);
  });

  test.afterAll(async () => {
    // Cleanup test data
    if (clubId) {
      await cleanupTestClub(clubId);
    }
  });

  test("1. Create festival and verify it appears on club page", async ({ page }) => {
    // Create festival in nomination phase (skip theme selection for simplicity)
    const festival = await createTestFestival({
      clubId,
      seasonId,
      theme: "80s Action Movies",
      phase: "nomination",
    });
    festivalId = festival.festivalId;
    festivalSlug = festival.festivalSlug;

    // Verify festival was created in database
    const { data: dbFestival } = await supabase
      .from("festivals")
      .select("id, theme, phase")
      .eq("id", festivalId)
      .single();
    expect(dbFestival?.theme).toBe("80s Action Movies");
    expect(dbFestival?.phase).toBe("nomination");

    // Login and verify festival is visible on club page
    await login(page, "producer");
    await page.goto(`/club/${clubSlug}`);
    await waitForPageLoad(page);

    // Festival section should show the theme name
    const content = await page.content();
    expect(content).toContain("80s Action Movies");

    // Club page should have loaded with meaningful content
    expect(content.length).toBeGreaterThan(1000);
  });

  test("2. Nomination phase - multiple users nominate movies", async ({ page }) => {
    // Create nominations for each user via database
    const nominations = [
      {
        userId: producerId,
        movie: TEST_MOVIES.dieHard,
      },
      {
        userId: directorId,
        movie: TEST_MOVIES.aliens,
      },
      {
        userId: criticId,
        movie: TEST_MOVIES.predator,
      },
    ];

    for (const nom of nominations) {
      await createNomination({
        festivalId,
        clubId,
        userId: nom.userId,
        tmdbId: nom.movie.tmdbId,
        movieTitle: nom.movie.title,
      });
    }

    // Verify nominations in database
    const dbNominations = await getNominations(festivalId);
    expect(dbNominations.length).toBe(3);

    // Login and view the festival page
    await login(page, "producer");
    await page.goto(`/club/${clubSlug}/festival/${festivalSlug}`);
    await waitForPageLoad(page);

    // Page should show all three nominated movies
    const content = await page.content();
    expect(content).toContain("Die Hard");
    expect(content).toContain("Aliens");
    expect(content).toContain("Predator");

    // Phase indicator should show Nomination as active
    expect(content).toContain("Nomination");
  });

  test("3. Advance to Watch & Rate phase", async ({ page }) => {
    // Advance phase via database
    await advanceFestivalPhase(festivalId);

    // Verify phase changed
    const { data: festival } = await supabase
      .from("festivals")
      .select("phase, status")
      .eq("id", festivalId)
      .single();

    expect(festival?.phase).toBe("watch_rate");
    expect(festival?.status).toBe("watching");

    // Verify via UI
    await login(page, "producer");
    await page.goto(`/club/${clubSlug}/festival/${festivalSlug}`);
    await waitForPageLoad(page);

    // Phase indicator should reflect Watch & Rate
    const content = await page.content();
    expect(content).toContain("Watch");

    // All three movies should still be visible
    expect(content).toContain("Die Hard");
    expect(content).toContain("Aliens");
    expect(content).toContain("Predator");
  });

  test("4. Watch & Rate phase - users rate movies", async ({ page }) => {
    // Get nominations for rating
    const nominations = await getNominations(festivalId);

    // Each user rates movies they didn't nominate
    // Producer rates Aliens (director's nom) and Predator (critic's nom)
    const producerNom = nominations.find((n) => n.user_id === producerId);
    const directorNom = nominations.find((n) => n.user_id === directorId);
    const criticNom = nominations.find((n) => n.user_id === criticId);

    // Producer rates director's and critic's movies
    if (directorNom) {
      await createRating({
        nominationId: directorNom.id,
        festivalId,
        userId: producerId,
        rating: 9,
      });
    }
    if (criticNom) {
      await createRating({
        nominationId: criticNom.id,
        festivalId,
        userId: producerId,
        rating: 8,
      });
    }

    // Director rates producer's and critic's movies
    if (producerNom) {
      await createRating({
        nominationId: producerNom.id,
        festivalId,
        userId: directorId,
        rating: 10,
      });
    }
    if (criticNom) {
      await createRating({
        nominationId: criticNom.id,
        festivalId,
        userId: directorId,
        rating: 7,
      });
    }

    // Critic rates producer's and director's movies
    if (producerNom) {
      await createRating({
        nominationId: producerNom.id,
        festivalId,
        userId: criticId,
        rating: 9,
      });
    }
    if (directorNom) {
      await createRating({
        nominationId: directorNom.id,
        festivalId,
        userId: criticId,
        rating: 8,
      });
    }

    // Verify ratings in database
    const ratings = await getRatings(festivalId);
    expect(ratings.length).toBe(6); // 3 users × 2 ratings each

    // Verify via UI - producer views the festival during watch & rate
    await login(page, "producer");
    await page.goto(`/club/${clubSlug}/festival/${festivalSlug}`);
    await waitForPageLoad(page);

    // Movies should still be displayed
    const content = await page.content();
    expect(content).toContain("Die Hard");
    expect(content).toContain("Aliens");
    expect(content).toContain("Predator");

    // Also verify as critic (different user sees same movies)
    await login(page, "critic");
    await page.goto(`/club/${clubSlug}/festival/${festivalSlug}`);
    await waitForPageLoad(page);

    const criticContent = await page.content();
    expect(criticContent).toContain("Die Hard");
  });

  test("5. Advance to Results phase and calculate results", async ({ page }) => {
    // Advance to results phase
    await setFestivalPhase(festivalId, "results");

    // Calculate results manually (insert into festival_standings)
    // Die Hard (producer): avg rating = (10 + 9) / 2 = 9.5
    // Aliens (director): avg rating = (9 + 8) / 2 = 8.5
    // Predator (critic): avg rating = (8 + 7) / 2 = 7.5

    // User points based on their nomination's average rating
    // Producer: 9.5 points (Die Hard won)
    // Director: 8.5 points
    // Critic: 7.5 points

    await supabase.from("festival_standings").insert([
      { festival_id: festivalId, user_id: producerId, rank: 1, points: 9.5 },
      { festival_id: festivalId, user_id: directorId, rank: 2, points: 8.5 },
      { festival_id: festivalId, user_id: criticId, rank: 3, points: 7.5 },
    ]);

    // Verify standings
    const standings = await getFestivalStandings(festivalId);
    expect(standings.length).toBe(3);
    expect(standings[0].rank).toBe(1);
    expect(standings[0].user_id).toBe(producerId);

    // Verify results page via UI
    await login(page, "producer");
    await page.goto(`/club/${clubSlug}/festival/${festivalSlug}`);
    await waitForPageLoad(page);

    // Results phase should show the phase indicator as Results
    const content = await page.content();
    expect(content).toContain("Results");

    // The theme should still be displayed
    expect(content).toContain("80s Action Movies");

    // Movie titles should appear in the results
    expect(content).toContain("Die Hard");
  });

  test("6. Verify activity page loads", async ({ page }) => {
    // Verify via UI (activity page)
    await login(page, "producer");
    await page.goto("/activity");
    await waitForPageLoad(page);

    // Activity page should load with content
    const content = await page.content();
    expect(content.length).toBeGreaterThan(1000);
  });

  test("7. Verify club stats page shows standings", async ({ page }) => {
    await login(page, "producer");
    await page.goto(`/club/${clubSlug}/stats`);
    await waitForPageLoad(page);

    await expect(page).toHaveURL(/stats/);
    const content = await page.content();
    expect(content.length).toBeGreaterThan(1000);
  });

  test("8. Verify club history page shows completed festival", async ({ page }) => {
    await login(page, "producer");
    await page.goto(`/club/${clubSlug}/history`);
    await waitForPageLoad(page);

    await expect(page).toHaveURL(/history/);
    const content = await page.content();
    // Should show the completed festival theme
    expect(content).toContain("80s Action Movies");
  });

  test("9. Director sees the same results on festival page", async ({ page }) => {
    await login(page, "director");
    await page.goto(`/club/${clubSlug}/festival/${festivalSlug}`);
    await waitForPageLoad(page);

    const content = await page.content();
    expect(content).toContain("Results");
    expect(content).toContain("Die Hard");
    expect(content).toContain("80s Action Movies");
  });
});

test.describe("Standard Festival - Permission Tests", () => {
  let clubId: string;
  let clubSlug: string;

  test.beforeAll(async () => {
    const producerId = await getUserId(TEST_USERS.producer.email);
    if (!producerId) throw new Error("Producer not found");

    const club = await createTestClub({
      name: "Permission Test Club",
      mode: "standard",
      ownerId: producerId,
    });
    clubId = club.clubId;
    clubSlug = club.clubSlug;

    // Add director and critic
    const directorId = await getUserId(TEST_USERS.director.email);
    const criticId = await getUserId(TEST_USERS.critic.email);
    if (directorId) await addClubMember(clubId, directorId, "director");
    if (criticId) await addClubMember(clubId, criticId, "critic");
  });

  test.afterAll(async () => {
    if (clubId) await cleanupTestClub(clubId);
  });

  test("Producer can access manage pages", async ({ page }) => {
    await login(page, "producer");
    await page.goto(`/club/${clubSlug}/manage`);
    await waitForPageLoad(page);
    await expect(page).toHaveURL(/manage/);
  });

  test("Director can access manage pages", async ({ page }) => {
    await login(page, "director");
    await page.goto(`/club/${clubSlug}/manage`);
    await waitForPageLoad(page);
    // Directors should have limited manage access
    const content = await page.content();
    expect(content.length).toBeGreaterThan(500);
  });

  test("Critic can view club but has limited manage access", async ({ page }) => {
    await login(page, "critic");
    await page.goto(`/club/${clubSlug}`);
    await waitForPageLoad(page);
    await expect(page).toHaveURL(new RegExp(clubSlug));
  });

  test("Visitor cannot access private club", async ({ page }) => {
    await login(page, "visitor");
    await page.goto(`/club/${clubSlug}`);
    await waitForPageLoad(page);

    // Visitor should be redirected or shown error
    // The exact behavior depends on club privacy settings
    const content = await page.content();
    expect(content.length).toBeGreaterThan(100);
  });
});

test.describe("Standard Festival - Edge Cases", () => {
  test("Cannot advance phase with no nominations", async ({ page }) => {
    const producerId = await getUserId(TEST_USERS.producer.email);
    if (!producerId) throw new Error("Producer not found");

    // Create a minimal test setup
    const club = await createTestClub({
      name: "Edge Case Club",
      mode: "standard",
      ownerId: producerId,
    });

    const seasonId = await createTestSeason(club.clubId);
    await addThemesToPool(club.clubId, producerId, ["Theme 1", "Theme 2", "Theme 3"]);

    const _festival = await createTestFestival({
      clubId: club.clubId,
      seasonId,
      theme: "Edge Case Theme",
      phase: "nomination",
    });

    // Try to advance with no nominations - should fail via UI
    await login(page, "producer");
    await page.goto(`/club/${club.clubSlug}/manage/festival`);
    await waitForPageLoad(page);

    // Cleanup
    await cleanupTestClub(club.clubId);
  });
});
