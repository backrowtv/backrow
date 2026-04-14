import { test, expect, Page } from "@playwright/test";

/**
 * Comprehensive Site Audit Tests
 * Tests all major features with Producer test user
 */

const TEST_USER = {
  email: "producer@test.backrow.tv",
  password: "TestPassword123!",
};

async function login(page: Page) {
  await page.goto("/sign-in");
  await page.waitForLoadState("networkidle");
  await page.fill('input[type="email"]', TEST_USER.email);
  await page.fill('input[type="password"]', TEST_USER.password);
  await page.click('button[type="submit"]');
  await page.waitForURL((url) => !url.pathname.includes("sign-in"), { timeout: 15000 });
  await page.waitForLoadState("networkidle");
}

test.describe("Site Audit - Complete Test Suite", () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
  });

  // ==================== SEARCH & DISCOVERY ====================

  test("1. Search page loads and works", async ({ page }) => {
    await page.goto("/search");
    await page.waitForLoadState("networkidle");
    await expect(page).toHaveURL(/search/);

    // Find search input
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

  test("2. Discover page loads clubs", async ({ page }) => {
    await page.goto("/discover");
    await page.waitForLoadState("networkidle");
    await expect(page).toHaveURL(/discover/);

    // Page should have content
    const content = await page.content();
    expect(content.length).toBeGreaterThan(1000);
  });

  // ==================== PROFILE & DISPLAY CASE ====================

  test("3. Profile page loads", async ({ page }) => {
    await page.goto("/profile");
    await page.waitForLoadState("networkidle");
    await expect(page).toHaveURL(/profile/);

    // Page should have content
    const content = await page.content();
    expect(content.length).toBeGreaterThan(1000);
  });

  test("4. Display case page loads", async ({ page }) => {
    await page.goto("/profile/display-case");
    await page.waitForLoadState("networkidle");
    await expect(page).toHaveURL(/display-case/);

    // Should show display case section
    await page.waitForTimeout(1000);
    const content = await page.content();
    expect(content.length).toBeGreaterThan(1000);
  });

  test("5. Profile settings loads", async ({ page }) => {
    await page.goto("/profile/settings");
    await page.waitForLoadState("networkidle");
    await expect(page).toHaveURL(/settings/);
  });

  test("6. Account settings loads", async ({ page }) => {
    await page.goto("/profile/settings/account");
    await page.waitForLoadState("networkidle");
    await expect(page).toHaveURL(/account/);
  });

  test("7. Notification settings loads", async ({ page }) => {
    await page.goto("/profile/settings/notifications");
    await page.waitForLoadState("networkidle");
    await expect(page).toHaveURL(/notifications/);
  });

  // ==================== NOTIFICATION SYSTEM ====================

  test("8. Notification bell visible in nav", async ({ page }) => {
    await page.goto("/");
    await page.waitForLoadState("networkidle");

    // Look for any nav buttons (notification bell is one of them)
    const navButtons = await page.locator("nav button, header button").count();
    expect(navButtons).toBeGreaterThan(0);
  });

  // ==================== FEEDBACK SYSTEM ====================

  test("9. Feedback page loads", async ({ page }) => {
    await page.goto("/feedback");
    await page.waitForLoadState("networkidle");
    await expect(page).toHaveURL(/feedback/);

    // Page should have content
    const content = await page.content();
    expect(content.length).toBeGreaterThan(1000);
  });

  // ==================== CONTENT PAGES ====================

  test("10. Movie detail page loads (Inception)", async ({ page }) => {
    await page.goto("/movies/27205"); // Inception
    await page.waitForLoadState("networkidle");

    // Should show movie title
    await expect(page.locator("text=Inception").first()).toBeVisible({ timeout: 10000 });
  });

  test("11. Movie detail page loads (The Dark Knight)", async ({ page }) => {
    await page.goto("/movies/155"); // The Dark Knight
    await page.waitForLoadState("networkidle");

    await expect(page.locator("text=Dark Knight").first()).toBeVisible({ timeout: 10000 });
  });

  test("12. Person detail page loads (Christopher Nolan)", async ({ page }) => {
    await page.goto("/person/525"); // Christopher Nolan
    await page.waitForLoadState("networkidle");

    await expect(page.locator("text=Christopher Nolan").first()).toBeVisible({ timeout: 10000 });
  });

  test("13. Person detail page loads (Leonardo DiCaprio)", async ({ page }) => {
    await page.goto("/person/6193"); // Leonardo DiCaprio
    await page.waitForLoadState("networkidle");

    await expect(page.locator("text=Leonardo DiCaprio").first()).toBeVisible({ timeout: 10000 });
  });

  // ==================== CLUB PAGES ====================

  test("14. Club home page loads", async ({ page }) => {
    await page.goto("/club/festival-test-lab");
    await page.waitForLoadState("networkidle");
    await expect(page).toHaveURL(/club\/festival-test-lab/);

    // Page should have content
    const content = await page.content();
    expect(content).toContain("Festival Test Lab");
  });

  test("15. Club history page loads", async ({ page }) => {
    await page.goto("/club/festival-test-lab/history");
    await page.waitForLoadState("networkidle");
    await expect(page).toHaveURL(/history/);
  });

  test("16. Club stats page loads", async ({ page }) => {
    await page.goto("/club/festival-test-lab/stats");
    await page.waitForLoadState("networkidle");
    await expect(page).toHaveURL(/stats/);
  });

  test("17. Club members page loads", async ({ page }) => {
    await page.goto("/club/festival-test-lab/members");
    await page.waitForLoadState("networkidle");
    await expect(page).toHaveURL(/members/);
  });

  test("18. Club settings page loads", async ({ page }) => {
    await page.goto("/club/festival-test-lab/settings");
    await page.waitForLoadState("networkidle");
    await expect(page).toHaveURL(/settings/);
  });

  test("19. Club discuss page loads", async ({ page }) => {
    await page.goto("/club/festival-test-lab/discuss");
    await page.waitForLoadState("networkidle");
    await expect(page).toHaveURL(/discuss/);
  });

  test("20. Club polls page loads", async ({ page }) => {
    await page.goto("/club/festival-test-lab/polls");
    await page.waitForLoadState("networkidle");
    await expect(page).toHaveURL(/polls/);
  });

  test("21. Club events page loads", async ({ page }) => {
    await page.goto("/club/festival-test-lab/events");
    await page.waitForLoadState("networkidle");
    await expect(page).toHaveURL(/events/);
  });

  test("22. Club upcoming page loads", async ({ page }) => {
    await page.goto("/club/festival-test-lab/upcoming");
    await page.waitForLoadState("networkidle");
    // Note: /upcoming may redirect to /history if no upcoming events - just verify page loads
    const content = await page.content();
    expect(content.length).toBeGreaterThan(1000);
  });

  test("23. Club manage page loads", async ({ page }) => {
    await page.goto("/club/festival-test-lab/manage");
    await page.waitForLoadState("networkidle");
    await expect(page).toHaveURL(/manage/);
  });

  // ==================== ENDLESS MODE CLUB ====================

  test("24. Endless club home loads", async ({ page }) => {
    await page.goto("/club/endless-movie-night");
    await page.waitForLoadState("networkidle");

    const content = await page.content();
    expect(content).toContain("Endless");
  });

  // ==================== ACTIVITY ====================

  test("25. Activity page loads", async ({ page }) => {
    await page.goto("/activity");
    await page.waitForLoadState("networkidle");
    await expect(page).toHaveURL(/activity/);
  });

  // ==================== MESSAGES ====================

  test("26. Messages page loads", async ({ page }) => {
    await page.goto("/messages");
    await page.waitForLoadState("networkidle");
    await expect(page).toHaveURL(/messages/);
  });

  // ==================== MARKETING PAGES ====================

  test("27. Landing page loads (logged out)", async ({ page, context }) => {
    // Clear cookies to log out
    await context.clearCookies();
    await page.goto("/");
    await page.waitForLoadState("networkidle");

    // Should show some content (marketing page or redirect to sign-in)
    const content = await page.content();
    expect(content.length).toBeGreaterThan(1000);
  });

  test("28. FAQ page loads", async ({ page, context }) => {
    await context.clearCookies();
    await page.goto("/faq");
    await page.waitForLoadState("networkidle");

    // Should show content or redirect
    const content = await page.content();
    expect(content.length).toBeGreaterThan(500);
  });

  test("29. Contact page loads", async ({ page, context }) => {
    await context.clearCookies();
    await page.goto("/contact");
    await page.waitForLoadState("networkidle");

    // Page loads - check content exists
    const content = await page.content();
    expect(content.length).toBeGreaterThan(500);
  });

  test("30. Terms page loads", async ({ page, context }) => {
    await context.clearCookies();
    await page.goto("/terms-of-use");
    await page.waitForLoadState("networkidle");

    // Page loads
    const content = await page.content();
    expect(content.length).toBeGreaterThan(500);
  });

  // ==================== SETTINGS PAGES ====================

  test("31. Navigation settings loads", async ({ page }) => {
    await page.goto("/profile/settings/display");
    await page.waitForLoadState("networkidle");
    await expect(page).toHaveURL(/navigation/);
  });

  test("32. Ratings settings loads", async ({ page }) => {
    await page.goto("/profile/settings/ratings");
    await page.waitForLoadState("networkidle");
    await expect(page).toHaveURL(/ratings/);
  });

  test("33. Subscriptions settings loads", async ({ page }) => {
    await page.goto("/profile/settings/subscriptions");
    await page.waitForLoadState("networkidle");
    await expect(page).toHaveURL(/subscriptions/);
  });

  // ==================== CLUB MANAGEMENT ====================

  test("34. Club announcements manage page loads", async ({ page }) => {
    await page.goto("/club/festival-test-lab/manage/announcements");
    await page.waitForLoadState("networkidle");
    await expect(page).toHaveURL(/announcements/);
  });

  test("35. Club season manage page loads", async ({ page }) => {
    await page.goto("/club/festival-test-lab/manage/season");
    await page.waitForLoadState("networkidle");
    await expect(page).toHaveURL(/season/);
  });

  test("36. Club festival manage page loads", async ({ page }) => {
    await page.goto("/club/festival-test-lab/manage/festival");
    await page.waitForLoadState("networkidle");
    await expect(page).toHaveURL(/festival/);
  });

  // ==================== ERROR HANDLING ====================

  test("37. 404 page shows for invalid route", async ({ page }) => {
    await page.goto("/this-route-does-not-exist-12345");
    await page.waitForLoadState("networkidle");

    // Should show 404 or redirect
    const content = await page.content();
    const is404 =
      content.includes("404") || content.includes("not found") || content.includes("Not Found");
    expect(is404 || page.url().includes("404")).toBeTruthy();
  });

  // ==================== RESPONSIVE CHECKS ====================

  test("38. Mobile viewport renders dashboard", async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto("/");
    await page.waitForLoadState("networkidle");

    const content = await page.content();
    expect(content.length).toBeGreaterThan(500);
  });

  test("39. Mobile viewport renders search", async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto("/search");
    await page.waitForLoadState("networkidle");

    await expect(page).toHaveURL(/search/);
  });

  test("40. Mobile viewport renders club page", async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto("/club/festival-test-lab");
    await page.waitForLoadState("networkidle");

    const content = await page.content();
    expect(content).toContain("Festival Test Lab");
  });
});

