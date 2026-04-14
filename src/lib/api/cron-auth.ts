import { NextResponse } from "next/server";

/**
 * Verify cron job authorization
 *
 * Security rules:
 * - In production: CRON_SECRET must be set and match
 * - In development: Requires localhost OR valid CRON_SECRET
 *
 * @returns null if authorized, NextResponse error if unauthorized
 */
export function verifyCronAuth(request: Request): NextResponse | null {
  const authHeader = request.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;
  const isProduction = process.env.NODE_ENV === "production";

  // In production, CRON_SECRET is required
  if (isProduction) {
    if (!cronSecret) {
      console.error("CRON_SECRET environment variable is not set");
      return NextResponse.json({ error: "Server configuration error" }, { status: 500 });
    }

    if (authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    return null; // Authorized
  }

  // In development: allow localhost OR valid CRON_SECRET
  if (cronSecret && authHeader === `Bearer ${cronSecret}`) {
    return null; // Authorized via secret
  }

  // Check for localhost in development
  const host = request.headers.get("host") || "";
  const isLocalhost = host.startsWith("localhost") || host.startsWith("127.0.0.1");

  if (!isLocalhost) {
    return NextResponse.json(
      { error: "Unauthorized - development cron requires localhost or CRON_SECRET" },
      { status: 401 }
    );
  }

  return null; // Authorized via localhost
}
