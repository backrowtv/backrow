/**
 * Regression test — NotificationBell realtime scope.
 *
 * The NotificationBell realtime subscription MUST include a
 * `filter: user_id=eq.${userId}` clause so one user's browser never
 * receives another user's notification payloads. This is a
 * compliance/privacy invariant, not a perf tweak. If someone removes
 * the filter in a future refactor, this test fails before merge.
 */

import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const NOTIFICATION_BELL_PATH = resolve(__dirname, "../../components/layout/NotificationBell.tsx");

describe("NotificationBell realtime subscription", () => {
  const source = readFileSync(NOTIFICATION_BELL_PATH, "utf8");

  it("subscribes to notifications postgres_changes with a user-scoped filter", () => {
    expect(source).toContain('table: "notifications"');
    expect(source).toMatch(/filter:\s*`user_id=eq\.\$\{userId\}`/);
  });

  it("only listens to INSERT events (avoids UPDATE/DELETE payload leaks)", () => {
    const match = source.match(/event:\s*"([^"]+)"/);
    expect(match?.[1]).toBe("INSERT");
  });

  it("uses the current user's id from supabase.auth.getUser()", () => {
    // Confirms userId comes from auth, not from a prop or URL param
    expect(source).toContain("supabase.auth.getUser()");
  });
});
