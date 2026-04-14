import { test, expect } from "@playwright/test";

test.describe("Smoke Tests", () => {
  test("homepage loads for unauthenticated users", async ({ page }) => {
    await page.goto("/");

    // Should show the marketing/landing page
    await expect(page).toHaveTitle(/BackRow/);
  });

  test("discover page loads", async ({ page }) => {
    await page.goto("/discover");

    // Should show the discover page with clubs
    await expect(page.locator("h1, h2").first()).toBeVisible();
  });

  test("sign in page loads", async ({ page }) => {
    await page.goto("/sign-in");

    // Should show email and password fields
    await expect(page.locator('input[type="email"], input[name="email"]')).toBeVisible();
    await expect(page.locator('input[type="password"]')).toBeVisible();
  });

  test("sign up page loads", async ({ page }) => {
    await page.goto("/sign-up");

    // Should show the sign up form
    await expect(page.locator('input[type="email"], input[name="email"]')).toBeVisible();
  });
});
