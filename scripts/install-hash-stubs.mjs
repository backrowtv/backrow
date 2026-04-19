#!/usr/bin/env node
/**
 * Create stub packages in node_modules/ for Turbopack's hash-suffixed
 * external names. Turbopack (Next 16.2.4) emits `require("<pkg>-<16-hex>")`
 * thunks for native externals — the hash-suffixed name has no package in
 * node_modules so the require throws MODULE_NOT_FOUND. Upstream bug:
 * vercel/next.js#64022.
 *
 * This script installs real directory stubs that Node can resolve. Each
 * stub has a package.json + index.js that re-exports the real package.
 *
 * Must run BEFORE `next build` so @vercel/nft traces the stubs and includes
 * them in the lambda bundle. See scripts/vercel-build.mjs.
 *
 * Hashes are platform-dependent (Linux vs macOS). List every hash we've
 * ever observed — extras are cheap, missing ones are fatal.
 */
import { mkdirSync, writeFileSync, existsSync } from "node:fs";
import { join } from "node:path";

// Hashes observed on Vercel Linux (prod) + local macOS (dev).
// When a new hash appears in runtime errors, add it here.
const STUBS = {
  sharp: ["20c6a5da84e2135f", "03c9e6d01f648d5d"],
  jsdom: ["5c8b869800590804", "4cccfac9827ebcfe"],
  "import-in-the-middle": ["ac114f323ad7e863", "fb77e65c6e343162", "b96cfec811360091"],
  "require-in-the-middle": ["2ca7b9c2766f317e"],
};

const root = "node_modules";
if (!existsSync(root)) {
  console.error(`[install-hash-stubs] ${root}/ missing — run after bun install`);
  process.exit(1);
}

let created = 0;
for (const [pkg, hashes] of Object.entries(STUBS)) {
  for (const hash of hashes) {
    const name = `${pkg}-${hash}`;
    const dir = join(root, name);
    mkdirSync(dir, { recursive: true });
    writeFileSync(
      join(dir, "package.json"),
      JSON.stringify({ name, version: "0.0.0", main: "index.js" }, null, 2) + "\n"
    );
    writeFileSync(join(dir, "index.js"), `module.exports = require(${JSON.stringify(pkg)});\n`);
    created++;
  }
}
console.log(`[install-hash-stubs] created ${created} stub package(s) under ${root}/`);
