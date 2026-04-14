/**
 * Test Factory — Teardown
 *
 * Clean removal of test data by prefix or full reset.
 * Deletes in FK-safe order.
 */

import { supabase } from "./client";

/**
 * Delete all test users and their associated data by email prefix.
 * E.g., prefix="tiny" deletes all tiny-*@backrow.test users.
 */
export async function teardownByPrefix(prefix: string): Promise<void> {
  console.log(`Tearing down data for prefix "${prefix}"...`);

  // Find users with this prefix
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

  // Find clubs owned by these users
  const { data: clubs } = await supabase.from("clubs").select("id").in("producer_id", userIds);

  if (clubs && clubs.length > 0) {
    const clubIds = clubs.map((c) => c.id);
    await deleteClubData(clubIds);
    console.log(`  Deleted ${clubs.length} clubs and related data`);
  }

  // Delete user-level data
  for (const table of [
    "user_badges",
    "user_favorites",
    "future_nomination_links",
    "future_nomination_list",
    "generic_ratings",
    "watch_history",
    "user_rubrics",
    "favorite_clubs",
    "notifications",
  ]) {
    await supabase.from(table).delete().in("user_id", userIds);
  }

  // Delete auth users
  for (const user of users) {
    await supabase.auth.admin.deleteUser(user.id);
  }

  // Delete public.users
  await supabase.from("users").delete().in("id", userIds);

  console.log(`  Cleaned up ${users.length} users with prefix "${prefix}"`);
}

/**
 * Delete all data for given club IDs in FK-safe order.
 */
async function deleteClubData(clubIds: string[]): Promise<void> {
  // Get all festival IDs for these clubs
  const { data: festivals } = await supabase.from("festivals").select("id").in("club_id", clubIds);

  const festivalIds = festivals?.map((f) => f.id) || [];

  if (festivalIds.length > 0) {
    // Festival-level data (FK-safe order: children first)
    for (const table of [
      "festival_standings",
      "festival_results",
      "festival_rubric_locks",
      "nomination_guesses",
      "stack_rankings",
      "ratings",
      "nominations",
      "theme_votes",
    ]) {
      await supabase.from(table).delete().in("festival_id", festivalIds);
    }
  }

  // Club-level data
  for (const table of [
    "discussion_thread_tags",
    "discussion_thread_unlocks",
    "discussion_votes",
    "discussion_comments",
    "discussion_threads",
    "club_poll_votes",
    "club_polls",
    "club_announcements",
    "club_event_rsvps",
    "club_events",
    "club_notes",
    "private_notes",
    "club_word_blacklist",
    "club_resources",
    "club_badges",
    "movie_pool_votes",
    "club_movie_pool",
    "theme_pool_votes",
    "theme_pool",
    "chat_messages",
    "chat_messages_archive",
    "direct_messages",
    "activity_log",
    "activity_log_archive",
    "club_join_requests",
    "club_invites",
    "blocked_users",
    "favorite_clubs",
    "club_members",
    "festivals",
    "seasons",
    "club_stats",
  ]) {
    await supabase.from(table).delete().in("club_id", clubIds);
  }

  // Delete clubs themselves
  await supabase.from("clubs").delete().in("id", clubIds);
}

/**
 * Full teardown — delete ALL test factory data.
 * Finds all @backrow.test users and their clubs.
 */
export async function teardownAll(): Promise<void> {
  console.log("=== FULL TEARDOWN ===");

  const prefixes = ["tiny", "small", "medium", "active", "large", "preset", "test", "matrix"];

  for (const prefix of prefixes) {
    await teardownByPrefix(prefix);
  }

  console.log("=== TEARDOWN COMPLETE ===");
}
