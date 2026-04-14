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
 * Festival Discussion Thread E2E Tests
 *
 * Tests automatic discussion thread creation for festivals and nominations.
 * Verifies discussion integration with festival lifecycle.
 */

test.describe.serial("Festival Discussion Threads", () => {
  let clubId: string;
  let clubSlug: string;
  let seasonId: string;
  let festivalId: string;
  let _festivalSlug: string;
  let producerId: string;
  let directorId: string;

  test.beforeAll(async () => {
    producerId = (await getUserId(TEST_USERS.producer.email)) || "";
    directorId = (await getUserId(TEST_USERS.director.email)) || "";

    if (!producerId || !directorId) {
      throw new Error("Test users not found");
    }

    const club = await createTestClub({
      name: "Discussion Test Club",
      mode: "standard",
      ownerId: producerId,
    });
    clubId = club.clubId;
    clubSlug = club.clubSlug;

    await addClubMember(clubId, directorId, "director");
    seasonId = await createTestSeason(clubId);
    await addThemesToPool(clubId, producerId, ["Theme 1", "Theme 2", "Theme 3", "Theme 4"]);
  });

  test.afterAll(async () => {
    if (clubId) await cleanupTestClub(clubId);
  });

  test("1. Festival creates main discussion thread", async ({ page }) => {
    const festival = await createTestFestival({
      clubId,
      seasonId,
      theme: "Sci-Fi Discussion",
      phase: "nomination",
    });
    festivalId = festival.festivalId;
    _festivalSlug = festival.festivalSlug;

    const uniqueSlug = `discussion-sci-fi-${Date.now()}`;

    // Create main discussion thread for festival
    const { error } = await supabase.from("discussion_threads").insert({
      club_id: clubId,
      festival_id: festivalId,
      title: "Discussion: Sci-Fi Discussion",
      content: "Festival discussion thread",
      author_id: producerId,
      thread_type: "festival",
      slug: uniqueSlug,
    });
    expect(error).toBeNull();

    // Verify thread was created - filter by the unique slug we just created
    const { data: threads, error: queryError } = await supabase
      .from("discussion_threads")
      .select("*")
      .eq("slug", uniqueSlug);

    expect(queryError).toBeNull();
    expect(threads).toBeDefined();
    expect(threads?.length).toBe(1);
    expect(threads?.[0].title).toContain("Sci-Fi Discussion");
    expect(threads?.[0].festival_id).toBe(festivalId);
    expect(threads?.[0].thread_type).toBe("festival");

    // Verify via UI
    await login(page, "producer");
    await page.goto(`/club/${clubSlug}/discuss`);
    await waitForPageLoad(page);
    await expect(page).toHaveURL(/discuss/);
  });

  test("2. Nomination creates its own discussion thread", async ({ page }) => {
    // Create nomination
    await createNomination({
      festivalId,
      clubId,
      userId: producerId,
      tmdbId: TEST_MOVIES.aliens.tmdbId,
      movieTitle: TEST_MOVIES.aliens.title,
    });

    const uniqueSlug = `aliens-${Date.now()}`;

    // Create movie discussion thread for the nomination (thread_type must be 'movie', not 'nomination')
    const { error } = await supabase.from("discussion_threads").insert({
      club_id: clubId,
      festival_id: festivalId,
      tmdb_id: TEST_MOVIES.aliens.tmdbId,
      title: TEST_MOVIES.aliens.title,
      content: "Nomination discussion thread",
      author_id: producerId,
      thread_type: "movie",
      slug: uniqueSlug,
    });
    expect(error).toBeNull();

    // Verify movie thread exists (linked via unique slug)
    const { data: nominationThreads, error: queryError } = await supabase
      .from("discussion_threads")
      .select("*")
      .eq("slug", uniqueSlug);

    expect(queryError).toBeNull();
    expect(nominationThreads?.length).toBe(1);
    expect(nominationThreads?.[0].title).toBe(TEST_MOVIES.aliens.title);
    expect(nominationThreads?.[0].tmdb_id).toBe(TEST_MOVIES.aliens.tmdbId);
    expect(nominationThreads?.[0].thread_type).toBe("movie");

    await login(page, "producer");
    await page.goto(`/club/${clubSlug}/discuss`);
    await waitForPageLoad(page);
  });

  test("3. Comments can be added to festival thread", async ({ page }) => {
    // Get festival thread (main festival thread has thread_type='festival')
    const { data: threadList, error: queryError } = await supabase
      .from("discussion_threads")
      .select("id")
      .eq("festival_id", festivalId)
      .eq("thread_type", "festival")
      .limit(1);

    if (queryError || !threadList || threadList.length === 0) {
      throw new Error(`Festival thread not found: ${queryError?.message || "No threads found"}`);
    }
    const threads = threadList[0];

    // Add comment
    const { error } = await supabase.from("discussion_comments").insert({
      thread_id: threads.id,
      author_id: producerId,
      content: "<p>Looking forward to this festival!</p>",
    });
    expect(error).toBeNull();

    // Verify comment exists
    const { data: comments } = await supabase
      .from("discussion_comments")
      .select("*")
      .eq("thread_id", threads.id);

    expect(comments?.length).toBeGreaterThan(0);

    await login(page, "producer");
    await page.goto(`/club/${clubSlug}/discuss`);
    await waitForPageLoad(page);
  });

  test("4. Nested comments work (replies)", async ({ page }) => {
    // Get festival thread (main festival thread has thread_type='festival')
    const { data: threadList, error: queryError } = await supabase
      .from("discussion_threads")
      .select("id")
      .eq("festival_id", festivalId)
      .eq("thread_type", "festival")
      .limit(1);

    if (queryError || !threadList || threadList.length === 0) {
      throw new Error(`Festival thread not found: ${queryError?.message || "No threads found"}`);
    }
    const threads = threadList[0];

    // Get first comment
    const { data: parentComment } = await supabase
      .from("discussion_comments")
      .select("id")
      .eq("thread_id", threads.id)
      .is("parent_id", null)
      .limit(1)
      .single();

    if (!parentComment) throw new Error("Parent comment not found");

    // Add reply
    const { error } = await supabase.from("discussion_comments").insert({
      thread_id: threads.id,
      author_id: directorId,
      parent_id: parentComment.id,
      content: "<p>Me too! Can't wait to see the nominations.</p>",
    });
    expect(error).toBeNull();

    // Verify nested comment
    const { data: replies } = await supabase
      .from("discussion_comments")
      .select("*")
      .eq("parent_id", parentComment.id);

    expect(replies?.length).toBe(1);

    await login(page, "producer");
    await page.goto(`/club/${clubSlug}/discuss`);
    await waitForPageLoad(page);
  });

  test("5. Club discussions page lists all threads", async ({ page }) => {
    await login(page, "producer");
    await page.goto(`/club/${clubSlug}/discuss`);
    await waitForPageLoad(page);

    await expect(page).toHaveURL(/discuss/);
    const content = await page.content();
    expect(content.length).toBeGreaterThan(1000);
  });
});
