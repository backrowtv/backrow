# BackRow

BackRow is a movie social platform built for groups of any size. Small friend groups can run **Standard festivals** — themed, phased competitions where members nominate movies, watch them on their own time, rate them, and compete for the best picks across a season. Large communities — movie content creators, local theaters, and open interest-based communities — can run **Endless** clubs with shared movie pools, ratings, and discussions at any scale. Both modes are first-class.

## Documentation

Start with [`CLAUDE.md`](CLAUDE.md) for project rules and conventions, then [`ARCHITECTURE.md`](ARCHITECTURE.md) for schema, routes, state machines, and key flows.

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

## Getting Started

### First Steps

1. Read [`CLAUDE.md`](CLAUDE.md) — project rules, critical conventions, and auth/DB patterns.
2. Read [`ARCHITECTURE.md`](ARCHITECTURE.md) — database schema, route map, festival state machine, RLS policies, and key flows.
3. Read [`docs/CLAUDE_PROJECT_CONTEXT.md`](docs/CLAUDE_PROJECT_CONTEXT.md) — product context and vision.

### Prerequisites

- **Node.js 24.11.0+** (see `.nvmrc`)
- **Bun 1.3.5+** — primary package manager and runtime
- **Supabase account** (local dev uses ports 54321-54328; production project ID: `ifurgbocssewpoontnml`)
- **TMDB API key** — get one at [themoviedb.org](https://www.themoviedb.org/settings/api)

### Installation

1. Clone the repository:

```bash
git clone https://github.com/backrowtv/backrow.git
cd backrow
```

2. Install dependencies:

```bash
bun install
```

3. Set up environment variables:

```bash
cp .env.example .env.local
```

Edit `.env.local` and add:

- `NEXT_PUBLIC_SUPABASE_URL` — Supabase project URL
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` — Supabase anon/public key
- `SUPABASE_SERVICE_ROLE_KEY` — Supabase service role key (for scripts)
- `TMDB_API_KEY` — TMDB API key

4. Run the development server:

```bash
bun run dev
```

5. Open [http://localhost:3000](http://localhost:3000) in your browser.

## Development

### Available Scripts

- `bun run dev` — Start development server
- `bun run build` — Build for production
- `bun run start` — Start production server
- `bun run lint` — Run ESLint
- `bun run type-check` — Run TypeScript compiler check
- `bun run format` — Run Prettier
- `bun run create-test-user` — Create a test user for development
- `bun run generate-types` — Regenerate TypeScript types from Supabase schema

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

Deployment is handled automatically via Vercel when code is pushed to the `main` branch.

**Never deploy directly from your local machine.** Always push to GitHub and let Vercel handle deployment.

### Environment Variables

Set these in the Vercel dashboard:

- `NEXT_PUBLIC_SUPABASE_URL` — Production Supabase URL
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` — Production Supabase anon key
- `SUPABASE_SERVICE_ROLE_KEY` — Production Supabase service role key
- `TMDB_API_KEY` — TMDB API key

## License

Private project — all rights reserved.
