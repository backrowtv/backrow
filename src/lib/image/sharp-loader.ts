/**
 * Lazy loader for `sharp`.
 *
 * Top-level `import sharp from "sharp"` pulls the package into every chunk
 * that statically imports (directly or transitively) the module doing the
 * import. On Vercel Functions, Turbopack hash-wraps `sharp` in its
 * `externalRequire` helper regardless of `serverExternalPackages`, so every
 * chunk containing a sharp import would throw "Failed to load external
 * module sharp-<hash>" at runtime. See vercel/next.js#64022.
 *
 * By routing all sharp access through a dynamic `await import("sharp")`,
 * sharp is loaded on first call rather than at chunk-eval time — no other
 * code path pulls the hash-wrapped external.
 */

import type Sharp from "sharp";

let cached: typeof Sharp | null = null;

export async function getSharp(): Promise<typeof Sharp> {
  if (cached) return cached;
  const mod = await import("sharp");
  cached = (mod.default ?? mod) as typeof Sharp;
  return cached;
}
