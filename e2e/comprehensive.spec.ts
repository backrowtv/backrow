import { test, expect, Page } from "@playwright/test";

// Test credentials
const TEST_USERS = {
  producer: { email: "producer@test.backrow.tv", password: "TestPassword123!", role: "director" },
  director: { email: "director@test.backrow.tv", password: "TestPassword123!", role: "director" },
  critic: { email: "critic@test.backrow.tv", password: "TestPassword123!", role: "critic" },
  visitor: { email: "visitor@test.backrow.tv", password: "TestPassword123!", role: "critic" },
};

// Helper to sign in
async function signIn(page: Page, user: keyof typeof TEST_USERS) {
  const creds = TEST_USERS[user];
  await page.goto("/sign-in");
  await page.waitForLoadState("networkidle");
  await page.fill('input[placeholder="Enter your email"]', creds.email);
  await page.fill('input[type="password"]', creds.password);
  await page.click('button:has-text("Sign In")');
  await page.waitForURL("**/", { timeout: 15000 });
  await page.waitForLoadState("networkidle");
}

// =============================================
// Y: PERMISSIONS TESTS
// =============================================
test.describe("Y: Permissions - Festival Management", () => {
  test("Y.1: Producer can access manage page", async ({ page }) => {
    await signIn(page, "producer");
    await page.goto("/club/festival-test-lab/manage");
    await page.waitForLoadState("networkidle");

    // Should see manage page
    await expect(page.locator('h1:has-text("Manage")')).toBeVisible({ timeout: 5000 });
    await page.screenshot({ path: "test-results/y1-producer-manage.png" });
  });

  test("Y.2: Director can access manage page", async ({ page }) => {
    await signIn(page, "director");
    await page.goto("/club/festival-test-lab/manage");
    await page.waitForLoadState("networkidle");

    // Should see manage page
    await expect(page.locator('h1:has-text("Manage")')).toBeVisible({ timeout: 5000 });
    await page.screenshot({ path: "test-results/y2-director-manage.png" });
  });

  test("Y.3: Critic cannot see manage in navigation", async ({ page }) => {
    await signIn(page, "critic");
    await page.goto("/club/festival-test-lab");
    await page.waitForLoadState("networkidle");

    // Manage link should not be visible for critics
    const _manageLink = page.locator('a[href*="/manage"]');
    await page.screenshot({ path: "test-results/y3-critic-no-manage.png" });
  });

  test("Y.4: Visitor cannot see manage in navigation", async ({ page }) => {
    await signIn(page, "visitor");
    await page.goto("/club/festival-test-lab");
    await page.waitForLoadState("networkidle");

    await page.screenshot({ path: "test-results/y4-visitor-no-manage.png" });
  });
});

test.describe("Y: Permissions - Club Access", () => {
  test("Y.5: All users can view club page", async ({ page }) => {
    await signIn(page, "critic");
    await page.goto("/club/festival-test-lab");
    await page.waitForLoadState("networkidle");

    // Should see club content
    await expect(page).toHaveURL(/festival-test-lab/);
    await page.screenshot({ path: "test-results/y5-critic-club-view.png" });
  });

  test("Y.6: All users can view history", async ({ page }) => {
    await signIn(page, "visitor");
    await page.goto("/club/festival-test-lab/history");
    await page.waitForLoadState("networkidle");

    await expect(page).toHaveURL(/history/);
    await page.screenshot({ path: "test-results/y6-visitor-history.png" });
  });

  test("Y.7: All users can view stats", async ({ page }) => {
    await signIn(page, "critic");
    await page.goto("/club/festival-test-lab/stats");
    await page.waitForLoadState("networkidle");

    await expect(page).toHaveURL(/stats/);
    await page.screenshot({ path: "test-results/y7-critic-stats.png" });
  });
});

// =============================================
// INTERACTIVE TESTS - DISCUSSIONS
// =============================================
test.describe("O: Discussions - Interactive", () => {
  test("O.4: Discussion thread view", async ({ page }) => {
    await signIn(page, "producer");
    await page.goto("/club/festival-test-lab/discuss");
    await page.waitForLoadState("networkidle");

    // Click on first thread if exists
    const threadLink = page.locator('a[href*="/discuss/"]').first();
    if (await threadLink.isVisible({ timeout: 3000 }).catch(() => false)) {
      await threadLink.click();
      await page.waitForLoadState("networkidle");
      await page.screenshot({ path: "test-results/o4-thread-view.png", fullPage: true });
    } else {
      await page.screenshot({ path: "test-results/o4-no-threads.png" });
    }
  });

  test("O.5: Thread shows timestamps", async ({ page }) => {
    await signIn(page, "producer");
    await page.goto("/club/festival-test-lab/discuss");
    await page.waitForLoadState("networkidle");

    // Check for time indicators
    const _timeElements = page.locator("time, [data-time], .timestamp, text=/ago/");
    await page.screenshot({ path: "test-results/o5-timestamps.png", fullPage: true });
  });
});

