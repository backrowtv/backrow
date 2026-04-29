/**
 * Teardown: The Popcorn Posse [SANDBOX]
 *
 * Removes everything seed-popcorn-posse.ts creates, in FK-safe order:
 *   1. Festival children (standings, results, ratings, guesses, nominations, festivals)
 *   2. Club children (theme_pool, seasons, club_members, club)
 *   3. The 9 spoofed `ppsandbox-*@backrow.test` users (auth + public)
 *
 * Stephen's account (stephen@backrow.tv) is never touched.
 *
 * Run:  bun tsx scripts/test-factory/teardown-popcorn-posse.ts
 */

import { supabase } from "./client";

const CLUB_SLUG = "popcorn-posse-sandbox";
const SANDBOX_EMAIL_PATTERN = "ppsandbox-%@backrow.test";

async function main() {
  console.log("=== Teardown Popcorn Posse [SANDBOX] ===\n");

  // 1. Find the club
  const { data: club } = await supabase
    .from("clubs")
    .select("id, name")
    .eq("slug", CLUB_SLUG)
    .maybeSingle();

  if (club) {
    console.log(`→ Found club ${club.name} (id=${club.id})`);
    await deleteClub(club.id);
    console.log(`✓ Club + descendants removed\n`);
  } else {
    console.log(`→ No club at slug=${CLUB_SLUG} — skipping club tear-down\n`);
  }

  // 2. Find the 9 spoofed users
  const { data: users } = await supabase
    .from("users")
    .select("id, email")
    .like("email", SANDBOX_EMAIL_PATTERN);

  if (!users || users.length === 0) {
    console.log(`→ No sandbox users found matching ${SANDBOX_EMAIL_PATTERN}`);
  } else {
    console.log(`→ Removing ${users.length} sandbox users…`);
    for (const u of users) {
      await supabase.auth.admin.deleteUser(u.id); // cascades to public.users + every child row via FKs
      console.log(`  ✓ ${u.email}`);
    }
  }

  console.log("\n✓ Teardown complete.");
}

async function deleteClub(clubId: string): Promise<void> {
  // Festival children
  const { data: festivals } = await supabase.from("festivals").select("id").eq("club_id", clubId);
  const festivalIds = (festivals ?? []).map((f) => f.id);

  if (festivalIds.length > 0) {
    for (const tbl of [
      "festival_standings",
      "festival_results",
      "nomination_guesses",
      "ratings",
      "nominations",
    ]) {
      await supabase.from(tbl).delete().in("festival_id", festivalIds);
    }
    await supabase.from("festivals").delete().in("id", festivalIds);
  }

  // Club children
  for (const tbl of ["theme_pool", "seasons", "club_members"]) {
    await supabase.from(tbl).delete().eq("club_id", clubId);
  }

  // Discussion threads auto-created via trigger — clean them up too
  await supabase.from("discussion_threads").delete().eq("club_id", clubId);

  await supabase.from("clubs").delete().eq("id", clubId);
}

main().catch((err) => {
  console.error("Fatal:", err);
  process.exit(1);
});
