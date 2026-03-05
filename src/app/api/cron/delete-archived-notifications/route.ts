import { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { deleteOldArchivedNotifications } from "@/app/actions/notifications";
import { verifyCronAuth } from "@/lib/api/cron-auth";
import { logger } from "@/lib/logger";

const ROUTE = "/api/cron/delete-archived-notifications";

export async function GET(request: NextRequest) {
  const authError = verifyCronAuth(request);
  if (authError) return authError;

  const start = Date.now();
  logger.info("cron:start", { route: ROUTE });

  try {
    const result = await deleteOldArchivedNotifications();

    if (result.error) {
      logger.error("cron:failed", { route: ROUTE, error: result.error, ms: Date.now() - start });
      return NextResponse.json({ error: result.error, deleted: 0 }, { status: 500 });
    }

    logger.info("cron:done", {
      route: ROUTE,
      deleted: result.deleted || 0,
      ms: Date.now() - start,
    });

    return NextResponse.json({
      success: true,
      deleted: result.deleted || 0,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    logger.error("cron:failed", {
      route: ROUTE,
      error: error instanceof Error ? error.message : String(error),
      ms: Date.now() - start,
    });
    return NextResponse.json({ error: "Internal server error", deleted: 0 }, { status: 500 });
  }
}