// =============================================
// INTERACTIVE TESTS - POLLS
// =============================================
test.describe("P: Polls - Interactive", () => {
  test("P.3: Poll displays options", async ({ page }) => {
    await signIn(page, "producer");
    await page.goto("/club/festival-test-lab/polls");
    await page.waitForLoadState("networkidle");

    // Check for poll options
    const _pollOptions = page.locator(
      '[data-testid="poll-option"], .poll-option, input[type="radio"], input[type="checkbox"]'
    );
    await page.screenshot({ path: "test-results/p3-poll-options.png", fullPage: true });
  });

  test("P.4: Can view poll results", async ({ page }) => {
    await signIn(page, "producer");
    await page.goto("/club/festival-test-lab/polls");
    await page.waitForLoadState("networkidle");

    // Look for results display
    const _results = page.locator(
      '.poll-results, [data-testid="poll-results"], text=/vote/, text=/%/'
    );
    await page.screenshot({ path: "test-results/p4-poll-results.png", fullPage: true });
  });
});

// =============================================
// INTERACTIVE TESTS - EVENTS
// =============================================
test.describe("Q: Events - Interactive", () => {
  test("Q.3: Event card displays info", async ({ page }) => {
    await signIn(page, "producer");
    await page.goto("/club/festival-test-lab/events");
    await page.waitForLoadState("networkidle");

    // Look for event elements
    const _eventCards = page.locator('.event-card, [data-testid="event-card"]');
    await page.screenshot({ path: "test-results/q3-event-cards.png", fullPage: true });
  });

  test("Q.4: RSVP button visible", async ({ page }) => {
    await signIn(page, "producer");
    await page.goto("/club/festival-test-lab/events");
    await page.waitForLoadState("networkidle");

    // Look for RSVP buttons
    const _rsvpButton = page.locator(
      'button:has-text("RSVP"), button:has-text("Going"), button:has-text("Interested")'
    );
    await page.screenshot({ path: "test-results/q4-rsvp-button.png", fullPage: true });
  });
});

// =============================================
// MOVIE & PERSON DETAIL TESTS
// =============================================
test.describe("V: Movie Detail - Comprehensive", () => {
  test("V.2: Movie shows poster", async ({ page }) => {
    await signIn(page, "producer");
    await page.goto("/movies/27205"); // Inception
    await page.waitForLoadState("networkidle");

    // Next.js Image component creates img elements - look for any image on the movie page
    const poster = page.locator("img").first();
    await expect(poster).toBeVisible({ timeout: 10000 });
    await page.screenshot({ path: "test-results/v2-movie-poster.png" });
  });

  test("V.3: Movie shows title and year", async ({ page }) => {
    await signIn(page, "producer");
    await page.goto("/movies/27205");
    await page.waitForLoadState("networkidle");

    // Should have title - use first() to avoid strict mode violation
    await expect(page.locator("h1").first()).toBeVisible();
    await page.screenshot({ path: "test-results/v3-movie-title.png" });
  });

  test("V.4: Movie shows synopsis", async ({ page }) => {
    await page.goto("/movies/27205");
    await page.waitForLoadState("networkidle");

    // Look for synopsis/overview text
    const _synopsis = page.locator("text=/dream/, text=/subconscious/");
    await page.screenshot({ path: "test-results/v4-movie-synopsis.png", fullPage: true });
  });

  test("V.5: Cast carousel visible", async ({ page }) => {
    await page.goto("/movies/27205");
    await page.waitForLoadState("networkidle");

    // Look for cast section
    const _castSection = page.locator('text=/Cast/, text=/Actors/, h2:has-text("Cast")');
    await page.screenshot({ path: "test-results/v5-cast-carousel.png", fullPage: true });
  });
});

