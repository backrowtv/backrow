# Database Migrations

This directory contains SQL migration files for the BackRow database schema.

## Migration Files

All migrations use `IF NOT EXISTS` clauses to make them idempotent and safe to run multiple times.

### Current Migrations

All migrations follow the naming pattern: `YYYYMMDDHHMMSS_description.sql`

**Note:** Old migrations without timestamps have been moved to `archive/` folder. Only timestamped migrations are applied automatically by Supabase CLI.

## How to Apply Migrations

### Method 1: Using Supabase CLI (Recommended - 2024/2025)

The Supabase CLI provides the best way to manage migrations. Follow these steps:

1. **Install Supabase CLI** (if not already installed):
   ```bash
   npm install -g supabase
   # Or use npx (no global install needed):
   npx supabase --version
   ```

2. **Login to Supabase**:
   ```bash
   npx supabase login
   ```
   This will open your browser for authentication.

3. **List your projects** (to find project reference ID):
   ```bash
   npx supabase projects list
   ```

4. **Link your local project to Supabase**:
   ```bash
   npx supabase link --project-ref YOUR_PROJECT_REF
   ```
   Replace `YOUR_PROJECT_REF` with your project reference ID (found in dashboard URL or projects list).
   - Dev project: `ifurgbocssewpoontnml` (BackRow-Dev)
   - Prod project: `mwqlquffgznoassdtgnv` (BackRow-Prod)

5. **Push migrations to remote database**:
   ```bash
   npx supabase db push
   ```
   This will:
   - Show all pending migrations (files matching pattern `YYYYMMDDHHMMSS_name.sql`)
   - Ask for confirmation (use `--yes` flag to auto-confirm)
   - Apply migrations in order
   - Track applied migrations in remote database

6. **Check migration status**:
   ```bash
   npx supabase migration list
   ```

**Important Notes:**
- Migration files must follow naming pattern: `YYYYMMDDHHMMSS_description.sql`
- Files without timestamp prefix are skipped automatically
- Migrations are tracked in remote database, so they won't be applied twice
- Use `--dry-run` flag to preview what would be applied without executing
- Use `--include-all` flag to include migrations not in remote history

### Method 2: Manual via Supabase Dashboard (Fallback)

If CLI is not available, apply migrations manually:

1. Go to [Supabase Dashboard](https://supabase.com/dashboard)
2. Select your project (supabase-dev for development)
3. Navigate to **SQL Editor** (in left sidebar)
4. Click **New query**
5. Copy and paste the migration SQL from the file
6. Click **Run** (or press Ctrl+Enter)

## Migration Best Practices

- ✅ All migrations use `IF NOT EXISTS` for idempotency
- ✅ All migrations include comments explaining their purpose
- ✅ All migrations include indexes where needed for performance
- ✅ Migrations are incremental (additive only, no destructive changes)
- ✅ No trailing whitespace or blank lines

## Regenerating TypeScript Types

After applying migrations, you should regenerate TypeScript types to keep `src/types/database.ts` in sync with your database schema.

### Method 1: Using Supabase CLI (Recommended - 2024/2025)

**After linking your project** (see migration steps above), generate types:

```bash
# Generate types from linked project
npx supabase gen types typescript --linked > src/types/database.ts
```

**Or using project reference directly** (without linking):

```bash
# Get your project reference ID from dashboard or: npx supabase projects list
npx supabase gen types typescript --project-id YOUR_PROJECT_REF > src/types/database.ts
```

**Project Reference IDs:**
- Dev: `ifurgbocssewpoontnml` (BackRow-Dev)
- Prod: `mwqlquffgznoassdtgnv` (BackRow-Prod)

**Update package.json script** (optional, for convenience):
```json
"generate-types": "npx supabase gen types typescript --linked > src/types/database.ts",
"generate-types:dev": "npx supabase gen types typescript --project-id ifurgbocssewpoontnml > src/types/database.ts",
"generate-types:prod": "npx supabase gen types typescript --project-id mwqlquffgznoassdtgnv > src/types/database.ts"
```

### Method 2: Using Supabase Dashboard (Manual)

1. Go to [Supabase Dashboard](https://supabase.com/dashboard)
2. Select your project
3. Navigate to **Settings** → **API**
4. Scroll down to **TypeScript types**
5. Click **Generate types**
6. Copy the generated types
7. Replace the contents of `src/types/database.ts` with the copied types

**Note**: The manual method is useful if you don't have Supabase CLI installed, but the CLI method is faster and can be automated.

## Notes

- The base database schema was created directly in Supabase Dashboard
- These migrations represent incremental changes added over time
- All migrations have been tested and are currently in use in the codebase
- Never modify existing migration files - create new ones for changes
- **Always regenerate types after applying migrations** to keep TypeScript types in sync
