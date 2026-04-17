# BackRow - Claude Code Project Rules

## Project Overview

**BackRow** is a movie social platform for running themed film festivals with friends.

| Layer      | Technology                                              |
| ---------- | ------------------------------------------------------- |
| Framework  | Next.js (App Router, React, Turbopack)                  |
| Language   | TypeScript (strict mode)                                |
| Runtime    | Bun (package manager & runtime)                         |
| Database   | Supabase (PostgreSQL + Auth + RLS)                      |
| Styling    | Tailwind CSS + CSS Variables (Sage Green design system) |
| UI         | shadcn/ui (customized)                                  |
| Movie Data | TMDB API                                                |

---

## Critical Rules

### Authentication

- **ALWAYS** use `supabase.auth.getUser()` in server components — **NEVER** `getSession()` (security risk)
- **ALWAYS** `await` dynamic APIs in Next.js 16: `params`, `searchParams`, `cookies()`, `headers()`

### Database

- **NEVER** recalculate `festival_results` points — use cached values
- **NEVER** change `season_id` after festival creation
- **ALWAYS** quote reserved keywords like `"cast"` in queries
- **ALWAYS** include `settings` field when fetching clubs (needed for avatar display)
- **ALWAYS** verify column names, NOT NULL constraints, and FK ordering against actual schema before writing SQL
- Enumerate **ALL** related tables in multi-table cleanup scripts and confirm with user before executing
- Run a dry-run `SELECT` before `UPDATE`/`DELETE` operations
- **ALWAYS** wrap `auth.uid()` in subselect for RLS performance: `USING (user_id = (SELECT auth.uid()))` — never bare `auth.uid()`
- **User-owned tables:** any new FK that references `public.users(id)` or `auth.users(id)` MUST have a cascade decision (CASCADE / SET NULL / RESTRICT) documented in `docs/privacy-and-data-lifecycle.md` in the same PR that introduces the FK. Missing rows block merge.

### Server Actions

- Files with `'use server'` can **ONLY** export async functions — no re-exports, constants, or types
- Barrel/re-export files must **NOT** have `'use server'` — each sub-module gets its own directive
- Put constants and helpers in separate files without `'use server'`
- Server actions: always return `{ success, error }` objects, never throw

### Ratings

- **ALL ratings display as numbers only** — always 0.0 to 10.0 with one decimal place
- **NO icon/visual display modes** — no stars, popcorn, etc. for rating display
- Users can still customize: step increment (0.1, 0.5, 1.0) and slider thumb icon
- Use `formatRatingDisplay(rating)` which always returns `rating.toFixed(1)`
- Use `RatingDisplay` component for consistent rendering; `RatingBadge` for cards/overlays
- Rubric ratings: always 0-10 integer steps, weighted final score displayed as X.X/10

### Components

- Server Components are **default** — only add `'use client'` when needed
- **ALWAYS** use Next.js `Image` component, never `<img>` tags
- **ALWAYS** use `DateDisplay` component for dates in Server Components (prevents hydration mismatches)
- **NEVER** create components inside render functions
- Client components: wrap async calls in try/catch, show user-facing error states
- Use `ClubAvatar` for clubs, `UserAvatar` for users — raw `Avatar` only for festivals/generic fallbacks
- **NEVER** change the aspect ratio of movie posters — always `aspect-[2/3]`. Constrain width instead and let aspect ratio determine height

### Debugging & Bug Fixes

- **Before fixing any bug**, list 2-3 possible root causes with evidence — don't jump to first explanation
- **Always verify fixes in browser** — a successful build does NOT mean the bug is fixed
- Common root causes: data filtered at render vs query time, reading deprecated DB fields, missing RLS policies, null handling in cleanup functions
- After **2 failed attempts**, stop and re-examine assumptions from scratch
- When user's screenshot contradicts your theory, **STOP** and re-evaluate immediately

### UI Changes

- Make **ONLY** the requested changes — don't restructure or "improve" surrounding code
- **NEVER** remove existing content unless explicitly asked
- Ask before making additional changes; work **incrementally** — one logical group at a time
- "Condense"/"simplify" means reduce spacing/padding, **never** remove content

### Scope Control

- Stay focused on stated task — don't expand scope without explicit approval
- In phased plans, work **ONLY** on the specified phase
- Don't exit plan mode prematurely

---

## Supabase Plugin (CRITICAL)

Use the official Supabase **PLUGIN** (NOT MCP) for all database operations. Project ID: `nxpeptgrhbveqphwwowj`

If it's not working: run `claude plugin install supabase@claude-plugins-official` in terminal and restart Claude Code.

---

## Tools

