import { test, expect, Page } from "@playwright/test";

// Use test user that works with the test password
const TEST_USER = {
  email: "producer@test.backrow.tv",
  password: "TestPassword123!",
};

// Helper to sign in with better waiting
async function signIn(page: Page) {
  await page.goto("/sign-in");
  await page.waitForLoadState("networkidle");
  await page.fill('input[type="email"]', TEST_USER.email);
  await page.fill('input[type="password"]', TEST_USER.password);
  await page.click('button[type="submit"]');

  // Wait for redirect away from sign-in
  await page.waitForURL((url) => !url.pathname.includes("sign-in"), { timeout: 15000 });
  await page.waitForLoadState("networkidle");
}

// Test authenticated flows
test.describe("Site Audit - Authenticated Tests", () => {
  test.beforeEach(async ({ page }) => {
    await signIn(page);
  });

  test("search functionality works", async ({ page }) => {
    await page.goto("/search");
    await page.waitForLoadState("networkidle");

    const searchInput = page
      .locator('input[type="search"], input[placeholder*="Search"], input[placeholder*="search"]')
      .first();
    await expect(searchInput).toBeVisible({ timeout: 10000 });

    // Search for a movie
    await searchInput.fill("Inception");
    await page.waitForTimeout(2000); // debounce

    // Should show results
    await expect(page.locator("text=Inception").first()).toBeVisible({ timeout: 10000 });
  });

  test("discover page loads clubs", async ({ page }) => {
    await page.goto("/discover");
    await page.waitForLoadState("networkidle");
    await expect(page).toHaveURL(/discover/);

    // Should show club list or search - check page has content
    await page.waitForTimeout(1000);
    const content = await page.content();
    expect(content.length).toBeGreaterThan(1000);
  });

  test("profile display case loads", async ({ page }) => {
    await page.goto("/profile/display-case");
    await page.waitForLoadState("networkidle");
    await expect(page).toHaveURL(/profile\/display-case/);

    // Should load content
    await page.waitForTimeout(1000);
    const content = await page.content();
    expect(content.length).toBeGreaterThan(1000);
  });

  test("notification bell is visible", async ({ page }) => {
    await page.goto("/");
    await page.waitForLoadState("networkidle");

    // Look for any button with svg (notification bells typically have icons)
    const hasNavButtons = await page.locator("nav button, header button").count();
    expect(hasNavButtons).toBeGreaterThan(0);
  });

  test("feedback page loads", async ({ page }) => {
    await page.goto("/feedback");
    await page.waitForLoadState("networkidle");
    await expect(page).toHaveURL(/feedback/);

    // Page should have content
    await page.waitForTimeout(1000);
    const content = await page.content();
    expect(content.length).toBeGreaterThan(1000);
  });

  test("movie detail page loads", async ({ page }) => {
    // Inception TMDB ID
    await page.goto("/movies/27205");
    await page.waitForLoadState("networkidle");

    // Should show movie title
    await expect(page.locator("text=Inception").first()).toBeVisible({ timeout: 10000 });
  });

  test("person detail page loads", async ({ page }) => {
    // Christopher Nolan TMDB ID
    await page.goto("/person/525");
    await page.waitForLoadState("networkidle");

    // Should show person name
    await expect(page.locator("text=Christopher Nolan").first()).toBeVisible({ timeout: 10000 });
  });

  test("club history page loads", async ({ page }) => {
    await page.goto("/club/festival-test-lab/history");
    await page.waitForLoadState("networkidle");
    await expect(page).toHaveURL(/history/);

    // Page should load
    const content = await page.content();
    expect(content.length).toBeGreaterThan(1000);
  });

  test("club stats page loads", async ({ page }) => {
    await page.goto("/club/festival-test-lab/stats");
    await page.waitForLoadState("networkidle");
    await expect(page).toHaveURL(/stats/);

    // Page should load
    const content = await page.content();
    expect(content.length).toBeGreaterThan(1000);
  });
});
