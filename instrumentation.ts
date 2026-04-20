/**
 * Next.js instrumentation.
 *
 * Logs server-side errors to stderr via onRequestError + process-level
 * unhandledRejection / uncaughtException handlers. @sentry/nextjs is
 * intentionally not loaded server-side — its transitive OpenTelemetry
 * chain (import-in-the-middle / require-in-the-middle) was being traced
 * into the server bundle by Turbopack and produced hash-suffixed
 * externalRequire ids that failed at runtime on Vercel Functions. The
 * project now uses webpack and @sentry/browser client-only. Upstream:
 * vercel/next.js#87737.
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
  if (process.env.NEXT_RUNTIME === "nodejs" && typeof process !== "undefined") {
    process.on("unhandledRejection", (reason: unknown) => {
      try {
        console.error(
          "[backrow:unhandledRejection]",
          JSON.stringify({ chain: extractCauseChain(reason) })
        );
      } catch {
        // never let logging break the error pipeline
      }
    });
    process.on("uncaughtException", (err: unknown) => {
      try {
        console.error(
          "[backrow:uncaughtException]",
          JSON.stringify({ chain: extractCauseChain(err) })
        );
      } catch {
        // never let logging break the error pipeline
      }
    });
  }
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
