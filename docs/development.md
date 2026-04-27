# Development

Local setup, testing, and CI/CD for BackRow. For project conventions (rating rules, auth rules, caching, etc.) read `.claude/CLAUDE.md` first.

## Connected accounts

All three platforms live on the `stephen@backrow.tv` account and are branded as **BackRow**:

| Platform | Entity                                                  | Notes                                                      |
| -------- | ------------------------------------------------------- | ---------------------------------------------------------- |
| GitHub   | `backrowtv/backrow`                                     | Source of truth for code + CI                              |
| Vercel   | team `BackRow` (slug `backrow`), project `backrow`, Pro | Hosts `backrow.tv`; previews per PR; prod on merge to main |
| Supabase | org `BackRow`, project `backrow` (us-east-2)            | Postgres + Auth + RLS + PR-scoped branches                 |

The repo's `.vercel/project.json` is checked in — do not rename it. Vercel auto-connects pushes on `backrowtv/backrow` to the right project via the GitHub integration.

## Local setup

Requirements: Node ≥ 24.11, Bun 1.3.12 (pinned), a working Supabase project (shared `backrow` dev project or a personal branch).

```bash
git clone git@github.com:backrowtv/backrow.git
cd backrow
cp .env.example .env.local         # fill in Supabase + TMDB + Resend keys
bun install
bun run dev                        # http://localhost:3000
```

