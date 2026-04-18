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

  // Runtime chunk patch. Vercel's @vercel/next adapter packages .next/server/
  // into the lambda AFTER `bun run build` exits, so our post-build patch
  // (scripts/patch-turbopack-hash-externals.mjs) never touches the deployed
  // copy. Patch here instead, at cold-start — before any route hits the
  // broken externalRequire thunks. Chunks are loaded lazily per-route, so
  // rewriting them on disk before the first request works: the first
  // `require("<pkg>-<hash>")` call now reads the patched `require("<pkg>")`.
  //
  // Upstream Turbopack bug: vercel/next.js#64022.
  if (process.env.NEXT_RUNTIME === "nodejs") {
    try {
      const { readFileSync, writeFileSync, readdirSync } = await import("node:fs");
      const { join } = await import("node:path");
      const HASH_RE = /([@a-zA-Z0-9_/.-]+)-([0-9a-f]{16})(?=["`'])/g;

      const walk = (dir: string, acc: string[] = []): string[] => {
        let entries: import("node:fs").Dirent[];
        try {
          entries = readdirSync(dir, { withFileTypes: true });
        } catch {
          return acc;
        }
        for (const e of entries) {
          const full = join(dir, e.name);
          if (e.isDirectory()) walk(full, acc);
          else if (e.isFile() && e.name.endsWith(".js")) acc.push(full);
        }
        return acc;
      };

      const start = Date.now();
      const files = walk(".next/server");
      let patched = 0;
      const touched: string[] = [];
      for (const file of files) {
        try {
          const content = readFileSync(file, "utf8");
          if (!HASH_RE.test(content)) {
            HASH_RE.lastIndex = 0;
            continue;
          }
          HASH_RE.lastIndex = 0;
          const next = content.replace(HASH_RE, (_m, pkg) => pkg);
          if (next !== content) {
            writeFileSync(file, next, "utf8");
            patched++;
            touched.push(file);
          }
        } catch {
          // read-only filesystem or transient — continue
        }
      }
      console.log(
        `[backrow:runtime-patch] scanned=${files.length} patched=${patched} ms=${Date.now() - start} files=${touched.join("|")}`
      );
    } catch (err) {
      const e = err as { code?: string; message?: string };
      console.error(`[backrow:runtime-patch] failed ${e?.code} ${e?.message}`);
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
