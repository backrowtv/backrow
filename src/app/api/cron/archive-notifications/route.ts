import { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { archiveOldNotifications } from "@/app/actions/notifications";
import { verifyCronAuth } from "@/lib/api/cron-auth";
import { logger } from "@/lib/logger";

const ROUTE = "/api/cron/archive-notifications";

export async function GET(request: NextRequest) {
  const authError = verifyCronAuth(request);
  if (authError) return authError;

  const start = Date.now();
  logger.info("cron:start", { route: ROUTE });

  try {
    const result = await archiveOldNotifications();

    if (result.error) {
      logger.error("cron:failed", { route: ROUTE, error: result.error, ms: Date.now() - start });
      return NextResponse.json({ error: result.error, archived: 0 }, { status: 500 });
    }

    logger.info("cron:done", {
      route: ROUTE,
      archived: result.archived || 0,
      ms: Date.now() - start,
    });

    return NextResponse.json({
      success: true,
      archived: result.archived || 0,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    logger.error("cron:failed", {
      route: ROUTE,
      error: error instanceof Error ? error.message : String(error),
      ms: Date.now() - start,
    });
    return NextResponse.json({ error: "Internal server error", archived: 0 }, { status: 500 });
  }
}
