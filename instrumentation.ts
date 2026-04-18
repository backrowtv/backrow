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

export async function register() {
  // Intentionally empty. See header.
}

export const onRequestError = (err: unknown, request: unknown, errorContext: unknown) => {
  try {
    console.error(
      "[backrow:onRequestError]",
      JSON.stringify({
        path: (request as { path?: string } | undefined)?.path,
        method: (request as { method?: string } | undefined)?.method,
        routerKind: (errorContext as { routerKind?: string } | undefined)?.routerKind,
        routePath: (errorContext as { routePath?: string } | undefined)?.routePath,
        chain: extractCauseChain(err),
      })
    );
  } catch {
    // never let logging break the error pipeline
  }
};
