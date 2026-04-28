import { RIGHTEOUS_WOFF2_BASE64 } from "./righteous-base64";

// Righteous WOFF2 is inlined as base64 in `righteous-base64.ts` and decoded
// here. We tried fetching it from Google's CDN (URL rotated → 404),
// bundling it via `import.meta.url` (bundler tracing was inconsistent),
// fetching `https://backrow.tv/fonts/...` (build-time prerender baked a
// 500), and fs.readFile (URL class identity mismatch). Inlining is the
// only approach that works on every runtime, in build, in preview, and
// in production without ceremony. ~16KB cost.

let cachedBuffer: ArrayBuffer | null = null;

export async function loadRighteous(): Promise<ArrayBuffer | null> {
  if (cachedBuffer) return cachedBuffer;
  try {
    const binary = atob(RIGHTEOUS_WOFF2_BASE64);
    const buffer = new ArrayBuffer(binary.length);
    const view = new Uint8Array(buffer);
    for (let i = 0; i < binary.length; i++) view[i] = binary.charCodeAt(i);
    cachedBuffer = buffer;
    return buffer;
  } catch (err) {
    console.error("[og-fonts] Failed to decode inlined Righteous:", err);
    return null;
  }
}