| Tool                 | Use For                                                           |
| -------------------- | ----------------------------------------------------------------- |
| **Claude in Chrome** | Browser verification, console logs, screenshots, page interaction |
| **Context7**         | Up-to-date library documentation                                  |
| **Playwright**       | Browser automation and testing                                    |

---

## Workflow

- Use TodoWrite to track tasks (one in_progress at a time)
- Commit frequently with descriptive messages
- Use Claude in Chrome for verification — never claim "works" without testing
- Complete one feature before starting another
- `/feature-dev` — Launch 7-phase feature development workflow

### Planning Rules

- **NO arbitrary timelines** — focus on what needs to be done, not when
- **NO arbitrary priorities** — list issues factually, let the user decide scheduling

---

## SEO

- Every new dynamic page exports `generateMetadata` + sets `alternates.canonical` + ships an `opengraph-image.tsx` + emits JSON-LD when a schema.org type applies.
- Metadata fetchers use `createPublicClient` (anon, cookie-less) wrapped with `React.cache()` in `src/lib/seo/fetchers.ts` — never double-fetch from the page body.
- OG images use the shared helper in `src/lib/seo/og-template.tsx`. Never inline the font loader or wordmark markup.
- Movie poster thumbnails in OG stay `aspect-[2/3]`. BackRow wordmark uses Righteous + primary color.
- Canonical URLs: build with `absoluteUrl()` from `src/lib/seo/absolute-url.ts`. No trailing slash.
- Private content is never sitemap'd. See `docs/seo.md` for full inclusion rules.

---

## Caching

- **Invalidate by tag, not path.** Scoped writes (club, festival, discussion, poll, member, season, movie) call helpers from `src/lib/cache/invalidate.ts` — `invalidateClub`, `invalidateFestival`, `invalidateDiscussion`, `invalidatePoll`, `invalidateMember`, `invalidateSeason`, `invalidateMovie`, `invalidateClubStats`, `invalidateMarketing`. These cascade parents automatically.
- `revalidatePath` is reserved for genuinely broad writes (home, `/admin`, `/profile`, `/discover`, auth flows). Do not use it for anything scoped to a specific club/festival/discussion.
- **Every `"use cache"` function declares BOTH `cacheLife(...)` AND `cacheTag(...)`.** A cached function without a tag is a leak — it can never be invalidated. Use tag helpers from `CacheTags.*`; never hand-write tag strings.
- **Tags contain IDs only.** Never put email, display name, or any RLS-protected string into a tag — they appear in logs/observability. The invalidation test asserts this.
- **`"use cache"` can't read `cookies()`, `headers()`, or `searchParams`.** Split auth-gated queries into `authCheck() → cachedPublicRead()`. Pass primitives as args.
- **Realtime subscriptions must filter.** Every Supabase `.on('postgres_changes', ...)` on a user-owned table requires a server-side filter (e.g. `filter: 'user_id=eq.${userId}'`). Unfiltered subscriptions fan every row change to every client — a privacy violation. NotificationBell regression test guards this.
- `src/lib/cache/invalidate.ts` is plain TS (no `'use server'`) so constants + types import into RSC/client/actions freely. Don't add a `'use server'` directive.
- Do NOT touch `src/lib/seo/fetchers.ts` — that's `React.cache` (per-request), a different layer from `"use cache"` (cross-request). Full details in `docs/caching.md`.

---

## Security

- Sanitize user HTML: `import { sanitizeHtml, sanitizeForStorage } from '@/lib/security/sanitize'`
- Security headers (CSP, X-Frame-Options, HSTS, etc.) are applied via `proxy.ts`

### Background Jobs

Bulk fanouts (>10 recipients for emails/notifications, any image resize) MUST enqueue via `src/lib/jobs/producers.ts` — never run inline. The HTTP response returns as soon as the message is accepted; workers under `src/app/api/jobs/*/route.ts` do the work with at-least-once delivery + idempotency. See `docs/architecture.md#background-jobs`.

### Security Posture for write-path server actions

Every new user-facing write action must declare its rate limit, BotID coverage, and email-verification gate. See `docs/security.md` for the authoritative call-sequence and coverage table.

Defaults:

- **Rate limit:** yes (via `actionRateLimit` from `@/lib/security/action-rate-limit`).
- **Email gate:** yes (via `requireVerifiedEmail` from `@/lib/security/require-verified-email`) after `getUser()`.
- **BotID:** only on high-value actions (signup, club/invite/feedback/contact) via `requireHuman()` from `@/lib/security/botid`.

Backed by Upstash Redis, provisioned via Vercel Marketplace (`KV_REST_API_URL` / `KV_REST_API_TOKEN`; `UPSTASH_REDIS_REST_*` names are accepted as a fallback). Local dev falls back to in-memory when creds are unset.

---

## Testing

