import { NextResponse } from "next/server";

/**
 * Temporary debug endpoint — reads the in-memory error ring populated by
 * instrumentation.ts and explicit try/catch wrappers in server actions.
 * Needed because Vercel runtime logs collapse/dedupe multi-line stderr,
 * making it impossible to see the full error chain for hash-external
 * failures. Delete after diagnosis.
 */
type ErrorRingEntry = unknown;

export async function GET() {
  const g = globalThis as unknown as { __backrowErrorRing?: ErrorRingEntry[] };
  const entries = g.__backrowErrorRing ?? [];
  return NextResponse.json({
    count: entries.length,
    entries: entries.slice().reverse(),
  });
}
