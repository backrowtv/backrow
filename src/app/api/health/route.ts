import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { rateLimit, getRateLimitResponse } from "@/lib/security/rate-limit";

export async function GET(request: NextRequest) {
  const rateLimitResult = rateLimit(request);
  if (!rateLimitResult.success) {
    return getRateLimitResponse(rateLimitResult.reset);
  }

  const timestamp = new Date().toISOString();

  try {
    const supabase = await createClient();
    const { error } = await supabase.from("users").select("id").limit(1);

    if (error) {
      return NextResponse.json(
        { status: "degraded", database: "disconnected", timestamp },
        { status: 503 }
      );
    }

    return NextResponse.json({ status: "ok", database: "connected", timestamp });
  } catch {
    return NextResponse.json(
      { status: "degraded", database: "disconnected", timestamp },
      { status: 503 }
    );
  }
}
