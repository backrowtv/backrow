import { NextRequest, NextResponse } from "next/server";
import { verifyCronAuth } from "@/lib/api/cron-auth";
import { createServiceClient } from "@/lib/supabase/server";
import { logger } from "@/lib/logger";

const ROUTE = "/api/cron/cleanup-job-dedup";
const RETENTION_DAYS = 7;

export async function GET(request: NextRequest) {
  const authError = verifyCronAuth(request);
  if (authError) return authError;

  const start = Date.now();
  logger.info("cron:start", { route: ROUTE });

  const cutoff = new Date(Date.now() - RETENTION_DAYS * 24 * 60 * 60 * 1000).toISOString();
  const supabase = createServiceClient();

  const { data, error } = await supabase
    .from("job_dedup")
    .delete()
    .lt("created_at", cutoff)
    .select("key");

  if (error) {
    logger.error("cron:failed", { route: ROUTE, error: error.message, ms: Date.now() - start });
    return NextResponse.json({ error: error.message, deleted: 0 }, { status: 500 });
  }

  const deleted = data?.length ?? 0;
  logger.info("cron:done", { route: ROUTE, deleted, ms: Date.now() - start });

  return NextResponse.json({
    success: true,
    deleted,
    cutoff,
    timestamp: new Date().toISOString(),
  });
}
