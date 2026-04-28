import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";

// Righteous WOFF2 is bundled at ./fonts/Righteous-Regular.woff2. We resolve
// the path via `import.meta.url` and read it with `fs.readFile` so we don't
// depend on HTTP at request time. Vercel preview deployments are protected
// by SSO, so server-to-server fetches from the function to its own origin
// fail — the file-system path approach sidesteps that entirely.
//
// Inclusion of the woff2 in the function bundle is enforced by
// `outputFileTracingIncludes` in next.config.ts.
//
// Previously this fetched from `fonts.gstatic.com` at request time, but
// Google rotated the URL hash and the fetch silently 404'd — every
// wordmark/OG image rendered as the sans-serif fallback. Hosting the font
// in-repo removes the dependency on Google's CDN URL stability.

const FONT_PATH = fileURLToPath(new URL("./fonts/Righteous-Regular.woff2", import.meta.url));

export async function loadRighteous(): Promise<ArrayBuffer | null> {
  try {
    const buffer = await readFile(FONT_PATH);
    // Return a fresh ArrayBuffer (Buffer is a Uint8Array view; ImageResponse
    // wants a standalone ArrayBuffer).
    return buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength);
  } catch (err) {
    console.error(`[og-fonts] readFile failed for ${FONT_PATH}:`, err);
    return null;
  }
}
