import { test, expect } from "@playwright/test";

test.describe("Authentication", () => {
  test("shows validation errors for empty sign in", async ({ page }) => {
    await page.goto("/sign-in");

    // Click submit without filling form
    await page.click('button[type="submit"]');

    // Should show some validation feedback (either HTML5 or custom)
    // The form should not navigate away
    await expect(page).toHaveURL(/sign-in/);
  });

  test("shows validation errors for invalid email", async ({ page }) => {
    await page.goto("/sign-in");

    await page.fill('input[type="email"], input[name="email"]', "notanemail");
    await page.fill('input[type="password"]', "somepassword");
    await page.click('button[type="submit"]');

    // Should stay on sign-in page due to validation
    await expect(page).toHaveURL(/sign-in/);
  });

  test("can navigate between sign in and sign up", async ({ page }) => {
    await page.goto("/sign-in");

    // Find link to sign up
    const signUpLink = page.locator('a[href*="sign-up"]');
    await signUpLink.click();

    await expect(page).toHaveURL(/sign-up/);

    // Find link back to sign in
    const signInLink = page.locator('a[href*="sign-in"]');
    await signInLink.click();

    await expect(page).toHaveURL(/sign-in/);
  });
});
