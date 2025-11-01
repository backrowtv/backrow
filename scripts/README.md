# BackRow Development Scripts

This directory contains utility scripts for database management.

## Prerequisites

All scripts require the `SUPABASE_SERVICE_ROLE_KEY` environment variable:

1. **Get your Supabase Service Role Key:**
   - Go to your Supabase project dashboard
   - Navigate to Settings → API
   - Copy the `service_role` key (⚠️ Keep this secret - it bypasses Row Level Security)
   - Add it to your `.env.local` file:
     ```
     SUPABASE_SERVICE_ROLE_KEY=your_service_role_key_here
     ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

## Available Scripts

### `check-current-policies`

SQL script to verify current RLS policies on `clubs` and `club_members` tables.

**Usage:**
1. Copy the contents of `scripts/check-current-policies.sql`
2. Run in Supabase Dashboard SQL Editor
3. Review the output to verify RLS policies are correctly configured

**What it checks:**
- All policies on `clubs` table
- All policies on `club_members` table
- Existence and properties of `is_club_member` function
- RLS enablement status

---

### `delete-all-data`

⚠️ **WARNING: This will delete ALL user data!**

Deletes all users, clubs, festivals, seasons, and related data from the database.

**Usage:**
```bash
npm run delete-all-data
```

**What it deletes:**
- All users (public.users and auth.users)
- All clubs and club members
- All festivals, seasons, nominations, ratings
- All chat messages, activity logs
- All festival results and guesses

**What it preserves:**
- `movies` table (TMDB cache) - kept for performance

**Use cases:**
- Resetting the database for fresh testing
- Clearing all data before starting over

---

### `run-data-migration`

Migrates existing `festival_results` JSONB data to the normalized `festival_standings` table.

**Usage:**
```bash
npx tsx scripts/run-data-migration.ts
```

**What it does:**
- Reads all final festival results from `festival_results` table
- Transforms JSONB standings data into normalized `festival_standings` records
- Handles both snake_case and camelCase formats
- Upserts data (safe to run multiple times)

**When to use:**
- After running the database performance migration
- To populate `festival_standings` from existing historical data
- Can be run multiple times safely (uses upsert)

---

## Troubleshooting

**Error: SUPABASE_SERVICE_ROLE_KEY is not set**
- Make sure you've added the service role key to `.env.local`
- The key should start with `eyJ...` (it's a JWT token)

**Error: Permission denied**
- Make sure you're using the `service_role` key, not the `anon` key
- The service role key bypasses RLS policies

---

## Script Development

When creating new scripts:

1. Use the same pattern as existing scripts:
   - Load environment variables from `.env.local`
   - Use `@supabase/supabase-js` with service role key
   - Include proper error handling
   - Provide clear console output

2. Add the script to `package.json`:
   ```json
   "script-name": "tsx scripts/script-name.ts"
   ```

3. Update this README with documentation
