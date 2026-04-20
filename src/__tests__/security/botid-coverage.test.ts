/**
 * BotID drift test.
 *
 * Every path listed in instrumentation-client.ts `protect: [...]` MUST have
 * a corresponding server action / route handler that calls requireHuman()
 * from @/lib/security/botid. Without the server call, listing a path in
 * the client `protect` array is theater — tokens get attached to the
 * request but nothing ever validates them.
 *
 * We caught /sign-in and /contact drift this way: both were in protect
 * but neither had a server-side check. Sign-in was intentional (rate
 * limit is enough); contact was a missed wire-up. This test stops either
 * class of drift from shipping again.
 */

import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const REPO_ROOT = resolve(__dirname, "../../..");

/**
 * Expected mapping from client `protect` path → server file that calls
 * requireHuman(). When you add a new BotID-protected surface, update BOTH
 * the protect array AND this map in the same PR.
 */
const EXPECTED_COVERAGE: Array<{ path: string; file: string; reason: string }> = [
  {
    path: "/sign-up",
    file: "src/app/actions/auth/signup.ts",
    reason: "signUp() creates a user account — high-value, BotID guards signup floods",
  },
  {
    path: "/feedback",
    file: "src/app/actions/feedback.ts",
    reason: "addFeedbackItem() accepts public input — BotID prevents spam",
  },
  {
    path: "/contact",
    file: "src/app/actions/contact.ts",
    reason: "submitContactForm() sends email notifications — BotID prevents abuse",
  },
  {
    path: "/clubs/new",
    file: "src/app/actions/clubs/create.ts",
    reason: "createClub() provisions a new club — BotID prevents mass creation",
  },
  {
    path: "/clubs/*",
    file: "src/app/actions/clubs/invites.ts",
    reason: "createInviteToken() emails invites — BotID prevents email abuse",
  },
];

/**
 * Additional server surfaces that MUST call requireHuman() but aren't
 * reachable via the Next.js server-action POST path, so they're not in
 * the client `protect` array. API routes with their own BotID check go
 * here.
 */
const EXPECTED_API_COVERAGE: Array<{ file: string; reason: string }> = [
  {
    file: "src/app/api/account/delete/route.ts",
    reason: "POST /api/account/delete — soft-delete high-value",
  },
  {
    file: "src/app/api/account/export/route.ts",
    reason: "POST /api/account/export — bulk-export high-value",
  },
];

function readProtectPaths(): string[] {
  const src = readFileSync(resolve(REPO_ROOT, "instrumentation-client.ts"), "utf8");
  // Grab the `protect: [ ... ]` block and extract `path: "..."` entries.
  const block = src.match(/protect:\s*\[([\s\S]*?)\]/);
  if (!block) throw new Error("protect array not found in instrumentation-client.ts");
  return Array.from(block[1].matchAll(/path:\s*["']([^"']+)["']/g)).map((m) => m[1]);
}

function fileCallsRequireHuman(relPath: string): boolean {
  const src = readFileSync(resolve(REPO_ROOT, relPath), "utf8");
  return /from\s+["']@\/lib\/security\/botid["']/.test(src) && /requireHuman\s*\(/.test(src);
}

describe("BotID coverage drift", () => {
  it("every client protect path has a matching server action that calls requireHuman()", () => {
    const protectPaths = readProtectPaths();
    const expectedPaths = new Set(EXPECTED_COVERAGE.map((e) => e.path));

    for (const p of protectPaths) {
      expect(
        expectedPaths.has(p),
        `protect path "${p}" from instrumentation-client.ts is not listed in EXPECTED_COVERAGE in this test. ` +
          `Either add it to the map with the server file that guards it, or remove it from protect[].`
      ).toBe(true);
    }

    for (const entry of EXPECTED_COVERAGE) {
      expect(
        protectPaths.includes(entry.path),
        `${entry.file} calls requireHuman() for "${entry.path}" but that path is missing from instrumentation-client.ts protect[]. ` +
          `Without the client token, server-side checkBotId() will reject all real users.`
      ).toBe(true);

      expect(
        fileCallsRequireHuman(entry.file),
        `${entry.file} is listed in EXPECTED_COVERAGE for "${entry.path}" but doesn't call requireHuman() — ` +
          `${entry.reason}. Either add the call or remove the entry.`
      ).toBe(true);
    }
  });

  it("every API route listed in EXPECTED_API_COVERAGE calls requireHuman()", () => {
    for (const entry of EXPECTED_API_COVERAGE) {
      expect(
        fileCallsRequireHuman(entry.file),
        `${entry.file} should call requireHuman() — ${entry.reason}`
      ).toBe(true);
    }
  });
});