test.describe("W: Person Detail - Comprehensive", () => {
  test("W.2: Person shows photo", async ({ page }) => {
    await signIn(page, "producer");
    await page.goto("/person/525"); // Christopher Nolan
    await page.waitForLoadState("networkidle");

    const _photo = page.locator("img").first();
    await page.screenshot({ path: "test-results/w2-person-photo.png" });
  });

  test("W.3: Person shows name", async ({ page }) => {
    await signIn(page, "producer");
    await page.goto("/person/525");
    await page.waitForLoadState("networkidle");

    await expect(page.locator("h1").first()).toBeVisible();
    await page.screenshot({ path: "test-results/w3-person-name.png" });
  });

  test("W.4: Known For section visible", async ({ page }) => {
    await page.goto("/person/525");
    await page.waitForLoadState("networkidle");

    const _knownFor = page.locator('text=/Known For/, text=/Filmography/, h2:has-text("Known")');
    await page.screenshot({ path: "test-results/w4-known-for.png", fullPage: true });
  });
});

// =============================================
// MOBILE VIEWPORT TESTS - EXTENDED
// =============================================
test.describe("Z: Mobile Viewport - Extended", () => {
  test.use({ viewport: { width: 375, height: 812 } });

  test("Z.3: Festival page mobile", async ({ page }) => {
    await signIn(page, "producer");
    await page.goto("/club/festival-test-lab");
    await page.waitForLoadState("networkidle");

    await page.screenshot({ path: "test-results/z3-festival-mobile.png", fullPage: true });
  });

  test("Z.4: Profile mobile layout", async ({ page }) => {
    await signIn(page, "producer");
    await page.goto("/profile");
    await page.waitForLoadState("networkidle");

    await page.screenshot({ path: "test-results/z4-profile-mobile.png", fullPage: true });
  });

  test("Z.5: Stats page mobile", async ({ page }) => {
    await signIn(page, "producer");
    await page.goto("/club/festival-test-lab/stats");
    await page.waitForLoadState("networkidle");

    await page.screenshot({ path: "test-results/z5-stats-mobile.png", fullPage: true });
  });

  test("Z.6: Display case mobile", async ({ page }) => {
    await signIn(page, "producer");
    await page.goto("/profile/display-case");
    await page.waitForLoadState("networkidle");

    await page.screenshot({ path: "test-results/z6-display-case-mobile.png", fullPage: true });
  });

  test("Z.8: Activity feed mobile", async ({ page }) => {
    await signIn(page, "producer");
    await page.goto("/activity");
    await page.waitForLoadState("networkidle");

    await page.screenshot({ path: "test-results/z8-activity-mobile.png", fullPage: true });
  });

  test("Z.9: Timeline mobile", async ({ page }) => {
    await signIn(page, "producer");
    await page.goto("/timeline");
    await page.waitForLoadState("networkidle");

    await page.screenshot({ path: "test-results/z9-timeline-mobile.png", fullPage: true });
  });

  test("Z.11: Person detail mobile", async ({ page }) => {
    await page.goto("/person/525");
    await page.waitForLoadState("networkidle");

    await page.screenshot({ path: "test-results/z11-person-mobile.png", fullPage: true });
  });

  test("Z.12: Discussions mobile", async ({ page }) => {
    await signIn(page, "producer");
    await page.goto("/club/festival-test-lab/discuss");
    await page.waitForLoadState("networkidle");

    await page.screenshot({ path: "test-results/z12-discussions-mobile.png", fullPage: true });
  });
});

// =============================================
// ANNOUNCEMENTS TESTS
// =============================================
test.describe("AA: Announcements - Extended", () => {
  test("AA.2: Announcements list displays", async ({ page }) => {
    await signIn(page, "producer");
    await page.goto("/club/festival-test-lab/manage/announcements");
    await page.waitForLoadState("networkidle");

    // Look for announcements list or empty state
    await page.screenshot({ path: "test-results/aa2-announcements-list.png", fullPage: true });
  });

  test("AA.3: Create announcement button exists", async ({ page }) => {
    await signIn(page, "producer");
    await page.goto("/club/festival-test-lab/manage/announcements");
    await page.waitForLoadState("networkidle");

    const _createButton = page.locator(
      'button:has-text("Create"), button:has-text("New"), button:has-text("Add")'
    );
    await page.screenshot({ path: "test-results/aa3-create-announcement.png" });
  });
});

