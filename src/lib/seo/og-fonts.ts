// Righteous WOFF2 lives in /public/fonts/ so Vercel serves it as a static
// asset on the same origin as the function. We fetch it from there at request
// time. Both this approach and `new URL(..., import.meta.url)` are documented
// patterns for `next/og` ImageResponse, but in practice the static-asset
// fetch is more reliable — the bundler doesn't always trace files referenced
// by `new URL`, and we hit that case (preview deployment kept rendering the
// sans-serif fallback).
//
// Previously this fetched from `fonts.gstatic.com` at request time, but Google
// rotated the URL hash and the fetch silently 404'd — every wordmark/OG image
// rendered as the sans-serif fallback. Hosting it on our own origin removes
// the dependency on Google's CDN URLs being stable forever.

const FONT_PATH = "/fonts/Righteous-Regular.woff2";

function fontUrl(): string {
  if (process.env.VERCEL_URL) return `https://${process.env.VERCEL_URL}${FONT_PATH}`;
  if (process.env.NEXT_PUBLIC_SITE_URL) return `${process.env.NEXT_PUBLIC_SITE_URL}${FONT_PATH}`;
  return `http://localhost:3000${FONT_PATH}`;
}

export async function loadRighteous(): Promise<ArrayBuffer | null> {
  const url = fontUrl();
  try {
    const response = await fetch(url);
    if (!response.ok) {
      console.error(`[og-fonts] Failed to load Righteous from ${url}: HTTP ${response.status}`);
      return null;
    }
    return await response.arrayBuffer();
  } catch (err) {
    console.error(`[og-fonts] Failed to load Righteous from ${url}:`, err);
    return null;
  }
}
