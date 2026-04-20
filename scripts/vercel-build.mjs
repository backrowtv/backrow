#!/usr/bin/env node
/**
 * Thin wrapper around `next build --webpack`.
 *
 * We use webpack instead of Turbopack because Next.js 16 Turbopack has a
 * known regression in server-action dispatch on Vercel Functions — specific
 * action IDs return 500 even when the action module loads and the function
 * is exported. Webpack is Next's official workaround until
 * vercel/next.js#87737 ships a fix.
 *
 * Historical note: earlier revisions ran scripts/install-hash-stubs.mjs
 * before the build and scripts/patch-turbopack-hash-externals.mjs after.
 * Both were Turbopack-specific workarounds for hash-suffixed externalRequire
 * thunks (sharp-<hex16> etc.). Webpack doesn't emit those, so neither
 * script is needed and both have been removed. Revert this wrapper to plain
 * `next build` once 16.3+ fixes the upstream bug.
 */
import { spawn } from "node:child_process";

function run(cmd, args) {
  return new Promise((resolve) => {
    const child = spawn(cmd, args, { stdio: "inherit" });
    child.on("close", (code) => resolve(code ?? 0));
  });
}

const buildExit = await run("next", ["build", "--webpack"]);
console.log(`[vercel-build] next build --webpack exited with ${buildExit}`);
process.exit(buildExit);
