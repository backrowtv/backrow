export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    await import("./sentry.server.config");
  }

  if (process.env.NEXT_RUNTIME === "edge") {
    await import("./sentry.edge.config");
  }
}

type CauseChainEntry = {
  message: string;
  name?: string;
  code?: string | number;
  stack?: string;
};

function extractCauseChain(err: unknown, depth = 0, max = 5): CauseChainEntry[] {
  if (depth >= max || err == null) return [];
  if (typeof err !== "object") {
    return [{ message: String(err) }];
  }
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

export const onRequestError = async (
  ...args: Parameters<typeof import("@sentry/nextjs").captureRequestError>
) => {
  const [err, request, errorContext] = args;
  try {
    const chain = extractCauseChain(err);
    console.error(
      "[backrow:onRequestError]",
      JSON.stringify({
        path: (request as { path?: string } | undefined)?.path,
        method: (request as { method?: string } | undefined)?.method,
        routerKind: (errorContext as { routerKind?: string } | undefined)?.routerKind,
        routePath: (errorContext as { routePath?: string } | undefined)?.routePath,
        chain,
      })
    );
  } catch {
    // never let logging break the error pipeline
  }
  const { captureRequestError } = await import("@sentry/nextjs");
  return captureRequestError(...args);
};
