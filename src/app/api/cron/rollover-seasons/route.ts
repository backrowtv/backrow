import { NextResponse } from "next/server";
import { connection } from "next/server";
import { checkAndRolloverSeasons } from "@/app/actions/seasons";
import { verifyCronAuth } from "@/lib/api/cron-auth";
import { logger } from "@/lib/logger";

const ROUTE = "/api/cron/rollover-seasons";

export async function GET(request: Request) {
  await connection();

  const authError = verifyCronAuth(request);
  if (authError) return authError;

  const start = Date.now();
  logger.info("cron:start", { route: ROUTE });

  try {
    const result = await checkAndRolloverSeasons();

    logger.info("cron:done", {
      route: ROUTE,
      rolledOver: result.rolledOver,
      ms: Date.now() - start,
    });

    return NextResponse.json({
      success: true,
      rolledOver: result.rolledOver,
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
