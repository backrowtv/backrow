import { NextRequest, NextResponse } from "next/server";
import { verifyCronAuth } from "@/lib/api/cron-auth";
import { createServiceClient } from "@/lib/supabase/server";
import { logger } from "@/lib/logger";
import { cleanupLeakedData } from "@/lib/test-cleanup";

const ROUTE = "/api/cron/cleanup-test-leak";

export async function GET(request: NextRequest) {
  const authError = verifyCronAuth(request);
  if (authError) return authError;

  const start = Date.now();
  logger.info("cron:start", { route: ROUTE });

  try {
    const supabase = createServiceClient();
    const report = await cleanupLeakedData(supabase);

    logger.info("cron:done", { route: ROUTE, ms: Date.now() - start, ...report });

    return NextResponse.json({
      success: true,
      ...report,
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    logger.error("cron:failed", { route: ROUTE, error: message, ms: Date.now() - start });
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
