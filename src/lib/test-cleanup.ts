/**
 * Shared test-data cleanup helpers.
 *
 * Two callers:
 * - `scripts/test-factory/teardown.ts` — CLI-invoked cleanup from CI or dev
 * - `src/app/api/cron/cleanup-test-leak/route.ts` — nightly safety-net cron
 *
 * Both use the same FK-safe cascade and the same regex guards so the meaning
 * of "test leak" stays defined in exactly one place.
 */

import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * Slug patterns for rows we consider test leak. Matches slugs produced by
 * `scripts/test-factory/scenarios.ts` (tiny-club, fest-test, member-test, …)
 * plus ad-hoc slugs from `src/__tests__/actions/` integration tests
 * (edge-case-club, self-rate-test-club, duplicate-test-club, …).
 *
 * NO broad patterns like `/test/` — only explicit prefixes so we can never
 * accidentally match a real user's club.
 */
export const TEST_SLUG_PATTERNS: RegExp[] = [
  /^tiny-club-/,
  /^fest-test-/,
  /^member-test-/,
  /^cleanup-test-/,
  /^endless-test-/,
  /^nom-test-/,
  /^settings-test-/,
  /^rating-test-/,
  /^privacy-(public_open|public_moderated|private)-/,
  /^edge-case-club-/,
  /^self-rate-test-club-/,
  /^duplicate-test-club-/,
  /^empty-theme-club-/,
  /^validation-test-club-/,
];

/**
 * Email patterns for factory-created test users.
 * `@backrow.test` is the factory's synthetic domain.
 */
export const TEST_EMAIL_PATTERNS: RegExp[] = [/^[a-z]+-\d+@backrow\.test$/i];

/** Slugs that must NEVER be deleted regardless of pattern match. */
export const SACRED_SLUGS: ReadonlySet<string> = new Set(["backrow-featured"]);

/** Emails that must NEVER be deleted regardless of pattern match. */
export const SACRED_EMAILS: ReadonlySet<string> = new Set(["stephen@backrow.tv"]);

export function matchesAny(patterns: RegExp[], value: string): boolean {
  for (const p of patterns) if (p.test(value)) return true;
  return false;
}

function chunk<T>(arr: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
}

/**
 * Delete all data for a set of club IDs in FK-safe order. Child tables first,
 * then clubs. Chunked at 200 ids per query to stay under PostgREST URL limits.
 */
export async function deleteClubsByIds(supabase: SupabaseClient, clubIds: string[]): Promise<void> {
  if (clubIds.length === 0) return;

  for (const batch of chunk(clubIds, 200)) {
    const { data: festivals } = await supabase.from("festivals").select("id").in("club_id", batch);
    const festivalIds = (festivals ?? []).map((f) => String(f.id));

    if (festivalIds.length > 0) {
      for (const festBatch of chunk(festivalIds, 200)) {
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
          await supabase.from(table).delete().in("festival_id", festBatch);
        }
      }
    }

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
      await supabase.from(table).delete().in("club_id", batch);
    }

    await supabase.from("clubs").delete().in("id", batch);
  }
}

/**
 * Delete user-level rows for the given user IDs. Tables that FK to auth.users
 * (not public.users) don't cascade on public.users delete, so we wipe them
 * explicitly. Matches the existing `teardownByPrefix` behavior.
 */
export async function deleteUserScopedRows(
  supabase: SupabaseClient,
  userIds: string[]
): Promise<void> {
  if (userIds.length === 0) return;
  for (const batch of chunk(userIds, 200)) {
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
      await supabase.from(table).delete().in("user_id", batch);
    }
  }
}

export type LeakCleanupReport = {
  clubsScanned: number;
  clubsDeleted: number;
  usersScanned: number;
  usersDeleted: number;
  skippedSacred: { slugs: string[]; emails: string[] };
};

/**
 * Find and delete all rows matching TEST_SLUG_PATTERNS / TEST_EMAIL_PATTERNS,
 * guaranteeing SACRED_SLUGS and SACRED_EMAILS are never touched.
 *
 * Used by the nightly cron route as a safety net for ad-hoc leaked rows that
 * the factory's prefix-based teardown misses.
 */
export async function cleanupLeakedData(supabase: SupabaseClient): Promise<LeakCleanupReport> {
  const report: LeakCleanupReport = {
    clubsScanned: 0,
    clubsDeleted: 0,
    usersScanned: 0,
    usersDeleted: 0,
    skippedSacred: { slugs: [], emails: [] },
  };

  // ── Clubs ────────────────────────────────────────────────
  const { data: allClubs, error: clubsErr } = await supabase.from("clubs").select("id, slug");
  if (clubsErr) throw new Error(`clubs scan failed: ${clubsErr.message}`);

  const clubRows = allClubs ?? [];
  report.clubsScanned = clubRows.length;
  const leakedClubIds: string[] = [];
  for (const row of clubRows) {
    const slug = String(row.slug ?? "");
    if (!matchesAny(TEST_SLUG_PATTERNS, slug)) continue;
    if (SACRED_SLUGS.has(slug)) {
      report.skippedSacred.slugs.push(slug);
      continue;
    }
    leakedClubIds.push(String(row.id));
  }
  if (leakedClubIds.length > 0) {
    await deleteClubsByIds(supabase, leakedClubIds);
  }
  report.clubsDeleted = leakedClubIds.length;

  // ── Users ────────────────────────────────────────────────
  const { data: allUsers, error: usersErr } = await supabase.from("users").select("id, email");
  if (usersErr) throw new Error(`users scan failed: ${usersErr.message}`);

  const userRows = allUsers ?? [];
  report.usersScanned = userRows.length;
  const leakedUserIds: string[] = [];
  for (const row of userRows) {
    const email = String(row.email ?? "").toLowerCase();
    if (!matchesAny(TEST_EMAIL_PATTERNS, email)) continue;
    if (SACRED_EMAILS.has(email)) {
      report.skippedSacred.emails.push(email);
      continue;
    }
    leakedUserIds.push(String(row.id));
  }

  if (leakedUserIds.length > 0) {
    await deleteUserScopedRows(supabase, leakedUserIds);

    for (const id of leakedUserIds) {
      await supabase.auth.admin.deleteUser(id);
    }
    for (const batch of chunk(leakedUserIds, 200)) {
      await supabase.from("users").delete().in("id", batch);
    }
  }
  report.usersDeleted = leakedUserIds.length;

  return report;
}
