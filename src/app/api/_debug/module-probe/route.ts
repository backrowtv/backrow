import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const SUSPECTS = [
  "import-in-the-middle",
  "require-in-the-middle",
  "jsdom",
  "sharp",
  "isomorphic-dompurify",
  "@sentry/node",
  "@sentry/nextjs",
  "@opentelemetry/instrumentation",
];

type ErrorDescription = {
  name?: string;
  message: string;
  code?: unknown;
  stack?: string;
  causeChain: unknown[];
};
type ProbeResult =
  | { id: string; ok: true; keys: string[] }
  | { id: string; ok: false; error: ErrorDescription };

function describeError(err: unknown): ErrorDescription {
  const chain: unknown[] = [];
  let cur: unknown = err;
  for (let i = 0; i < 5 && cur && typeof cur === "object"; i++) {
    const c = cur as { message?: unknown; name?: unknown; code?: unknown; cause?: unknown };
    chain.push({ message: c.message, name: c.name, code: c.code });
    cur = c.cause;
  }
  const e = err as { name?: string; message?: string; code?: unknown; stack?: string };
  return {
    name: e?.name,
    message: typeof e?.message === "string" ? e.message : String(err),
    code: e?.code,
    stack: typeof e?.stack === "string" ? e.stack.split("\n").slice(0, 15).join("\n") : undefined,
    causeChain: chain,
  };
}

export async function GET() {
  if (process.env.ENABLE_DEBUG_PROBES !== "1") {
    return NextResponse.json({ error: "disabled" }, { status: 404 });
  }

  const results: ProbeResult[] = [];

  for (const id of SUSPECTS) {
    try {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const mod = require(id) as Record<string, unknown>;
      results.push({ id, ok: true, keys: Object.keys(mod ?? {}).slice(0, 10) });
    } catch (err) {
      results.push({ id, ok: false, error: describeError(err) });
    }
  }

  try {
    const sanitize = await import("@/lib/security/sanitize");
    results.push({
      id: "@/lib/security/sanitize",
      ok: true,
      keys: Object.keys(sanitize).slice(0, 10),
    });
  } catch (err) {
    results.push({ id: "@/lib/security/sanitize", ok: false, error: describeError(err) });
  }

  return NextResponse.json({
    node: process.version,
    runtime: process.env.NEXT_RUNTIME,
    results,
  });
}
