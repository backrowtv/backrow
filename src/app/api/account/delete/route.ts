/**
 * POST /api/account/delete
 *
 * Soft-deletes the signed-in user's account: sets deleted_at, anonymizes PII
 * in public.users, ends the session, enqueues a hard-delete job with a 30-day
 * delay. The middleware in proxy.ts blocks sign-in during the grace window.
 *
 * Refuses if the user is the sole producer of any active club (otherwise the
 * hard-delete would destroy shared data). The user must transfer or archive
 * those clubs first.
 *
 * Security (see docs/security.md):
 *   rate-limit → BotID (high-value) → getUser → requireVerifiedEmail → business
 */

import { NextResponse } from "next/server";
import { actionRateLimit } from "@/lib/security/action-rate-limit";
import { requireVerifiedEmail } from "@/lib/security/require-verified-email";
import { createClient } from "@/lib/supabase/server";
import { enqueueAccountHardDelete } from "@/lib/jobs/producers";
import { removeContactByEmail } from "@/lib/email/resend";

const THIRTY_DAYS_SECONDS = 30 * 24 * 60 * 60;

export async function POST() {
  const rateCheck = await actionRateLimit("deleteAccount", {
    limit: 3,
    windowMs: 60 * 1000,
  });
  if (!rateCheck.success) {
    return NextResponse.json({ success: false, error: rateCheck.error }, { status: 429 });
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json(
      { success: false, error: "You must be signed in to delete your account." },
      { status: 401 }
    );
  }

  const verified = requireVerifiedEmail(user);
  if (!verified.ok) {
    return NextResponse.json({ success: false, error: verified.error }, { status: 403 });
  }

  const { count: ownedClubCount, error: clubCountErr } = await supabase
    .from("clubs")
    .select("id", { count: "exact", head: true })
    .eq("producer_id", user.id);
  if (clubCountErr) {
    console.error("[api/account/delete] club count failed", clubCountErr);
    return NextResponse.json(
      { success: false, error: "Could not verify club ownership. Try again shortly." },
      { status: 500 }
    );
  }
  if ((ownedClubCount ?? 0) > 0) {
    return NextResponse.json(
      {
        success: false,
        error:
          "You still own one or more clubs. Transfer ownership or archive each club before deleting your account.",
      },
      { status: 400 }
    );
  }

  // Enqueue the hard-delete job BEFORE anonymizing. If enqueue fails, the
  // user's data is untouched and they can retry. If anonymize fails after
  // a successful enqueue, the worker re-checks `deleted_at` when it fires
  // in 30 days and aborts cleanly when it's NULL — a safe no-op.
  try {
    await enqueueAccountHardDelete(user.id, { delaySeconds: THIRTY_DAYS_SECONDS });
  } catch (enqueueErr) {
    console.error("[api/account/delete] hard-delete enqueue failed", enqueueErr);
    return NextResponse.json(
      { success: false, error: "Could not process deletion. Try again shortly." },
      { status: 500 }
    );
  }

  // Remove the user's email from Resend before anonymization — once the
  // row is anonymized we no longer have the original email to pass to
  // Resend. Safe to fire-and-forget: the helper swallows errors so a Resend
  // outage can't block account deletion.
  if (user.email) {
    await removeContactByEmail(user.email);
  }

  const anonymizedEmail = `deleted+${user.id}@backrow.tv`;
  const anonymizedUsername = `deleted_${user.id.replace(/-/g, "").slice(0, 16)}`;

  const { error: updateErr } = await supabase
    .from("users")
    .update({
      deleted_at: new Date().toISOString(),
      email: anonymizedEmail,
      display_name: "Deleted User",
      username: anonymizedUsername,
      avatar_url: null,
      bio: null,
      social_links: {},
    })
    .eq("id", user.id);

  if (updateErr) {
    console.error("[api/account/delete] soft-delete update failed", updateErr);
    return NextResponse.json(
      { success: false, error: "Could not process deletion. Try again shortly." },
      { status: 500 }
    );
  }

  await supabase.auth.signOut();

  return NextResponse.json({ success: true });
}