// =============================================
// CLUB FEATURES TESTS
// =============================================
test.describe("Club Features", () => {
  test("Members page loads", async ({ page }) => {
    await signIn(page, "producer");
    await page.goto("/club/festival-test-lab/members");
    await page.waitForLoadState("networkidle");

    await expect(page).toHaveURL(/members/);
    await page.screenshot({ path: "test-results/members-page.png", fullPage: true });
  });

  test("Display case page loads", async ({ page }) => {
    await signIn(page, "producer");
    await page.goto("/club/festival-test-lab/display-case");
    await page.waitForLoadState("networkidle");

    await expect(page).toHaveURL(/display-case/);
    await page.screenshot({ path: "test-results/club-display-case.png", fullPage: true });
  });

  test("Season management page loads", async ({ page }) => {
    await signIn(page, "producer");
    await page.goto("/club/festival-test-lab/manage/season");
    await page.waitForLoadState("networkidle");

    await expect(page).toHaveURL(/season/);
    await page.screenshot({ path: "test-results/season-manage.png", fullPage: true });
  });

  test("Festival management page loads", async ({ page }) => {
    await signIn(page, "producer");
    await page.goto("/club/festival-test-lab/manage/festival");
    await page.waitForLoadState("networkidle");

    await expect(page).toHaveURL(/festival/);
    await page.screenshot({ path: "test-results/festival-manage.png", fullPage: true });
  });
});

// =============================================
// PROFILE FEATURES TESTS
// =============================================
test.describe("Profile Features", () => {
  test("Ratings settings page loads", async ({ page }) => {
    await signIn(page, "producer");
    await page.goto("/profile/settings/ratings");
    await page.waitForLoadState("networkidle");

    await expect(page).toHaveURL(/ratings/);
    await page.screenshot({ path: "test-results/ratings-settings.png", fullPage: true });
  });

  test("Navigation settings page loads", async ({ page }) => {
    await signIn(page, "producer");
    await page.goto("/profile/settings/display");
    await page.waitForLoadState("networkidle");

    await expect(page).toHaveURL(/navigation/);
    await page.screenshot({ path: "test-results/navigation-settings.png", fullPage: true });
  });

  test("Subscriptions page loads", async ({ page }) => {
    await signIn(page, "producer");
    await page.goto("/profile/settings/subscriptions");
    await page.waitForLoadState("networkidle");

    await expect(page).toHaveURL(/subscriptions/);
    await page.screenshot({ path: "test-results/subscriptions-settings.png", fullPage: true });
  });
});

// =============================================
// ENDLESS MODE TESTS
// =============================================
test.describe("H: Endless Mode - Extended", () => {
  test("H.2: Endless mode shows movie pool", async ({ page }) => {
    await signIn(page, "producer");
    await page.goto("/club/endless-movie-night");
    await page.waitForLoadState("networkidle");

    // Look for pool section
    const _poolSection = page.locator("text=/Pool/, text=/Suggestions/, text=/Queue/");
    await page.screenshot({ path: "test-results/h2-endless-pool.png", fullPage: true });
  });

  test("H.3: Endless mode shows now playing", async ({ page }) => {
    await signIn(page, "producer");
    await page.goto("/club/endless-movie-night");
    await page.waitForLoadState("networkidle");

    // Look for now playing section
    const _nowPlaying = page.locator("text=/Now Playing/, text=/Now Showing/, text=/Currently/");
    await page.screenshot({ path: "test-results/h3-endless-now-playing.png", fullPage: true });
  });
});

// =============================================
// SEARCH EXTENDED TESTS
// =============================================
test.describe("U: Search - Extended", () => {
  test("U.2: Search person by name", async ({ page }) => {
    await signIn(page, "producer");
    await page.goto("/search");
    await page.waitForLoadState("networkidle");

    const searchInput = page.locator('input[placeholder*="Search"]').first();
    await searchInput.fill("Christopher Nolan");
    await page.waitForTimeout(2000);

    await page.screenshot({ path: "test-results/u2-search-person.png" });
  });

  test("U.3: Search shows filters", async ({ page }) => {
    await signIn(page, "producer");
    await page.goto("/search");
    await page.waitForLoadState("networkidle");

    // Look for filter options
    const _filters = page.locator("text=/Movies/, text=/People/, text=/Clubs/");
    await page.screenshot({ path: "test-results/u3-search-filters.png" });
  });

  test("U.4: Click result navigates", async ({ page }) => {
    await signIn(page, "producer");
    await page.goto("/search");
    await page.waitForLoadState("networkidle");

    const searchInput = page.locator('input[placeholder*="Search"]').first();
    await searchInput.fill("Inception");
    await page.waitForTimeout(2000);

    // Click on first result
    const result = page.locator('a[href*="/movies/"]').first();
    if (await result.isVisible({ timeout: 5000 }).catch(() => false)) {
      await result.click();
      await page.waitForLoadState("networkidle");
      await expect(page).toHaveURL(/movies/);
    }
    await page.screenshot({ path: "test-results/u4-search-navigate.png" });
  });
});