- **Test Auth Widget:** `NEXT_PUBLIC_ENABLE_TEST_AUTH=true` enables quick user switching
- **Test Club:** `backrow-featured` (privacy `public_open`) — use for anon/crawler verification on the shared DB (reset 2026-04-17). Create additional private/test clubs locally via the Supabase plugin when multi-club scenarios are needed; never commit their IDs.
- **Browser Verification:** Claude in Chrome — `read_console_messages` for errors, `read_page` for visual checks
- Multi-user testing requires minimum 3 test users. See `docs/TESTING.md` for full checklists

---

## Connected Accounts

All three services are owned by **stephen@backrow.tv** and branded as **BackRow**.

| Service      | Org / Team                      | Identifier                                                                              | What it hosts                                              |
| ------------ | ------------------------------- | --------------------------------------------------------------------------------------- | ---------------------------------------------------------- |
| **GitHub**   | `backrowtv` org                 | https://github.com/backrowtv/backrow                                                    | Source repo, CI workflows, PR reviews                      |
| **Vercel**   | `BackRow` team (slug `backrow`) | `team_nQnLf0QGTSFSt8Pw1z1U8Edz` · project `prj_NnI6MbbzqKPzBrR4PITHmef7d4lw` (Pro plan) | Hosting, preview deploys, primary domain `backrow.tv`      |
| **Supabase** | `BackRow` org                   | `zcutrgyqzsxhbgfrjcka` · project `nxpeptgrhbveqphwwowj` (us-east-2)                     | Postgres, Auth, Storage, Realtime, RLS, PR-scoped branches |

**Primary domain:** `backrow.tv` (registered through Vercel, expires 2026-11-07).

**Integrations wired:**

- GitHub ↔ Vercel: auto-deploy every push to `backrowtv/backrow`. Preview per PR; production on merge to `main`.
- GitHub ↔ Supabase: auto-spawn DB branch per PR. Branch creds expose to CI via `PREVIEW_SUPABASE_*` secrets.
- Vercel ↔ Upstash (Marketplace): provisions `KV_REST_API_URL` / `KV_REST_API_TOKEN` / `REDIS_URL` automatically across all environments.

**Env vars managed in Vercel project settings** (Preview + Production + Development scopes): Supabase, TMDB, Resend, VAPID, Sentry, CRON. Canonical schema in `src/lib/config/env.ts`; local template in `.env.example`.

---

## Environment

- **Development:** Shared `backrow` Supabase project + per-PR Supabase branches
- **Project ID:** `nxpeptgrhbveqphwwowj` (us-east-2, BackRow org, stephen@backrow.tv)
- **Schema baseline:** `supabase/migrations/0001_initial_schema.sql` (reset 2026-04-17 from 118 historical migrations — see `docs/database-baseline.md`). All future schema changes are additive migrations on top.
- **Branching:** Supabase branches auto-spawn on PRs to `backrowtv/backrow` via the GitHub integration.
- **Test Account:** stephen@backrow.tv

### Env var schema

- Every env var MUST be declared in `src/lib/config/env.ts` (Zod) **AND** `.env.example` in the same PR that introduces it.
- Consumers import the typed `env` object: `import { env } from '@/lib/config/env'`. Do NOT read `process.env.*` directly outside `src/lib/config/env.ts` and `scripts/test-factory/*` (which dotenv-load `.env.local` on their own).
- Mark optional unless the app fails to boot without it — missing required vars throw at module load.
- Full setup/CI/branching detail lives in `docs/development.md`.

---

## CI/CD

- PRs run `.github/workflows/ci.yml` (typecheck → lint → Vitest unit; then after Vercel preview: seed factory → Vitest integration → Playwright) and `.github/workflows/preview.yml` (Lighthouse ≥ 0.85 perf, ≥ 0.9 a11y/best-practices/SEO).
- Lint runs with `--max-warnings=0`; `jsx-a11y` at error level. New a11y violations fail the build — if a suppression is genuinely warranted (shadcn slot, legit modal autoFocus), use `// eslint-disable-next-line jsx-a11y/<rule>` with a one-line reason comment.
- E2E targets the Vercel preview URL via `PLAYWRIGHT_BASE_URL`; locally it boots `bun run dev`.
- Vercel Agent PR reviews are enabled in project settings — re-trigger with `@vercel` in a comment.

---

## Quick Commands

```bash
bun run dev              # Start dev server
bun run build            # Production build
bun run typecheck        # TypeScript check
bun run lint             # Run ESLint
bun run test             # Vitest unit (cache/ — no DB)
bun run test:integration # Vitest integration (actions/ — needs seeded DB)
bun run test:e2e         # Playwright (E2E against PLAYWRIGHT_BASE_URL or localhost)
bun install              # Install dependencies
lsof -ti:3000 | xargs kill -9  # Kill dev server
```
