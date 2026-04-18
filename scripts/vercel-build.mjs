#!/usr/bin/env node
/**
 * Wrapper around `next build` that guarantees the Turbopack hash-external
 * patcher runs even when next build's exit code is non-zero.
 *
 * Why: `next build` may exit non-zero from prerender HANGING_PROMISE_REJECTION
 * stderr spam (a separate AuthFetcher/cookies() bug). Using
 * `next build && node scripts/...` in package.json#build short-circuits in that
 * case, so the post-build chunk patch never runs and the deployed lambda keeps
 * hash-wrapped `require("<pkg>-<hash>")` thunks that fail at runtime.
 *
 * This wrapper:
 *   1. Runs `next build`, remembers its exit code.
 *   2. Runs the patcher unconditionally if .next/server/ exists.
 *   3. Propagates next build's original exit code so real build failures
 *      still surface to Vercel/CI.
 */
import { spawn } from "node:child_process";
import { existsSync } from "node:fs";

function run(cmd, args) {
  return new Promise((resolve) => {
    const child = spawn(cmd, args, { stdio: "inherit" });
    child.on("close", (code) => resolve(code ?? 0));
  });
}

const buildExit = await run("next", ["build"]);
console.log(`[vercel-build] next build exited with ${buildExit}`);

if (existsSync(".next/server")) {
  const patchExit = await run("node", ["scripts/patch-turbopack-hash-externals.mjs"]);
  console.log(`[vercel-build] patch exited with ${patchExit}`);
  if (patchExit !== 0) {
    console.error("[vercel-build] patch failed — failing build");
    process.exit(patchExit);
  }
} else {
  console.log("[vercel-build] .next/server missing — nothing to patch");
}

process.exit(buildExit);
