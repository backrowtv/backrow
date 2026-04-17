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

**BotID + rate limits in dev.** `checkBotId()` auto-bypasses when `NODE_ENV !== "production"`, so Playwright doesn't need headers or special tokens. Action rate limits (default 5/min per action/IP) all share the same Playwright origin — if a spec fires auth actions in a tight loop and gets 429s, space them or scope the factory run to fewer iterations.

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

If you prefer not to query the API per-run, promote the most recent branch's creds to `PREVIEW_SUPABASE_*` secrets manually — CI falls back to those. The long-term fix is the integration's native Actions outputs; re-check upstream when they GA.

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

## A11y backlog

`jsx-a11y` rules are at error level. The rough surface (clickable divs, unassociated labels, composable shadcn slots) was cleared during W6. New violations will fail `bun run lint`. If you need to intentionally suppress a check on a shadcn primitive or a legit `autoFocus` in a modal, use `// eslint-disable-next-line jsx-a11y/<rule>` with a one-line comment explaining why — audits key off the comment.
