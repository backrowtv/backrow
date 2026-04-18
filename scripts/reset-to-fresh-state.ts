/**
 * BackRow Database Reset — Fresh-Start Script
 *
 * Wipes all users, clubs, festivals, activity, TMDB cache, site config,
 * and storage objects — then re-seeds stephen@backrow.tv as sole user and
 * backrow-featured as sole club with a fresh season.
 *
 * ⚠️  DESTRUCTIVE: target is the live Supabase project (production DB).
 *
 * Usage:
 *   bun run scripts/reset-to-fresh-state.ts              # dry-run (counts only)
 *   bun run scripts/reset-to-fresh-state.ts --execute    # perform reset
 */

import { createClient } from "@supabase/supabase-js";
import postgres from "postgres";
import { config } from "dotenv";
import { join } from "path";
import readline from "readline";

config({ path: join(process.cwd(), ".env.local") });

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const DATABASE_URL = process.env.DATABASE_URL;

if (!SUPABASE_URL || !SERVICE_KEY || !DATABASE_URL) {
  console.error(
    "Missing env vars. Need: NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, DATABASE_URL in .env.local"
  );
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SERVICE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const sql = postgres(DATABASE_URL, { max: 1, prepare: false });

const STEPHEN_EMAIL = "stephen@backrow.tv";
const STEPHEN_PASSWORD = "Tritium!20";
const FEATURED_SLUG = "backrow-featured";

const STORAGE_BUCKETS = [
  "account-exports",
  "announcement-images",
  "avatars",
  "backgrounds",
  "badge-icons",
  "club-backgrounds",
  "club-pictures",
  "festival-backgrounds",
  "festival-pictures",
];

// Global / non-scoped tables that aren't wiped by clubs/users cascades
// but which the user asked to reset (TMDB cache, site config, analytics, audit logs)
const GLOBAL_TABLES_TO_TRUNCATE = [
  "movies",
  "persons",
  "tmdb_search_cache",
  "site_settings",
  "site_announcements",
  "activity_log_archive",
  "chat_messages_archive",
  "feedback_items",
  "feedback_votes",
  "filter_analytics",
  "search_analytics",
  "contact_submissions",
  "notification_dead_letter_queue",
  "notification_delivery_log",
  "job_dedup",
  "stripe_event_log",
];

// System-seed tables intentionally preserved (not user data):
// badges, curated_collections, background_images
// Their user/club-scoped rows still get wiped via cascade when users/clubs delete.

function parseArgs() {
  return {
    execute: process.argv.includes("--execute"),
    skipConfirm: process.argv.includes("--yes"),
  };
}

async function countBucket(bucket: string, prefix = ""): Promise<number> {
  const { data, error } = await supabase.storage.from(bucket).list(prefix, {
    limit: 1000,
  });
  if (error) return 0;
  if (!data) return 0;
  let count = 0;
  for (const item of data) {
    if (item.id === null) {
      const sub = prefix ? `${prefix}/${item.name}` : item.name;
      count += await countBucket(bucket, sub);
    } else {
      count += 1;
    }
  }
  return count;
}

async function wipeBucket(bucket: string, prefix = ""): Promise<number> {
  const { data, error } = await supabase.storage.from(bucket).list(prefix, {
    limit: 1000,
  });
  if (error) throw new Error(`list(${bucket}): ${error.message}`);
  if (!data || data.length === 0) return 0;
  const files: string[] = [];
  let folderTotal = 0;
  for (const item of data) {
    const path = prefix ? `${prefix}/${item.name}` : item.name;
    if (item.id === null) {
      folderTotal += await wipeBucket(bucket, path);
    } else {
      files.push(path);
    }
  }
  if (files.length > 0) {
    const { error: rmErr } = await supabase.storage.from(bucket).remove(files);
    if (rmErr) throw new Error(`remove(${bucket}): ${rmErr.message}`);
  }
  return files.length + folderTotal;
}

async function capturePreserved() {
  const featuredRows = (await sql`
    SELECT * FROM public.clubs WHERE slug = ${FEATURED_SLUG} LIMIT 1
  `) as Array<Record<string, unknown>>;
  if (featuredRows.length === 0) {
    throw new Error(`Club "${FEATURED_SLUG}" not found. Aborting.`);
  }
  const featured = featuredRows[0];

  const { data: listData, error: listErr } = await supabase.auth.admin.listUsers({
    perPage: 1000,
  });
  if (listErr) throw new Error(`listUsers: ${listErr.message}`);
  const stephen = listData.users.find((u) => u.email === STEPHEN_EMAIL);
  if (!stephen) {
    throw new Error(`Auth user "${STEPHEN_EMAIL}" not found. Aborting.`);
  }

  return { featured, stephen, authUsers: listData.users };
}

async function printDryRun(featuredId: string, stephenId: string, authUserCount: number) {
  console.log("\n📊 Dry-run — public schema row counts (non-zero only):\n");
  const rows = (await sql`
    SELECT schemaname, relname AS table_name, n_live_tup AS count
    FROM pg_stat_user_tables
    WHERE schemaname = 'public' AND n_live_tup > 0
    ORDER BY n_live_tup DESC
  `) as Array<{ table_name: string; count: number }>;
  let total = 0;
  for (const r of rows) {
    const n = Number(r.count);
    console.log(`  ${r.table_name.padEnd(42)} ${n.toLocaleString()}`);
    total += n;
  }
  console.log(`  ${"─".repeat(60)}`);
  console.log(`  ${"TOTAL (public)".padEnd(42)} ${total.toLocaleString()}`);

  console.log(`\n  ${"auth.users".padEnd(42)} ${authUserCount}`);

  console.log("\n📁 Storage bucket object counts:\n");
  for (const b of STORAGE_BUCKETS) {
    const n = await countBucket(b);
    console.log(`  ${b.padEnd(42)} ${n}`);
  }

  console.log("\n💾 Preserved identity:");
  console.log(`  - auth.users "${STEPHEN_EMAIL}" (id ${stephenId})`);
  console.log(`  - public.clubs "${FEATURED_SLUG}" (id ${featuredId})`);
  console.log("\n🔒 Preserved system seeds:");
  console.log(`  - public.badges (site-wide achievement templates)`);
  console.log(`  - public.curated_collections`);
  console.log(`  - public.background_images`);
}

async function promptConfirm(): Promise<boolean> {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });
  const answer: string = await new Promise((r) =>
    rl.question('\n   Type "RESET" to confirm (anything else aborts): ', r)
  );
  rl.close();
  return answer.trim() === "RESET";
}

