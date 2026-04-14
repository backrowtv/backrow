# BackRow Testing Guide

**Last Updated:** April 2026

---

## Test Resources

### Test Auth Widget

**DEVELOPMENT ONLY — DO NOT USE IN PRODUCTION**

Quick sign-in/sign-out tool for testing multi-user scenarios. Appears in sidebar when enabled.

**To Enable:**

1. Add `NEXT_PUBLIC_ENABLE_TEST_AUTH=true` to `.env.local`
2. Restart dev server (`bun run dev`)
3. Widget appears at bottom of sidebar

**Features:**

- One-click sign-in as any test user (Producer, Director, Critic)
- Quick sign-out button
- Current user display with role and club memberships
- Test resources page at `/test-auth` with test data

**Security:** Only appears when `NODE_ENV !== 'production'` AND `NEXT_PUBLIC_ENABLE_TEST_AUTH=true`

**Files:**

- Widget: `src/components/layout/TestAuthWidget.tsx`
- Test Auth Page: `src/app/(dashboard)/test-auth/page.tsx`
- Server Actions: `src/app/actions/auth/signin.ts` (signInTestUser)

### Test Accounts

Configure test accounts in your local environment. The Test Auth Widget and scripts support custom test users.

**IMPORTANT:** All multi-user tests MUST use at least THREE users.

### Test Data

**Stable fixture:** `BackRow - Featured` club (`slug: backrow-featured`) is
always seeded as stephen@backrow.tv's club on fresh databases via the
2026-04-17 baseline (`supabase/migrations/0001_initial_schema.sql` + the
retained seed). All other test data is rebuilt on demand by the factories.

**Test Resources:** Visit `/test-auth` (dev-only auth widget) for:

- Test movies with TMDB IDs
- Test directors, actors, composers
- Test festival themes
- Placeholder image URLs

### Test Factory Scripts

Located in `scripts/test-factory/`:

- `clubs.ts` — Create test clubs with presets
- `scenarios.ts` — Create full test scenarios

**How factories reach the database.** Factories read `DATABASE_URL` and
`SUPABASE_SERVICE_ROLE_KEY` from `.env.local`. On feature branches, Supabase
auto-provisions a preview database via the GitHub integration — point
`.env.local` at that branch's URL before running factory scripts, OR run
them against the shared `backrow` project if you're iterating in main.

### Tools

- **Claude in Chrome** — Browser state, console logs, network logs, page interaction
- **Supabase Plugin** — Database queries, schema inspection, migrations
- **Playwright** — E2E test automation (`bun run test:e2e`)

---

## Manual Testing Checklist

### File Upload Testing

- [ ] Avatar upload (`/profile/edit`) — JPEG, PNG, GIF, WebP
- [ ] File size limits (15MB+ should error)
- [ ] Invalid file types (TXT, PDF should reject)
- [ ] Club picture upload (`/club/[slug]/settings/general`)

### Form Submission Testing

- [ ] Sign-up flow (`/sign-up`)
- [ ] Password reset flow (`/forgot-password` → `/reset-password`)
- [ ] Profile edit (`/profile/edit`)

### Network Error Handling

- [ ] Offline mode (DevTools → Network → Offline)
- [ ] Slow network (DevTools → Network → Slow 3G)
- [ ] Network interruption mid-request

### Multi-User Real-Time Tests

**IMPORTANT:** All multi-user tests MUST use at least THREE users (Producer, Director, Critic).

- [ ] Real-time notifications — Verify notification appears in bell without page refresh
- [ ] Club settings updates — Changes visible to other users without refresh
- [ ] Announcements — New announcements appear for members without refresh
- [ ] Theme voting end-to-end — Full voting flow with multiple users

### GDPR Data Lifecycle (W3)

Covers `POST /api/account/export`, `POST /api/account/delete`, the
`account-hard-delete` queue worker, the orphan-sweep cron, and the cookie
consent banner.

**Bootstrap a test user with real content:**

```bash
bun tsx scripts/test-factory --users=1 --prefix=gdpr-test
```

Then as that user: join 2 clubs, post a discussion thread + 2 replies, add
≥10 ratings, nominate in an active themed festival.

**Export flow:**

- [ ] Profile → Data → **Email me my data** — toast "check your email" appears, button enters 60s cooldown.
- [ ] Resend inbox / test mailbox receives the email with a signed URL.
- [ ] Signed URL downloads a ZIP; `README.md` at root lists contents.
- [ ] `profile.json` contains the user; `ratings.json`, `nominations.json`, `discussion_threads.json`, `notifications.json` all present.
- [ ] `discussion_comments.json` contains only rows where `author_id = <testUser>`; no other user's body / author_id leaks.
- [ ] Signed URL expires after 7 days (`Expires` query param ~7d out).

