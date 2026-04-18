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

const CHUNKS_DIR = ".next/server/chunks";

// Packages Turbopack hash-wraps that we know don't exist as `<pkg>-<hash>`
// in node_modules. Extend as new bugs surface.
const NATIVE_EXTERNALS = ["sharp"];

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
  let patched = original;
  const hits = [];
  for (const pkg of NATIVE_EXTERNALS) {
    const re = new RegExp(`${pkg}-[0-9a-f]{16}`, "g");
    const matches = original.match(re);
    if (!matches) continue;
    patched = patched.replace(re, pkg);
    hits.push(`${pkg}×${matches.length}`);
  }
  if (patched !== original) {
    await writeFile(file, patched, "utf8");
    return hits;
  }
  return null;
}

async function main() {
  const files = await collectChunkFiles(CHUNKS_DIR);
  let patchedCount = 0;
  for (const file of files) {
    const hits = await patchFile(file);
    if (hits) {
      console.log(`  patched ${file.replace(CHUNKS_DIR + "/", "")}: ${hits.join(", ")}`);
      patchedCount++;
    }
  }
  console.log(
    patchedCount === 0
      ? "[patch-turbopack-hash-externals] no chunks needed patching"
      : `[patch-turbopack-hash-externals] patched ${patchedCount} chunk(s)`
  );
}

main().catch((err) => {
  console.error("[patch-turbopack-hash-externals] failed:", err);
  process.exit(1);
});
