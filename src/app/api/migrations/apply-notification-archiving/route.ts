import { NextRequest, NextResponse } from "next/server";
import { applyNotificationArchivingMigration } from "@/app/actions/migrations";
import { verifyCronAuth } from "@/lib/api/cron-auth";

/**
 * API endpoint to apply notification archiving migration
 * Requires CRON_SECRET authorization (same as cron jobs)
 */
export async function POST(request: NextRequest) {
  const authError = verifyCronAuth(request);
  if (authError) return authError;
  try {
    const result = await applyNotificationArchivingMigration();

    if (result.error) {
      return NextResponse.json({ error: result.error, success: false }, { status: 400 });
    }

    return NextResponse.json({
      success: true,
      message: "Migration applied successfully",
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Error applying migration:", error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Internal server error",
        success: false,
      },
      { status: 500 }
    );
  }
}
