import { ImageResponse } from "next/og";
import { loadRighteous } from "@/lib/seo/og-fonts";

// Renders the BackRow wordmark as a PNG using the real Righteous font.
// Emails reference the static /wordmark.png directly (faster, no function
// invocation), so this route is now used only for ad-hoc consumers.

const WIDTH = 600;
const HEIGHT = 160;
const PRIMARY = "#6B9B6B";

export async function GET() {
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