async function executeReset(
  featured: Record<string, unknown>,
  stephen: { id: string; email?: string },
  authUsers: Array<{ id: string; email?: string }>
) {
  const stephenId = stephen.id;
  const featuredId = String(featured.id);

  // ─── Phase 1: SQL wipe (transaction) ──────────────────────
  console.log("\n🔴 Phase 1/5 — Wiping public schema...");
  await sql.begin(async (tx) => {
    await tx`DELETE FROM public.clubs`;
    await tx`DELETE FROM public.users`;
    // These 5 tables FK to auth.users (not public.users), so DELETE FROM public.users
    // doesn't cascade them. Stephen's rows would survive his preserved auth row.
    await tx`DELETE FROM public.user_favorites WHERE user_id = ${stephenId}`;
    await tx`DELETE FROM public.future_nomination_list WHERE user_id = ${stephenId}`;
    await tx`DELETE FROM public.hidden_activities WHERE user_id = ${stephenId}`;
    await tx`DELETE FROM public.hidden_watch_history WHERE user_id = ${stephenId}`;
    await tx`DELETE FROM public.movie_pool_votes WHERE user_id = ${stephenId}`;
    const tableList = GLOBAL_TABLES_TO_TRUNCATE.map((t) => `public.${t}`).join(", ");
    await tx.unsafe(`TRUNCATE ${tableList} CASCADE`);
  });
  console.log("  ✅ public schema wiped.");

  // ─── Phase 2: auth.users (admin API) ──────────────────────
  console.log("\n🔴 Phase 2/5 — Purging auth.users (preserving Stephen)...");
  const toDelete = authUsers.filter((u) => u.id !== stephenId);
  console.log(`  ${toDelete.length} auth users to delete.`);
  let deleted = 0;
  let failed = 0;
  for (const u of toDelete) {
    const { error } = await supabase.auth.admin.deleteUser(u.id);
    if (error) {
      console.warn(`  ⚠️  ${u.email || u.id}: ${error.message}`);
      failed++;
    } else {
      deleted++;
    }
  }
  console.log(`  ✅ Deleted ${deleted}/${toDelete.length} (${failed} failed).`);

  // ─── Phase 3: Storage ─────────────────────────────────────
  console.log("\n🔴 Phase 3/5 — Wiping storage buckets...");
  for (const b of STORAGE_BUCKETS) {
    try {
      const n = await wipeBucket(b);
      console.log(`  ✅ ${b.padEnd(25)} removed ${n} objects`);
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      console.warn(`  ⚠️  ${b}: ${msg}`);
    }
  }

  // ─── Phase 4: Reset Stephen's password ────────────────────
  console.log("\n🔴 Phase 4/5 — Resetting Stephen's password...");
  const { error: pwErr } = await supabase.auth.admin.updateUserById(stephenId, {
    password: STEPHEN_PASSWORD,
  });
  if (pwErr) throw new Error(`Password reset failed: ${pwErr.message}`);
  console.log(`  ✅ Password reset.`);

  // ─── Phase 5: Re-seed ─────────────────────────────────────
  console.log("\n🔴 Phase 5/5 — Re-seeding (user, club, season, membership, admin)...");
  await sql.begin(async (tx) => {
    await tx`
      INSERT INTO public.users (id, email, username, display_name, email_verified)
      VALUES (${stephenId}, ${STEPHEN_EMAIL}, 'stephen', 'Stephen', true)
    `;

    // Re-insert the preserved club row verbatim (captured in SELECT *).
    // updated_at will be overwritten by the set_updated_at trigger — fine.
    // Normalize producer_id to the preserved Stephen id just in case.
    const clubRow = { ...featured, producer_id: stephenId };
    await tx`INSERT INTO public.clubs ${tx(clubRow)}`;

    // Fresh season (start_date / end_date are NOT NULL)
    const now = new Date();
    const end = new Date(now.getTime() + 365 * 24 * 60 * 60 * 1000);
    await tx`
      INSERT INTO public.seasons (club_id, name, start_date, end_date)
      VALUES (${featuredId}, 'Season 1', ${now}, ${end})
    `;

    await tx`
      INSERT INTO public.club_members (club_id, user_id, role)
      VALUES (${featuredId}, ${stephenId}, 'producer')
    `;

    await tx`
      INSERT INTO public.site_admins (user_id, role)
      VALUES (${stephenId}, 'admin')
    `;
  });
  console.log("  ✅ Re-seed complete.");

  // ─── Verification ─────────────────────────────────────────
  console.log("\n🔍 Post-reset verification:");
  const [userCountRow] = (await sql`SELECT COUNT(*)::int AS n FROM public.users`) as Array<{
    n: number;
  }>;
  const [clubCountRow] = (await sql`SELECT COUNT(*)::int AS n FROM public.clubs`) as Array<{
    n: number;
  }>;
  const memberRoles = (await sql`
    SELECT role FROM public.club_members WHERE user_id = ${stephenId}
  `) as Array<{ role: string }>;
  const [seasonCountRow] = (await sql`
    SELECT COUNT(*)::int AS n FROM public.seasons WHERE club_id = ${featuredId}
  `) as Array<{ n: number }>;
  const [adminCountRow] = (await sql`
    SELECT COUNT(*)::int AS n FROM public.site_admins WHERE user_id = ${stephenId}
  `) as Array<{ n: number }>;
  const [activityCountRow] = (await sql`
    SELECT COUNT(*)::int AS n FROM public.activity_log
  `) as Array<{ n: number }>;
  const [festivalCountRow] = (await sql`
    SELECT COUNT(*)::int AS n FROM public.festivals
  `) as Array<{ n: number }>;
  const [movieCountRow] = (await sql`
    SELECT COUNT(*)::int AS n FROM public.movies
  `) as Array<{ n: number }>;

  console.log(`  public.users                 = ${userCountRow.n}  (expect 1)`);
  console.log(`  public.clubs                 = ${clubCountRow.n}  (expect 1)`);
  console.log(
    `  club_members (Stephen role)  = ${memberRoles.map((r) => r.role).join(",") || "(none)"}  (expect "producer")`
  );
  console.log(`  seasons (on featured club)   = ${seasonCountRow.n}  (expect 1)`);
  console.log(`  site_admins (Stephen)        = ${adminCountRow.n}  (expect 1)`);
  console.log(`  activity_log                 = ${activityCountRow.n}  (expect 0)`);
  console.log(`  festivals                    = ${festivalCountRow.n}  (expect 0)`);
  console.log(`  movies (TMDB cache)          = ${movieCountRow.n}  (expect 0)`);

  console.log("\n" + "═".repeat(70));
  console.log("✅ RESET COMPLETE");
  console.log("═".repeat(70));
  console.log(`Sign in at backrow.tv with:`);
  console.log(`  email:    ${STEPHEN_EMAIL}`);
  console.log(`  password: ${STEPHEN_PASSWORD}`);
}

