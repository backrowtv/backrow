// Righteous WOFF2 lives in /public/fonts/ on production. We fetch it from
// production by absolute URL so this works identically in production and in
// every Vercel preview deployment (preview deployments are SSO-protected,
// so server-to-server fetches to the *preview's own* origin fail — fetching
// from the public production origin sidesteps that entirely).
//
// Trade-off: a preview branch that introduces a NEW font version won't
// render that new version until the change reaches production. For now we
// only have one Righteous variant, so this is fine.
//
// Previously this fetched from `fonts.gstatic.com`, but Google rotated the
// URL hash and the fetch silently 404'd — every wordmark/OG image rendered
// as the sans-serif fallback. Hosting in-repo removes that dependency.

const FONT_URL = "https://backrow.tv/fonts/Righteous-Regular.woff2";

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
