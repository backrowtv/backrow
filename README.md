# BackRow

![CI](https://github.com/backrowtv/backrow/actions/workflows/ci.yml/badge.svg)

BackRow is a movie social platform built for groups of any size. Small friend groups can run **Standard festivals** — themed, phased competitions where members nominate movies, watch them on their own time, rate them, and compete for the best picks across a season. Large communities — movie content creators, local theaters, and open interest-based communities — can run **Endless** clubs with shared movie pools, ratings, and discussions at any scale. Both modes are first-class.

## Quick start

```bash
git clone git@github.com:backrowtv/backrow.git
cd backrow
cp .env.example .env.local   # fill in Supabase + TMDB + Resend keys
bun install
bun run dev                  # http://localhost:3000
```

For testing, CI pipeline, Supabase branching, and the env-var schema, see [`docs/development.md`](docs/development.md).

## Documentation

Start with [`CLAUDE.md`](CLAUDE.md) for project rules and conventions, then [`ARCHITECTURE.md`](ARCHITECTURE.md) for schema, routes, state machines, and key flows.

Feature docs: [`docs/security.md`](docs/security.md) (write-path gates), [`docs/architecture.md`](docs/architecture.md) (background jobs), [`docs/privacy-and-data-lifecycle.md`](docs/privacy-and-data-lifecycle.md) (GDPR / cascades), [`docs/seo.md`](docs/seo.md) (metadata, OG images, sitemap, JSON-LD).

## Tech Stack

| Layer      | Technology                           |
| ---------- | ------------------------------------ |
| Framework  | Next.js 16 (App Router)              |
| React      | 19                                   |
| TypeScript | 5 (strict mode)                      |
| Runtime    | Bun 1.3+ (package manager & runtime) |
| Database   | Supabase (PostgreSQL + Auth + RLS)   |
| Styling    | Tailwind CSS 4 + CSS Variables       |
| UI         | shadcn/ui (customized)               |
| Movie Data | TMDB API                             |
| Deployment | Vercel                               |

## Getting started

See [`docs/development.md`](docs/development.md) for prerequisites, full setup, testing, and CI details. Then read [`CLAUDE.md`](CLAUDE.md) for project rules and [`ARCHITECTURE.md`](ARCHITECTURE.md) for schema and flows.

## Scripts

- `bun run dev` — development server
- `bun run build` / `bun run start` — production build / server
- `bun run typecheck` — TypeScript check (alias: `type-check`)
- `bun run lint` — ESLint
- `bun run test` — Vitest unit (cache/, no DB)
- `bun run test:integration` — Vitest integration (actions/, needs seeded DB)
- `bun run test:e2e` — Playwright (E2E)
- `bun run format` — Prettier

### Database Migrations

Migrations live in `supabase/migrations/`. See [`supabase/migrations/README.md`](supabase/migrations/README.md) for instructions.

**Use the Supabase plugin for all database operations** (see `CLAUDE.md`). Do not use the Supabase CLI directly — the plugin handles credential management and enforces the correct project context.

After applying migrations, regenerate TypeScript types:

```bash
bun run generate-types
```

### Project Structure

```
backrow/
├── src/
│   ├── app/                 # Next.js app router pages
│   │   ├── actions/         # Server actions (10 modular subdirectories)
│   │   ├── api/             # API routes
│   │   ├── (auth)/          # Authentication routes
│   │   ├── (dashboard)/     # Protected app routes
│   │   └── (marketing)/     # Public marketing pages
│   ├── components/          # React components
│   │   ├── ui/              # UI primitives (shadcn/ui)
│   │   └── [feature]/       # Feature components
│   ├── data/                # Static data (FAQ, etc.)
│   ├── lib/                 # Utilities and helpers
│   └── types/               # TypeScript types
├── scripts/                 # Development scripts
├── supabase/
│   └── migrations/          # Database migrations
├── docs/                    # Project documentation
├── CLAUDE.md                # ⭐ Project rules & conventions
└── ARCHITECTURE.md          # ⭐ Schema, routes, flows
```

## Documentation Reference

| File                                                               | Purpose                                                 |
| ------------------------------------------------------------------ | ------------------------------------------------------- |
| [`CLAUDE.md`](CLAUDE.md)                                           | Project rules, critical conventions, auth/DB rules      |
| [`ARCHITECTURE.md`](ARCHITECTURE.md)                               | Database schema, routes, state machines, RLS, key flows |
| [`docs/CLAUDE_PROJECT_CONTEXT.md`](docs/CLAUDE_PROJECT_CONTEXT.md) | Product context and vision                              |
| [`docs/TESTING.md`](docs/TESTING.md)                               | Testing checklists and multi-user flows                 |
| [`docs/backrow-site-map.md`](docs/backrow-site-map.md)             | Full route inventory                                    |
| [`docs/ACTIVITY_FEED_GUIDE.md`](docs/ACTIVITY_FEED_GUIDE.md)       | Activity feed reference                                 |
| [`supabase/migrations/README.md`](supabase/migrations/README.md)   | Migration instructions                                  |
| [`scripts/README.md`](scripts/README.md)                           | Development script reference                            |

## Deployment

Deployed to Vercel on push to `main`. Preview deployments run per-PR and are gated by [CI + Lighthouse](docs/development.md#ci-pipeline-overview). Environment variables are managed in the Vercel dashboard — schema lives in `src/lib/config/env.ts`.

## License

Private project — all rights reserved.
