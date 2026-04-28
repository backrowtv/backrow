// Righteous WOFF2 is bundled in this repo at ./fonts/Righteous-Regular.woff2.
// Loading it via `new URL(..., import.meta.url)` lets Next.js include the
// asset in the function bundle and works in both Edge and Node runtimes.
//
// Previously this fetched from `fonts.gstatic.com` at request time, but Google
// rotated the URL hash and the fetch silently 404'd — every wordmark/OG image
// rendered as the sans-serif fallback. Bundling removes the dependency on
// Google's CDN URLs being stable forever.

const FONT_URL = new URL("./fonts/Righteous-Regular.woff2", import.meta.url);

export async function loadRighteous(): Promise<ArrayBuffer | null> {
  try {
    const response = await fetch(FONT_URL);
    if (!response.ok) {
      console.error(`[og-fonts] Failed to load Righteous: HTTP ${response.status}`);
      return null;
    }
    return await response.arrayBuffer();
  } catch (err) {
    console.error("[og-fonts] Failed to load Righteous:", err);
    return null;
  }
}
