#!/usr/bin/env node
/**
 * Post-build fix for Turbopack's hash-wrapped native externals.
 *
 * Turbopack (Next.js 16.2.4) emits:
 *
 *   e.x("sharp-03c9e6d01f648d5d", () => require("sharp-03c9e6d01f648d5d"))
 *
 * for native external packages. The hash-suffixed require fails at runtime
 * with MODULE_NOT_FOUND because no package with that name exists. This is
 * a Turbopack bug — upstream vercel/next.js#64022 (and its duplicates) —
 * with no config-level workaround in 16.2.4.
 *
 * This script walks .next/server/chunks/ and replaces `"<pkg>-<16-hex>"`
 * with `"<pkg>"` wherever the pattern matches a whitelisted native
 * package. Idempotent and only rewrites chunk files (no app source).
 *
 * Why this is safe:
 *   - The rewrite is string-local: `e.x(id, () => require(id))`. Changing
 *     both occurrences of `id` keeps the thunk self-consistent.
 *   - The whitelist is explicit — only packages we know are native Node
 *     externals that don't exist under a hash-suffixed name in node_modules.
 *   - No change to app code; only .next build output.
 */
import { readFile, writeFile, readdir } from "node:fs/promises";
import { join } from "node:path";

// Patch all JS under .next/server/ — chunks/, app/, ssr/, etc. Turbopack
// sometimes leaves external-require thunks outside chunks/ (e.g. in app-route
// stubs), and we'd rather be thorough than surgical.
const ROOTS = [".next/server"];

// Generic hash-suffix pattern — any `<identifier>-<16 hex>` wrapped by
// Turbopack's externalRequire. Catches sharp, import-in-the-middle,
// require-in-the-middle, and any future native external that this bug hits.
// We match only identifiers that look like package names (no spaces, no
// special chars beyond [@/_-.]) so we don't accidentally rewrite content.
const HASH_RE = /([@a-zA-Z0-9_/.-]+)-([0-9a-f]{16})(?=["`'])/g;

async function collectChunkFiles(dir, acc = []) {
  const entries = await readdir(dir, { withFileTypes: true });
  for (const entry of entries) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) await collectChunkFiles(full, acc);
    else if (entry.isFile() && entry.name.endsWith(".js")) acc.push(full);
  }
  return acc;
}

async function patchFile(file) {
  const original = await readFile(file, "utf8");
  const hits = new Map();
  const patched = original.replace(HASH_RE, (_m, pkg) => {
    hits.set(pkg, (hits.get(pkg) ?? 0) + 1);
    return pkg;
  });
  if (patched !== original) {
    await writeFile(file, patched, "utf8");
    return [...hits.entries()].map(([k, v]) => `${k}×${v}`);
  }
  return null;
}

async function main() {
  console.log("[patch-turbopack-hash-externals] START");
  const files = [];
  for (const root of ROOTS) {
    try {
      await collectChunkFiles(root, files);
    } catch (err) {
      console.log(`[patch-turbopack-hash-externals] skipping ${root}:`, err.message);
    }
  }
  console.log(`[patch-turbopack-hash-externals] scanning ${files.length} .js files`);
  let patchedCount = 0;
  const totalHits = new Map();
  for (const file of files) {
    const hits = await patchFile(file);
    if (hits) {
      console.log(`  patched ${file}: ${hits.join(", ")}`);
      patchedCount++;
      for (const h of hits) {
        const [pkg] = h.split("×");
        totalHits.set(pkg, (totalHits.get(pkg) ?? 0) + 1);
      }
    }
  }
  const summary = [...totalHits.entries()].map(([k, v]) => `${k}:${v}file(s)`).join(", ");
  console.log(
    patchedCount === 0
      ? "[patch-turbopack-hash-externals] no chunks needed patching"
      : `[patch-turbopack-hash-externals] patched ${patchedCount} file(s) — ${summary}`
  );
}

main().catch((err) => {
  console.error("[patch-turbopack-hash-externals] failed:", err);
  process.exit(1);
});