async function main() {
  const { execute, skipConfirm } = parseArgs();

  console.log("═".repeat(70));
  console.log("BACKROW DATABASE RESET");
  console.log("═".repeat(70));
  console.log(`Target: ${SUPABASE_URL}`);
  console.log(`Mode:   ${execute ? "🔴 EXECUTE (DESTRUCTIVE)" : "🟢 DRY-RUN (read-only)"}`);
  console.log("═".repeat(70));

  const { featured, stephen, authUsers } = await capturePreserved();
  await printDryRun(String(featured.id), stephen.id, authUsers.length);

  if (!execute) {
    console.log("\n🟢 Dry-run complete. Re-run with --execute to perform the reset.\n");
    await sql.end();
    return;
  }

  console.log("\n⚠️  WARNING: This will irreversibly wipe production data.");
  console.log("    Supabase PITR is your only rollback — verify it's enabled.");
  if (!skipConfirm) {
    const ok = await promptConfirm();
    if (!ok) {
      console.log("Aborted.");
      await sql.end();
      return;
    }
  }

  await executeReset(featured, stephen, authUsers);
  await sql.end();
}

main().catch(async (e) => {
  console.error("\n❌ FATAL:", e);
  try {
    await sql.end();
  } catch {
    // ignore
  }
  process.exit(1);
});