Minimum vars to boot: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`. Everything else is schema-optional — features degrade gracefully when their keys are unset. The full list lives in `src/lib/config/env.ts` (see [Env schema](#env-schema)).

## Testing

Three tiers — unit (Vitest, pure), integration (Vitest, hits live DB), E2E (Playwright).

| Command                    | What it runs                                                            |
| -------------------------- | ----------------------------------------------------------------------- |
| `bun run test`             | Vitest unit — `src/__tests__/cache/**`, no DB                           |
| `bun run test:integration` | Vitest integration — `src/__tests__/actions/**`, requires seeded DB     |
| `bun run test:all`         | Both unit + integration in one run                                      |
| `bun run test:watch`       | Vitest watch (everything)                                               |
| `bun run test:ui`          | Vitest UI explorer                                                      |
| `bun run test:e2e`         | Playwright — `e2e/*.spec.ts` against `PLAYWRIGHT_BASE_URL` or localhost |
| `bun run test:e2e:ui`      | Playwright UI runner                                                    |
| `bun run test:e2e:headed`  | Playwright with visible browser                                         |

Unit suite is the one CI runs in the fast typecheck/lint/unit job — pure, no seeds. Integration + E2E run after the Vercel preview is ready, with Supabase branch creds + a factory seed.

**Seeding.** E2E specs use `test.beforeAll()` + `scripts/test-factory/` to hydrate users/clubs/festivals. Before running E2E locally the first time, seed:

```bash
bun tsx scripts/test-factory --scenario=tiny   # or small/medium/active/large
```

For multi-scenario setups, user lists, and teardown flags, see `docs/TESTING.md`.

**Rate limits in dev.** Action rate limits (default 10/min per action/IP via `actionRateLimit`) auto-fall-back to an in-memory `Map` when `KV_REST_API_URL` / `KV_REST_API_TOKEN` are unset, so Playwright doesn't need Upstash creds locally. If a spec fires auth actions in a tight loop and gets 429s, space them or scope the factory run. To debug live limits, look up keys under `br:rl:act:*` (server actions) and `br:rl:api:*` (API routes) in the Upstash dashboard.

## Regenerating Supabase types

Run `bun run db:gen-types` after schema migrations to refresh `src/lib/supabase/database.types.ts`. The factories are deliberately untyped right now — opt into typing per query with `.returns<T>()` until local types are reconciled with the generated `Database` type.

## CI pipeline overview

Two workflows gate every PR:

### `.github/workflows/ci.yml`

Runs on every PR and every push to `main`:

1. **Install** — `oven-sh/setup-bun@v2`, `bun install --frozen-lockfile`, cache `~/.bun/install/cache` + `.next/cache` keyed on `bun.lock`.
2. **Typecheck** — `bun run typecheck` (`tsc --noEmit`).
3. **Lint** — `bun run lint -- --max-warnings=0`. `jsx-a11y` is at **error** level. New warnings fail the build.
4. **Unit** — `bun run test` (Vitest, `src/__tests__/cache/**`).
5. **E2E job** (PR-only) — waits for Vercel preview, seeds the Supabase branch with the tiny test-factory scenario, then runs `bun run test:integration` + `bun run test:e2e`. Uses Supabase preview-branch creds via repo secrets.

Push-to-main skips the E2E job — main is already-validated merge output.

### `.github/workflows/preview.yml`

Runs on every PR alongside CI:

1. Waits for Vercel's automatic preview deploy (`patrickedqvist/wait-for-vercel-preview`).
2. Runs Lighthouse CI against three key URLs: `/`, `/discover`, `/club/backrow-featured`.
3. Assertions (`.github/lighthouse/lighthouserc.json`): performance ≥ 0.85, a11y ≥ 0.9, best-practices ≥ 0.9, SEO ≥ 0.9. Budget failures block merge.

### Required repo secrets

| Secret                              | Source                                                                     |
| ----------------------------------- | -------------------------------------------------------------------------- |
| `PREVIEW_SUPABASE_URL`              | Supabase branch URL — see [Supabase branching](#supabase-branching-on-prs) |
| `PREVIEW_SUPABASE_ANON_KEY`         | Supabase branch anon/publishable key                                       |
| `PREVIEW_SUPABASE_SERVICE_ROLE_KEY` | Supabase branch service-role key                                           |

Add via `gh secret set <NAME>` or the GitHub UI (Settings → Secrets and variables → Actions).

## Supabase branching on PRs

The Supabase GitHub integration auto-provisions a database branch for every PR against `backrowtv/backrow`. The branch is seeded from the current baseline (`supabase/migrations/0001_initial_schema.sql`) and runs additive migrations on top.

**Where to see it:**

- PR conversation — the Supabase bot posts a comment with the branch status.
- Dashboard — Project → Branches.

**Consuming branch creds in CI.** The integration does not automatically export branch connection strings to `GITHUB_ACTIONS` secrets. Recommended pattern:

1. Set `SUPABASE_ACCESS_TOKEN` (personal-access token) as a repo secret once.
2. In the workflow, `supabase/setup-cli@v1` + `supabase branches get --branch $BRANCH_NAME` to fetch the URL/keys at runtime.
3. Export into the step's `env:` block for `test:e2e`.

If you prefer not to query the API per-run, promote the most recent branch's creds to `PREVIEW_SUPABASE_*` secrets manually — CI falls back to those.

**Resetting a branch.** Dashboard → Branches → ⋮ → Reset. Triggered by merge conflicts in migrations or drift from the baseline.

## Vercel Agent

Enable via Vercel project settings → AI → Code Review. Once on, the `@vercel` bot reviews every PR on open/sync and can be re-triggered by mentioning `@vercel` in a PR comment. Pricing is per-review; see the in-dashboard cost meter before enabling on a fork.

## Env schema

`src/lib/config/env.ts` is a Zod-validated barrel for `process.env`. Import the typed `env` object instead of reading `process.env.*` directly:

```ts
import { env } from "@/lib/config/env";

const key = env.TMDB_API_KEY; // type: string | undefined
```

**Adding a new env var:**

1. Add to the schema in `src/lib/config/env.ts` (public or server block). Mark optional unless the app fails to boot without it.
2. Add to `.env.example` with a one-line comment describing what it's for.
3. Import via `env` in the consumer — do not `process.env.FOO` outside the config module.

Test-factory scripts under `scripts/test-factory/*` are the only exemption: they load `.env.local` via `dotenv` directly, so they can read vars without going through the schema.

Validation runs at module load — missing required vars throw on first import, not at request time.

## Forms and auto-save

Settings pages use `useAutoSaveForm` + `AutoSaveButton` (introduced in
`9cdc6d8`) so users never have to press "Save" — form state debounces to
the server and surfaces success / error inline.

- **Hook:** `src/hooks/useAutoSaveForm.ts`. Input: `{ values, save,
  debounceMs?, enabled?, onError?, onSuccess? }`. Returns `{ state: 'idle'
  | 'dirty' | 'saving' | 'saved' | 'error', isDirty, lastSavedAt, error,
  flush }`. Debounces `save(values)` by default **800ms** after the last
  change, no-ops when values are unchanged, and coalesces concurrent calls
  behind an in-flight flag so the caller never double-saves.
- **Button:** `src/components/ui/AutoSaveButton.tsx` renders the state
  machine (spinner while saving, check pulse for 1.2s after saved, error
  badge otherwise). Includes a "flush now" affordance for users who want
  the save to happen immediately on blur.
- **Consumers (today):** `NotificationSettingsForm`, `PrivacySettingsForm`,
  `WatchSettingsForm` under `src/components/profile/`. Each imports a
  `save*` server action that returns `{ success, error? }` — the hook reads
  `.error` from that shape directly.
- **Unit tests:** `src/__tests__/hooks/useAutoSaveForm.test.ts` covers the
  state machine (idle → dirty → saving → saved, error rollback, double-save
  coalescing, unmount safety). Run with `bun run test`.

When adding a new settings surface, **wire it through `useAutoSaveForm`**
instead of a manual submit button — the hook handles the subtle cases
(double-save, unmount during save, error rollback) that would otherwise
ship as bugs.

## Username lifecycle

Usernames are tracked across three columns on `public.users`:

| Column                       | Set by                                            | Purpose                                                                                            |
| ---------------------------- | ------------------------------------------------- | -------------------------------------------------------------------------------------------------- |
| `username`                   | signup / username picker / admin                  | Canonical handle (unique, case-insensitive index).                                                 |
| `username_auto_derived`      | signup (true for OAuth), welcome picker (→ false) | Distinguishes "we auto-generated this" (OAuth shim) from "the user chose this" (first commitment). |
| `username_last_changed_at`   | every explicit change                             | Base for the cooldown calculation.                                                                 |

### Flow

1. **Email signup** — username is set atomically with the auth row
   (`1631284`). `username_auto_derived = false`, `username_last_changed_at =
   now()`. The `/welcome/username` interstitial does **not** re-fire.
2. **OAuth signup** — username is derived from the OAuth identity email /
   name. `username_auto_derived = true`. On first sign-in the middleware
   routes the user to `/welcome/username` so they pick a real one; picking
   sets `username_auto_derived = false` and stamps `username_last_changed_at`
   (`4c8c9a6`).
3. **Post-signup changes** (Account Settings) — allowed at most once every
   **180 days** (`USERNAME_CHANGE_COOLDOWN_DAYS` in
   `src/app/actions/auth/username-validation.ts`, raised from 30d in
   `a7556f9`). Auto-derived usernames are **always changeable** — the
   cooldown only kicks in once the user has made a deliberate pick.
4. **Display name** is **not** rate-limited. Change as often as you want.

Migration: `supabase/migrations/0011_username_auto_derived_and_change_tracking.sql`
adds the two tracking columns.

Server actions: `src/app/actions/auth/username.ts` (`claimUsername` for the
welcome-picker path, `changeUsername` for the settings path),
`src/app/actions/auth/username-validation.ts` (format rules +
`USERNAME_CHANGE_COOLDOWN_DAYS`).

## A11y backlog

`jsx-a11y` rules are at error level. The rough surface (clickable divs, unassociated labels, composable shadcn slots) was cleared during W6. New violations will fail `bun run lint`. If you need to intentionally suppress a check on a shadcn primitive or a legit `autoFocus` in a modal, use `// eslint-disable-next-line jsx-a11y/<rule>` with a one-line comment explaining why — audits key off the comment.
