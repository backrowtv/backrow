import { NextResponse } from "next/server";
import { connection } from "next/server";
import { checkAndAdvanceFestivalPhases } from "@/app/actions/festivals";
import { verifyCronAuth } from "@/lib/api/cron-auth";
import { logger } from "@/lib/logger";

const ROUTE = "/api/cron/advance-festivals";

export async function GET(request: Request) {
  await connection();

  const authError = verifyCronAuth(request);
  if (authError) return authError;

  const start = Date.now();
  logger.info("cron:start", { route: ROUTE });

  try {
    const result = await checkAndAdvanceFestivalPhases();

    logger.info("cron:done", { route: ROUTE, advanced: result.advanced, ms: Date.now() - start });

    return NextResponse.json({
      success: true,
      advanced: result.advanced,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    logger.error("cron:failed", {
      route: ROUTE,
      error: error instanceof Error ? error.message : String(error),
      ms: Date.now() - start,
    });
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