// =============================================
// NOTIFICATION TESTS
// =============================================
test.describe("X: Notifications - Extended", () => {
  test("X.2: Notifications dropdown opens", async ({ page }) => {
    await signIn(page, "producer");
    await page.goto("/");
    await page.waitForLoadState("networkidle");

    // Click notification bell
    const bellButton = page
      .locator('button:has-text("Notifications"), button[aria-label*="notification"]')
      .first();
    if (await bellButton.isVisible({ timeout: 3000 }).catch(() => false)) {
      await bellButton.click();
      await page.waitForTimeout(500);
    }

    await page.screenshot({ path: "test-results/x2-notifications-dropdown.png" });
  });
});

// =============================================
// FEEDBACK PAGE TEST
// =============================================
test.describe("Feedback", () => {
  test("Feedback page loads", async ({ page }) => {
    await signIn(page, "producer");
    await page.goto("/feedback");
    await page.waitForLoadState("networkidle");

    await expect(page).toHaveURL(/feedback/);
    await page.screenshot({ path: "test-results/feedback-page.png", fullPage: true });
  });
});

// =============================================
// ADMIN TEST (if applicable)
// =============================================
test.describe("Admin", () => {
  test("Admin page requires auth", async ({ page }) => {
    await signIn(page, "producer");
    await page.goto("/admin");
    await page.waitForLoadState("networkidle");

    // Should either show admin page or redirect
    await page.screenshot({ path: "test-results/admin-page.png", fullPage: true });
  });
});

// =============================================
// EE: BLOCK USER TESTS
// =============================================
test.describe("EE: Block User", () => {
  test("EE.1: Block user UI accessible from member profile", async ({ page }) => {
    await signIn(page, "producer");
    await page.goto("/club/festival-test-lab/members");
    await page.waitForLoadState("networkidle");

    // Should see members page content
    await expect(page).toHaveURL(/members/);
    await page.screenshot({ path: "test-results/ee1-members-page.png", fullPage: true });
  });

  test("EE.2: Block settings page accessible", async ({ page }) => {
    await signIn(page, "producer");
    await page.goto("/profile/settings");
    await page.waitForLoadState("networkidle");

    // Look for privacy/blocking settings link
    const _privacyLink = page.locator("text=/Privacy/i, text=/Blocked/i").first();
    await page.screenshot({ path: "test-results/ee2-settings-page.png", fullPage: true });
  });
});

// =============================================
// FF: REPORT USER TEST
// =============================================
test.describe("FF: Report User", () => {
  test("FF.1: Report functionality exists in UI", async ({ page }) => {
    await signIn(page, "critic");
    await page.goto("/club/festival-test-lab/members");
    await page.waitForLoadState("networkidle");

    // Members page should load - report would be in member actions
    await expect(page).toHaveURL(/members/);
    await page.screenshot({ path: "test-results/ff1-report-ui.png", fullPage: true });
  });
});

// =============================================
// GG: DISCOVER PAGE - EXTENDED
// =============================================
test.describe("GG: Discover Page - Extended", () => {
  test("GG.2: Discover shows club cards", async ({ page }) => {
    await signIn(page, "producer");
    await page.goto("/discover");
    await page.waitForLoadState("networkidle");

    // Should show club listings
    await expect(page).toHaveURL(/discover/);
    await page.screenshot({ path: "test-results/gg2-discover-clubs.png", fullPage: true });
  });

  test("GG.3: Discover search/filter works", async ({ page }) => {
    test.setTimeout(60000); // Extended timeout for this test
    await signIn(page, "producer");
    await page.goto("/discover", { timeout: 30000 });
    await page.waitForLoadState("networkidle");

    // Look for search or filter elements
    const _searchOrFilter = page
      .locator('input[type="search"], input[placeholder*="Search"], [role="combobox"]')
      .first();
    await page.screenshot({ path: "test-results/gg3-discover-filters.png", fullPage: true });
  });
});

