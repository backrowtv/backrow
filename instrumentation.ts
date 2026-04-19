/**
 * Next.js instrumentation.
 *
 * Server-side Sentry is intentionally NOT loaded here. @sentry/nextjs pulls
 * @opentelemetry/instrumentation → import-in-the-middle / require-in-the-middle,
 * which Turbopack hash-wraps in its externalRequire helper. The hash-suffixed
 * ids don't resolve at runtime on Vercel Functions, causing every request that
 * touches that chunk to throw "Failed to load external module …" and the
 * Suspense-never-resolves bug. Upstream: vercel/next.js#64022.
 *
 * Client-side Sentry (sentry.client.config.ts) is untouched — it continues to
 * capture browser errors including those bubbled up to error.tsx/global-error.tsx.
 * Server errors are still visible in Vercel runtime logs via the console.error
 * in onRequestError below.
 */

type CauseChainEntry = {
  message: string;
  name?: string;
  code?: string | number;
  stack?: string;
};

function extractCauseChain(err: unknown, depth = 0, max = 5): CauseChainEntry[] {
  if (depth >= max || err == null) return [];
  if (typeof err !== "object") return [{ message: String(err) }];
  const e = err as {
    message?: unknown;
    name?: unknown;
    code?: unknown;
    stack?: unknown;
    cause?: unknown;
  };
  const entry: CauseChainEntry = {
    message: typeof e.message === "string" ? e.message : String(e.message ?? ""),
    name: typeof e.name === "string" ? e.name : undefined,
    code: typeof e.code === "string" || typeof e.code === "number" ? e.code : undefined,
    stack: typeof e.stack === "string" ? e.stack : undefined,
  };
  return [entry, ...extractCauseChain(e.cause, depth + 1, max)];
}

type ErrorRingEntry = {
  ts: number;
  source: string;
  path?: string;
  method?: string;
  routerKind?: string;
  routePath?: string;
  chain: CauseChainEntry[];
};

function pushErrorRing(entry: ErrorRingEntry) {
  const g = globalThis as unknown as { __backrowErrorRing?: ErrorRingEntry[] };
  if (!g.__backrowErrorRing) g.__backrowErrorRing = [];
  g.__backrowErrorRing.push(entry);
  if (g.__backrowErrorRing.length > 50) g.__backrowErrorRing.shift();
}

export async function register() {
  // Log at boot so we can confirm instrumentation.ts is actually loaded on the
  // Vercel runtime (helps diagnose whether onRequestError below should fire).
  console.error("[backrow:register] runtime=", process.env.NEXT_RUNTIME);

  // Turbopack hash-externals are resolved via real stub packages installed
  // by scripts/install-hash-stubs.mjs BEFORE next build. No runtime hook
  // needed — node_modules/<pkg>-<hash>/ is a real directory that re-exports
  // the real <pkg>. See scripts/install-hash-stubs.mjs for details.

  // Top-level catch for unhandled rejections — these bypass onRequestError
  // when the error escapes a server-action or streaming render path.
  if (process.env.NEXT_RUNTIME === "nodejs" && typeof process !== "undefined") {
    process.on("unhandledRejection", (reason: unknown) => {
      try {
        const chain = extractCauseChain(reason);
        pushErrorRing({ ts: Date.now(), source: "unhandledRejection", chain });
        console.error("[backrow:unhandledRejection]", JSON.stringify({ chain }));
      } catch {
        // ignore
      }
    });
    process.on("uncaughtException", (err: unknown) => {
      try {
        const chain = extractCauseChain(err);
        pushErrorRing({ ts: Date.now(), source: "uncaughtException", chain });
        console.error("[backrow:uncaughtException]", JSON.stringify({ chain }));
      } catch {
        // ignore
      }
    });
  }
}

export const onRequestError = (err: unknown, request: unknown, errorContext: unknown) => {
  try {
    const chain = extractCauseChain(err);
    const path = (request as { path?: string } | undefined)?.path;
    const method = (request as { method?: string } | undefined)?.method;
    const routerKind = (errorContext as { routerKind?: string } | undefined)?.routerKind;
    const routePath = (errorContext as { routePath?: string } | undefined)?.routePath;
    pushErrorRing({
      ts: Date.now(),
      source: "onRequestError",
      path,
      method,
      routerKind,
      routePath,
      chain,
    });
    console.error(
      "[backrow:onRequestError]",
      JSON.stringify({ path, method, routerKind, routePath, chain })
    );
  } catch {
    // never let logging break the error pipeline
  }
};
