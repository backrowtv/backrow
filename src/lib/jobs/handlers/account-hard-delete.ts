/**
 * Worker body for the `account-hard-delete` topic.
 *
 * Fires 30 days after the user clicks "Delete my account". Re-verifies the
 * soft-delete is still in place, blocks if the user became sole producer of
 * an active club during the grace window, then deletes the auth.users row.
 * Cascade FKs (see migration 0004) remove dependent rows; SET NULL FKs leave
 * audit rows anonymized.
 */

import { claimJob } from "../dedup";
import type { AccountHardDeletePayload } from "../types";
import { createServiceClient } from "@/lib/supabase/server";
import { sendEmail } from "@/lib/email/resend";

export async function handleAccountHardDelete(payload: AccountHardDeletePayload): Promise<void> {
  const claim = await claimJob(payload.dedupId, "account-hard-delete");
  if (!claim.claimed) {
    console.info(`[jobs/account-hard-delete] skip — already processed ${payload.dedupId}`);
    return;
  }

  const supabase = createServiceClient();

  const { data: profile, error: profileErr } = await supabase
    .from("users")
    .select("id, email, deleted_at")
    .eq("id", payload.userId)
    .maybeSingle();

  if (profileErr) {
    console.error("[jobs/account-hard-delete] profile lookup failed", profileErr);
    throw profileErr;
  }

  if (!profile) {
    console.info(`[jobs/account-hard-delete] user ${payload.userId} already gone — nothing to do`);
    return;
  }

  if (!profile.deleted_at) {
    console.info(
      `[jobs/account-hard-delete] user ${payload.userId} un-deleted during grace — aborting`
    );
    return;
  }

  const { count: ownedClubCount, error: clubCountErr } = await supabase
    .from("clubs")
    .select("id", { count: "exact", head: true })
    .eq("producer_id", payload.userId);

  if (clubCountErr) {
    console.error("[jobs/account-hard-delete] club count failed", clubCountErr);
    throw clubCountErr;
  }

  if ((ownedClubCount ?? 0) > 0) {
    console.warn(
      `[jobs/account-hard-delete] user ${payload.userId} still owns ${ownedClubCount} club(s) — cancelling delete`
    );
    await supabase.from("users").update({ deleted_at: null }).eq("id", payload.userId);

    const { data: authUser } = await supabase.auth.admin.getUserById(payload.userId);
    const email = authUser?.user?.email;
    if (email) {
      await sendEmail({
        to: email,
        subject: "We couldn't delete your BackRow account",
        html: `
          <p>We tried to permanently delete your BackRow account today, but you're
          still the producer of one or more active clubs. We can't delete a
          producer without leaving other members orphaned.</p>
          <p>To finish deletion: open each club's settings, transfer producer
          ownership to another member (or archive the club), then click
          "Delete my account" again.</p>
          <p>Your account has been reactivated for now.</p>
          <p>— BackRow</p>
        `,
      });
    }
    return;
  }

  const { error: authDeleteErr } = await supabase.auth.admin.deleteUser(payload.userId);
  if (authDeleteErr) {
    console.error("[jobs/account-hard-delete] auth delete failed", authDeleteErr);
    throw authDeleteErr;
  }

  const { data: exportObjects } = await supabase.storage
    .from("account-exports")
    .list(payload.userId);
  if (exportObjects && exportObjects.length > 0) {
    const paths = exportObjects.map((o) => `${payload.userId}/${o.name}`);
    const { error: removeErr } = await supabase.storage.from("account-exports").remove(paths);
    if (removeErr) {
      console.warn("[jobs/account-hard-delete] failed to clean export bucket", removeErr);
    }
  }

  console.info(`[jobs/account-hard-delete] deleted user ${payload.userId}`);
}