**Soft-delete flow:**

- [ ] Profile → **Delete Account** → type `DELETE` → confirm. Redirects to `/?deleted=1` with banner.
- [ ] Re-attempt sign-in with same creds: middleware blocks, banner shown again.
- [ ] SQL check `SELECT id, email, username, display_name, deleted_at FROM users WHERE id = '<testUser>'` — `deleted_at` set; email `deleted+<uuid>@backrow.tv`; display*name `Deleted User`; username `deleted*<hex>`.
- [ ] User's ratings, nominations, discussion posts still present (hard-delete hasn't fired).

**Hard-delete (bypass the 30d wait with inline runner):**

```ts
// In a throwaway dev script or REPL, NODE_ENV=development:
import { runInline } from "@/lib/jobs/inline-runner";
import { JOB_TOPICS } from "@/lib/jobs/types";
await runInline(JOB_TOPICS.accountHardDelete, {
  dedupId: "manual-" + crypto.randomUUID(),
  userId: "<testUser>",
});
```

- [ ] SQL `SELECT * FROM users WHERE id = '<testUser>'` — 0 rows.
- [ ] SQL `SELECT * FROM auth.users WHERE id = '<testUser>'` — 0 rows.
- [ ] SQL `SELECT count FROM ratings WHERE user_id = '<testUser>'` — 0 (SET NULL).
- [ ] SQL `SELECT count FROM discussion_threads WHERE author_id = '<testUser>'` — 0. The thread row persists, just with `author_id = NULL`.
- [ ] Storage: `account-exports/<testUser>/` is empty.

**Sole-producer block:**

- [ ] Create a second test user, make them sole producer of a club.
- [ ] `POST /api/account/delete` — returns 400 with "transfer ownership or archive" error.
- [ ] `deleted_at` is NOT set on the users row.
- [ ] Transfer producer_id to another member (or archive the club), retry — succeeds.

**Orphan-sweep cron:**

- [ ] Backdate an export object: `UPDATE storage.objects SET created_at = now() - interval '10 days' WHERE bucket_id = 'account-exports' LIMIT 1;`
- [ ] `curl -H "Authorization: Bearer $CRON_SECRET" http://localhost:3000/api/cron/orphan-sweep` — JSON includes `removedExports >= 1`.
- [ ] Re-run: `removedExports` now 0.

**Cookie consent banner:**

- [ ] Incognito Chrome → load `/` → banner appears immediately after the skip-to-main link.
- [ ] Accept → `localStorage.getItem('backrow-cookie-consent')` contains `{ essential: true, analytics: true, timestamp: ... }`.
- [ ] Reload → banner does not reappear.

---

## E2E Tests (Playwright)

Located in `e2e/`:

- `comprehensive.spec.ts` — Full app test suite
- `festival-cinephile.spec.ts` — Cinephile festival flows
- `festival-discussions.spec.ts` — Discussion system
- `festival-type-switching.spec.ts` — Festival mode switching
- `festival-validation.spec.ts` — Festival validation rules
- `site-audit.spec.ts` — Site-wide audit checks

### Running E2E Tests

```bash
bun run test:e2e         # Run all E2E tests (Playwright)
bun run test:e2e:ui      # Run with Playwright UI
bun run test:e2e:headed  # Run with visible browser
```

Note: `bun run test` runs Vitest unit tests (`src/__tests__/cache/**`), not Playwright. See `docs/development.md#testing` for the three-tier breakdown.

### BotID in tests

Vercel BotID (`botid` package, `checkBotId()`) **auto-bypasses** when `NODE_ENV !== "production"`. Playwright, `bun run dev`, and any local test harness see `{ isBot: false }` without configuration. No env vars, headers, or bypass secrets are needed.

Deep Analysis enforcement only kicks in on production deployments (preview + production). If you specifically need to test the bot-rejection branch, pass `developmentOptions.bypass: "BAD-BOT"` into the `checkBotId()` call directly in the test-specific action path.

### Rate limits in tests

Rate limits apply per `(actionName, IP)`. All Playwright tests run from the same origin, so firing 6 rapid sign-ups in a single test run _will_ hit the 5/min cap. Either space actions across tests, use distinct users/flows, or drop the cap in a test-only env override. When `UPSTASH_REDIS_REST_URL` is unset locally, the limiter falls back to an in-memory Map — safe for tests, but the state persists across the dev-server process lifetime.

---

## Quick Start

```bash
# 1. Start dev server
bun run dev

# 2. Enable test auth widget
# Add NEXT_PUBLIC_ENABLE_TEST_AUTH=true to .env.local

# 3. Run E2E tests
bun run test:e2e
```
