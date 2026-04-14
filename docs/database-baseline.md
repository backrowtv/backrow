# Database Baseline

## What happened

On **2026-04-17**, the BackRow database was reset to a clean baseline as part
of the pre-launch Supabase migration from `ifurgbocssewpoontnml` (BackRow-Dev
on `sstack13@gmail.com`) to the new `backrow` project
(`nxpeptgrhbveqphwwowj`, us-east-2) under the BackRow org on
`stephen@backrow.tv`.

118 historical migration files were squashed into a single authoritative
file: `supabase/migrations/0001_initial_schema.sql`. The squash preserves
every table, column, function, trigger, policy, and storage bucket that
existed at the time of the reset — only the migration _history_ was
collapsed, not the schema itself.

## Why

- Production launch on a fresh account with a clean audit trail.
- Remove iterative-fix artifacts (duplicate migration names, "fix-the-fix"
  SQL, dropped columns, abandoned experiments) that made the migration
  history hard to reason about.
- Align the database baseline with the greenfield repo at
  `github.com/backrowtv/backrow` (see `W0A`).

## Rules going forward

1. **Never edit `0001_initial_schema.sql`.** Treat it as immutable, like a
   checked-in binary snapshot.
2. **Every schema change is a new, additive migration.** File name pattern:
   `YYYYMMDDHHMMSS_short_description.sql`. Small, focused, ON CONFLICT-safe
   where relevant.
3. **Use the Supabase plugin, not the CLI.** `apply_migration` for DDL,
   `execute_sql` for DML.
4. **Supabase branching is the preview/dev story.** A PR against
   `backrowtv/backrow` auto-spawns a branch that applies the baseline +
   every pending additive migration. Branch data does not carry over —
   dev data is rebuilt via the factories in `scripts/test-factory/`.
5. **Regenerate TypeScript types** (`src/types/database.types.ts`) after
   any schema change lands on `main`.

## What was kept from the old database

Only the personal data needed so the operator (stephen@backrow.tv) can
continue using BackRow as a real user after the cut-over:

- stephen@backrow.tv user + site-admin row + user_rubrics, favorites,
  badges, watch_history, favorite_clubs, generic_ratings,
  future_nomination_list, private_notes.
- The `BackRow - Featured` club + its single season, single festival, 14
  nominations, 1 rating, 12 discussion threads, 14 comments, activity
  log, and club-level badges/resources.
- Platform reference data: 1,105 movies, 219 persons, 56 badges, 2
  background images, 1 curated collection, site settings.

Everything else — 19 test users, 4 Matrix test clubs (`Matrix
Alpha/Beta/Gamma/Delta`), `Deez Nuts`, `The Goombas`, all invites, join
requests, notifications, push subscriptions, feedback items, and
Matinee test fixtures — was excluded.

## Rollback

The squashed migration files remain in `git log` prior to commit
`<migration-commit-sha>`. To restore the pre-squash history:

```bash
git checkout <pre-baseline-sha> -- supabase/migrations/
```

However, the old database at `ifurgbocssewpoontnml` has been deleted, so
rollback only recovers the SQL files, not the data. For the data, see
`/tmp/backrow-0B/seed.sql` (local scratch) if still present.
