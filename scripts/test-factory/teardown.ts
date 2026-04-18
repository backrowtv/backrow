/**
 * Test Factory — Teardown
 *
 * Clean removal of test data by prefix or full reset. The FK-safe cascade is
 * implemented once in `src/lib/test-cleanup.ts` so this script and the nightly
 * cleanup cron share a single source of truth.
 */

import { supabase } from "./client";
import { deleteClubsByIds, deleteUserScopedRows } from "../../src/lib/test-cleanup";

/**
 * Delete all test users and their associated data by email prefix.
 * E.g., prefix="tiny" deletes all tiny-*@backrow.test users.
 */
export async function teardownByPrefix(prefix: string): Promise<void> {
  console.log(`Tearing down data for prefix "${prefix}"...`);

  const { data: users } = await supabase
    .from("users")
    .select("id, email")
    .like("email", `${prefix}-%@backrow.test`);

  if (!users || users.length === 0) {
    console.log(`  No users found with prefix "${prefix}"`);
    return;
  }

  const userIds = users.map((u) => u.id);
  console.log(`  Found ${users.length} users to clean up`);

  const { data: clubs } = await supabase.from("clubs").select("id").in("producer_id", userIds);
  if (clubs && clubs.length > 0) {
    const clubIds = clubs.map((c) => String(c.id));
    await deleteClubsByIds(supabase, clubIds);
    console.log(`  Deleted ${clubs.length} clubs and related data`);
  }

  await deleteUserScopedRows(supabase, userIds);

  for (const user of users) {
    await supabase.auth.admin.deleteUser(user.id);
  }

  await supabase.from("users").delete().in("id", userIds);

  console.log(`  Cleaned up ${users.length} users with prefix "${prefix}"`);
}

/**
 * Full teardown — iterate every known factory prefix.
 */
export async function teardownAll(): Promise<void> {
  console.log("=== FULL TEARDOWN ===");
  const prefixes = ["tiny", "small", "medium", "active", "large", "preset", "test", "matrix"];
  for (const prefix of prefixes) {
    await teardownByPrefix(prefix);
  }
  console.log("=== TEARDOWN COMPLETE ===");
}
