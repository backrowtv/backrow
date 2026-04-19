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
  // Log at boot so we can confirm instrumentation.ts is actually loaded on the
  // Vercel runtime (helps diagnose whether onRequestError below should fire).
  console.log("[backrow:register] runtime=", process.env.NEXT_RUNTIME);

  // Turbopack hash-external workaround. Turbopack (Next 16.2.4) emits calls
  // like `require("sharp-20c6a5da84e2135f")` wrapped in its externalRequire
  // helper. The hash-suffixed id has no corresponding package in node_modules
  // so the require throws MODULE_NOT_FOUND. Upstream: vercel/next.js#64022.
  //
  // Chunks cannot be patched on disk because Vercel's @vercel/next adapter
  // packages /vercel/output/ after our build script finishes, and the
  // deployed lambda rootfs is read-only.
  //
  // Fix: install a Node module resolver hook so require("<pkg>-<hash>")
  // resolves the real <pkg>. Only strips hashes for packages we know
  // Turbopack hash-wraps; any other `<pkg>-<hash>` name still goes through
  // normal resolution untouched.
  if (process.env.NEXT_RUNTIME === "nodejs") {
    try {
      const Module = (await import("node:module")).default as unknown as {
        _resolveFilename: (request: string, parent: unknown, ...rest: unknown[]) => string;
      };
      const KNOWN_EXTERNALS = ["sharp", "jsdom", "import-in-the-middle", "require-in-the-middle"];
      const HASHED = new RegExp(`^(${KNOWN_EXTERNALS.join("|")})-[0-9a-f]{16}$`);
      const original = Module._resolveFilename;
      Module._resolveFilename = function (request: string, parent: unknown, ...rest: unknown[]) {
        const m = HASHED.exec(request);
        if (m) {
          return original.call(this, m[1], parent, ...rest);
        }
        return original.call(this, request, parent, ...rest);
      };
      console.error("[backrow:resolve] installed Module._resolveFilename hook");
    } catch (err) {
      const e = err as { code?: string; message?: string };
      console.error(`[backrow:resolve] install failed ${e?.code} ${e?.message}`);
    }
  }

  // Top-level catch for unhandled rejections — these bypass onRequestError
  // when the error escapes a server-action or streaming render path.
  if (process.env.NEXT_RUNTIME === "nodejs" && typeof process !== "undefined") {
    process.on("unhandledRejection", (reason: unknown) => {
      try {
        console.error(
          "[backrow:unhandledRejection]",
          JSON.stringify({ chain: extractCauseChain(reason) })
        );
      } catch {
        // ignore
      }
    });
    process.on("uncaughtException", (err: unknown) => {
      try {
        console.error(
          "[backrow:uncaughtException]",
          JSON.stringify({ chain: extractCauseChain(err) })
        );
      } catch {
        // ignore
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
