import { ImageResponse } from "next/og";
import { connection } from "next/server";
import { loadRighteous } from "@/lib/seo/og-fonts";

// Email clients (Gmail especially) strip @font-face rules, so we can't rely
// on Righteous loading inside a Supabase auth email. This route renders the
// BackRow wordmark as a PNG using the real Righteous font and serves it with
// aggressive caching so email client image proxies don't hit the function
// repeatedly.

const WIDTH = 600;
const HEIGHT = 160;
const PRIMARY = "#6B9B6B";

export async function GET() {
  // Opt out of prerender. With cacheComponents enabled, Next.js otherwise
  // tries to prerender this route at build time and bakes the result of a
  // self-fetch to backrow.tv — but the production deployment isn't live
  // during the build, so the fetch rejects mid-prerender and the failure
  // gets baked in. `await connection()` is the cacheComponents-compatible
  // way to mark the route as fully runtime-rendered.
  await connection();
  const righteous = await loadRighteous();

  const element = (
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        alignItems: "center",
        justifyContent: "flex-start",
        paddingLeft: 40,
        backgroundColor: "transparent",
      }}
    >
      <span
        style={{
          fontFamily: righteous ? "Righteous" : "sans-serif",
          color: PRIMARY,
          fontSize: 96,
          letterSpacing: 2,
          lineHeight: 1,
        }}
      >
        BackRow
      </span>
    </div>
  );

  return new ImageResponse(element, {
    width: WIDTH,
    height: HEIGHT,
    fonts: righteous
      ? [{ name: "Righteous", data: righteous, weight: 400, style: "normal" }]
      : undefined,
    headers: {
      // Short s-maxage so a bad bake recovers within an hour at the CDN edge.
      // No `immutable` — we may need to invalidate (e.g., font-load failure).
      "Cache-Control": "public, max-age=3600, s-maxage=3600",
    },
  });
}