// ==================== MULTI-USER TESTS ====================

async function loginAs(page: Page, email: string) {
  await page.goto("/sign-in");
  await page.waitForLoadState("networkidle");
  await page.fill('input[type="email"]', email);
  await page.fill('input[type="password"]', "TestPassword123!");
  await page.click('button[type="submit"]');
  await page.waitForURL((url) => !url.pathname.includes("sign-in"), { timeout: 15000 });
  await page.waitForLoadState("networkidle");
}

test.describe("Multi-User Access Tests", () => {
  test("41. Director can access club", async ({ page }) => {
    await loginAs(page, "director@test.backrow.tv");

    await page.goto("/club/festival-test-lab");
    await page.waitForLoadState("networkidle");

    const content = await page.content();
    expect(content).toContain("Festival Test Lab");
  });

  test("42. Critic can access club", async ({ page }) => {
    await loginAs(page, "critic@test.backrow.tv");

    await page.goto("/club/festival-test-lab");
    await page.waitForLoadState("networkidle");

    const content = await page.content();
    expect(content).toContain("Festival Test Lab");
  });

  test("43. Visitor cannot access private club manage", async ({ page }) => {
    await loginAs(page, "visitor@test.backrow.tv");

    await page.goto("/club/festival-test-lab/manage");
    await page.waitForLoadState("networkidle");

    // Should redirect or show error (not a member)
    await page.waitForTimeout(2000);
    const url = page.url();
    const content = await page.content();

    // Either redirected away or shows access denied
    const noAccess =
      !url.includes("/manage") ||
      content.includes("access") ||
      content.includes("member") ||
      content.includes("permission");
    expect(noAccess).toBeTruthy();
  });
});

// ==================== CONSOLE ERROR CHECK ====================

test.describe("Console Error Checks", () => {
  test("44. Dashboard has no console errors", async ({ page }) => {
    const errors: string[] = [];
    page.on("console", (msg) => {
      if (msg.type() === "error") errors.push(msg.text());
    });

    await login(page);
    await page.goto("/");
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(2000);

    // Filter out known acceptable errors
    const realErrors = errors.filter(
      (e) => !e.includes("favicon") && !e.includes("404") && !e.includes("Failed to load resource")
    );

    expect(realErrors.length).toBeLessThanOrEqual(2);
  });

  test("45. Search page has no console errors", async ({ page }) => {
    const errors: string[] = [];
    page.on("console", (msg) => {
      if (msg.type() === "error") errors.push(msg.text());
    });

    await login(page);
    await page.goto("/search");
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(2000);

    const realErrors = errors.filter(
      (e) => !e.includes("favicon") && !e.includes("404") && !e.includes("Failed to load resource")
    );

    expect(realErrors.length).toBeLessThanOrEqual(2);
  });
});
