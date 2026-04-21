import { describe, it, expect } from "vitest";
import {
  welcomeEmailHtml,
  inviteEmailHtml,
  notificationEmailHtml,
  contactNotificationHtml,
} from "../render";

// Regression guard for the React Email 6 migration: the renderers swapped
// imports from `@react-email/components` to `react-email`. If that breaks
// (wrong export, missing peer dep, bad rename), these calls throw at render
// time — not at module load — so a behavioral test is the right shape.

describe("email template renderers (React Email v6)", () => {
  it("welcome email renders non-empty HTML with <html> shell", async () => {
    const html = await welcomeEmailHtml({ userName: "Stephen" });
    expect(html).toMatch(/<html[\s>]/i);
    expect(html).toContain("BackRow");
  });

  it("invite email renders with the invite URL inlined", async () => {
    const html = await inviteEmailHtml({
      clubName: "Midnight Movies",
      inviteUrl: "https://backrow.tv/join/midnight-movies?token=abc",
      isPrivate: true,
    });
    expect(html).toContain("Midnight Movies");
    expect(html).toContain("https://backrow.tv/join/midnight-movies?token=abc");
  });

  it("notification email renders with unsubscribe footer", async () => {
    const html = await notificationEmailHtml({
      title: "Test",
      message: "Hello",
      unsubscribeUrl: "https://backrow.tv/unsubscribe?token=xyz",
    });
    expect(html).toContain("Test");
    expect(html).toContain("Hello");
    expect(html).toContain("https://backrow.tv/unsubscribe?token=xyz");
  });

  it("contact notification email renders with submitter fields", async () => {
    const html = await contactNotificationHtml({
      name: "Casey",
      email: "casey@example.com",
      subject: "Feedback",
      message: "Nice app",
    });
    expect(html).toContain("Casey");
    expect(html).toContain("casey@example.com");
    expect(html).toContain("Feedback");
  });
});