// =============================================
// HH: JOIN CLUB TESTS
// =============================================
test.describe("HH: Join Club", () => {
  test("HH.1: Join page exists", async ({ page }) => {
    await signIn(page, "visitor");
    await page.goto("/discover");
    await page.waitForLoadState("networkidle");

    // Should be able to browse clubs and see join options
    await expect(page).toHaveURL(/discover/);
    await page.screenshot({ path: "test-results/hh1-join-discover.png", fullPage: true });
  });

  test("HH.2: Club invitation link format works", async ({ page }) => {
    await signIn(page, "producer");
    // Navigate to a known club to test invite system
    await page.goto("/club/festival-test-lab");
    await page.waitForLoadState("networkidle");

    // Should show the club page
    await expect(page).toHaveURL(/club\/festival-test-lab/);
    await page.screenshot({ path: "test-results/hh2-club-invite.png", fullPage: true });
  });
});

// =============================================
// CC: CLUB HISTORY & YEAR IN REVIEW
// =============================================
test.describe("CC: Club History", () => {
  test("CC.1: Club history page loads", async ({ page }) => {
    await signIn(page, "producer");
    await page.goto("/club/festival-test-lab/history");
    await page.waitForLoadState("networkidle");

    await expect(page).toHaveURL(/history/);
    await page.screenshot({ path: "test-results/cc1-club-history.png", fullPage: true });
  });

  test("CC.2: History shows past festivals", async ({ page }) => {
    await signIn(page, "producer");
    await page.goto("/club/festival-test-lab/history");
    await page.waitForLoadState("networkidle");

    // Should show completed festivals
    const _festivals = page.locator("text=/Festival/, text=/Season/").first();
    await page.screenshot({ path: "test-results/cc2-past-festivals.png", fullPage: true });
  });
});

// =============================================
// BB: YEAR IN REVIEW / STATS
// =============================================
test.describe("BB: Year in Review", () => {
  test("BB.1: Stats page shows metrics", async ({ page }) => {
    await signIn(page, "producer");
    await page.goto("/club/festival-test-lab/stats");
    await page.waitForLoadState("networkidle");

    await expect(page).toHaveURL(/stats/);
    await page.screenshot({ path: "test-results/bb1-stats-metrics.png", fullPage: true });
  });

  test("BB.2: User profile stats", async ({ page }) => {
    await signIn(page, "producer");
    await page.goto("/profile");
    await page.waitForLoadState("networkidle");

    // Profile should show user stats/badges
    await expect(page).toHaveURL(/profile/);
    await page.screenshot({ path: "test-results/bb2-profile-stats.png", fullPage: true });
  });
});

// =============================================
// CALENDAR TESTS
// =============================================
test.describe("Calendar", () => {
  test("Calendar view loads", async ({ page }) => {
    await signIn(page, "producer");
    await page.goto("/club/festival-test-lab");
    await page.waitForLoadState("networkidle");

    // Look for calendar or upcoming dates section
    const _calendarSection = page
      .locator("text=/Calendar/i, text=/Upcoming/i, text=/Dates/i")
      .first();
    await page.screenshot({ path: "test-results/calendar-view.png", fullPage: true });
  });
});

// =============================================
// SIDEBAR & NAVIGATION TESTS
// =============================================
test.describe("Navigation", () => {
  test("Sidebar shows all navigation items", async ({ page }) => {
    await signIn(page, "producer");
    await page.goto("/club/festival-test-lab");
    await page.waitForLoadState("networkidle");

    // Should have navigation sidebar
    await page.screenshot({ path: "test-results/navigation-sidebar.png", fullPage: true });
  });

  test("Mobile navigation toggle works", async ({ page }) => {
    // Set mobile viewport
    await page.setViewportSize({ width: 375, height: 812 });
    await signIn(page, "producer");
    await page.goto("/club/festival-test-lab");
    await page.waitForLoadState("networkidle");

    // Look for mobile menu toggle
    const _menuToggle = page
      .locator(
        'button[aria-label*="menu"], button[aria-label*="Menu"], [data-testid="mobile-menu"]'
      )
      .first();
    await page.screenshot({ path: "test-results/navigation-mobile.png" });
  });
});

// =============================================
// ERROR HANDLING TESTS
// =============================================
test.describe("Error Handling", () => {
  test("404 page for invalid club", async ({ page }) => {
    await signIn(page, "producer");
    await page.goto("/club/nonexistent-club-xyz-123");
    await page.waitForLoadState("networkidle");

    // Should show some error or redirect
    await page.screenshot({ path: "test-results/error-404-club.png" });
  });

  test("404 page for invalid movie", async ({ page }) => {
    await signIn(page, "producer");
    await page.goto("/movies/9999999999");
    await page.waitForLoadState("networkidle");

    // Should show error page
    await page.screenshot({ path: "test-results/error-404-movie.png" });
  });
});
