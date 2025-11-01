# Database Migrations

This directory is the source of truth for BackRow's database schema.

## Layout

```
supabase/migrations/
├── 0001_initial_schema.sql   ← baseline (2026-04-17 reset)
└── NNNN_additive_change.sql  ← everything after is strictly additive
```

`0001_initial_schema.sql` is the squashed baseline produced when the project
was migrated from the legacy `BackRow-Dev` database on 2026-04-17. It replaces
118 historical migrations and is the canonical starting point for fresh
databases and preview branches. See `docs/database-baseline.md` for the full
reset story and rules.

## Applying changes

Use the Supabase plugin (not the CLI) via Claude — `apply_migration` for DDL,
`execute_sql` for data checks. On CI, the Supabase GitHub integration picks up
new migration files automatically and applies them to preview branches on each
PR against `backrowtv/backrow`.

Migration naming: `YYYYMMDDHHMMSS_description.sql` (Postgres-safe identifier).

## Regenerating TypeScript types

After any schema change lands in `main`, regenerate the client types:

```ts
// via Claude MCP
mcp__plugin_supabase_supabase__generate_typescript_types({
  project_id: "nxpeptgrhbveqphwwowj",
});
```

The output should be written to `src/types/database.types.ts`.
