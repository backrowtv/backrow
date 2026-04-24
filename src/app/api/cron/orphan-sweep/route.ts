import { NextRequest, NextResponse } from "next/server";
import { verifyCronAuth } from "@/lib/api/cron-auth";
import { createServiceClient } from "@/lib/supabase/server";
import { logger } from "@/lib/logger";

const ROUTE = "/api/cron/orphan-sweep";
const EXPORT_TTL_DAYS = 7;
const SOFT_DELETE_TTL_DAYS = 30;

/**
 * Weekly orphan sweep — cleans up stale signed-URL artifacts the hard-delete
 * worker didn't catch. Today the only case is the private account-exports
 * bucket: signed URLs expire after 7 days, but the underlying objects need
 * to be removed so we're not holding user data indefinitely.
 *
 * Scheduled via vercel.json crons (Sundays 06:00 UTC). Can be invoked
 * manually with `Authorization: Bearer $CRON_SECRET`.
 */
export async function GET(request: NextRequest) {
  const authError = verifyCronAuth(request);
  if (authError) return authError;

  const start = Date.now();
  logger.info("cron:start", { route: ROUTE });

  const supabase = createServiceClient();
  const cutoff = new Date(Date.now() - EXPORT_TTL_DAYS * 24 * 60 * 60 * 1000);

  let removedExports = 0;
  const errors: string[] = [];

  const { data: userFolders, error: listErr } = await supabase.storage
    .from("account-exports")
    .list("", { limit: 1000 });

  if (listErr) {
    logger.error("cron:failed", { route: ROUTE, step: "list-folders", error: listErr.message });
    return NextResponse.json({ error: listErr.message }, { status: 500 });
  }

  for (const folder of userFolders ?? []) {
    if (!folder.name) continue;
    const { data: objects, error: objErr } = await supabase.storage
      .from("account-exports")
      .list(folder.name, { limit: 1000 });
    if (objErr) {
      errors.push(`${folder.name}: ${objErr.message}`);
      continue;
    }
    const stale = (objects ?? [])
      .filter((o) => {
        const createdAt = o.created_at ? new Date(o.created_at) : null;
        return createdAt && createdAt < cutoff;
      })
      .map((o) => `${folder.name}/${o.name}`);

    if (stale.length > 0) {
      const { error: removeErr } = await supabase.storage.from("account-exports").remove(stale);
      if (removeErr) {
        errors.push(`remove ${folder.name}: ${removeErr.message}`);
      } else {
        removedExports += stale.length;
      }
    }
  }

  // Hard-delete soft-deleted discussion comments past the retention window.
  // Comments are soft-deleted to preserve thread integrity in real time; they
  // age out permanently after 30 days so retention matches the account
  // grace-window.
  const commentCutoff = new Date(
    Date.now() - SOFT_DELETE_TTL_DAYS * 24 * 60 * 60 * 1000
  ).toISOString();
  let removedComments = 0;
  const { data: purgedComments, error: commentErr } = await supabase
    .from("discussion_comments")
    .delete()
    .not("deleted_at", "is", null)
    .lt("deleted_at", commentCutoff)
    .select("id");

  if (commentErr) {
    errors.push(`discussion_comments: ${commentErr.message}`);
  } else {
    removedComments = purgedComments?.length ?? 0;
  }

  const ms = Date.now() - start;
  logger.info("cron:done", {
    route: ROUTE,
    removedExports,
    removedComments,
    errorCount: errors.length,
    ms,
  });

  return NextResponse.json({
    success: true,
    removedExports,
    removedComments,
    errors,
    cutoff: cutoff.toISOString(),
    commentCutoff,
    ms,
  });
}
