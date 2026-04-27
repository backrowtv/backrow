/**
 * POST /api/account/export
 *
 * Enqueues a data-export job for the signed-in user. The worker (see
 * src/lib/jobs/handlers/account-export.ts) builds a ZIP in the private
 * account-exports bucket and emails a 7-day signed URL.
 *
 * Security (see docs/security.md):
 *   rate-limit → getUser → requireVerifiedEmail → business
 */

import { NextResponse } from "next/server";
import { actionRateLimit } from "@/lib/security/action-rate-limit";
import { requireVerifiedEmail } from "@/lib/security/require-verified-email";
import { createClient } from "@/lib/supabase/server";
import { enqueueAccountExport } from "@/lib/jobs/producers";

export async function POST() {
  const rateCheck = await actionRateLimit("exportData", {
    limit: 3,
    windowMs: 60 * 60 * 1000,
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
      { success: false, error: "You must be signed in to export your data." },
      { status: 401 }
    );
  }

  const verified = requireVerifiedEmail(user);
  if (!verified.ok) {
    return NextResponse.json({ success: false, error: verified.error }, { status: 403 });
  }

  await enqueueAccountExport(user.id);

  return NextResponse.json({ success: true });
}
