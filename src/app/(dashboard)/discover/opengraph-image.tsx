import { createPublicClient } from "@/lib/supabase/server";
import {
  BrandLockup,
  BrandWordmark,
  BRAND_MUTED,
  BRAND_PRIMARY,
  OgShell,
  OG_CONTENT_TYPE,
  OG_SIZE,
  PosterThumb,
  renderOg,
} from "@/lib/seo/og-template";

export const size = OG_SIZE;
export const contentType = OG_CONTENT_TYPE;
export const alt = "Discover Movie Clubs on BackRow";

function toTmdbPoster(raw: string | null | undefined): string | null {
  if (!raw) return null;
  if (raw.startsWith("http")) return raw;
  return `https://image.tmdb.org/t/p/w500${raw.startsWith("/") ? "" : "/"}${raw}`;
}

export default async function DiscoverOpenGraphImage() {
  const supabase = createPublicClient();

  // Pull a few recent engaged movies for the decorative strip.
  const { data: movies } = await supabase
    .from("movies")
    .select("poster_url")
    .not("poster_url", "is", null)
    .order("cached_at", { ascending: false })
    .limit(5);

  const posters = (movies ?? [])
    .map((m) => toTmdbPoster(m.poster_url))
    .filter((x): x is string => Boolean(x))
    .slice(0, 4);

  return renderOg(
    <OgShell accentColor={BRAND_PRIMARY}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <BrandLockup size="sm" />
        <div
          style={{
            display: "flex",
            color: BRAND_MUTED,
            fontSize: 22,
            fontFamily: "Righteous",
            letterSpacing: "0.08em",
          }}
        >
          DISCOVER
        </div>
      </div>

      <div
        style={{
          flex: 1,
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          gap: 28,
        }}
      >
        <div
          style={{
            display: "flex",
            color: "#ffffff",
            fontSize: 72,
            fontFamily: "Righteous",
            letterSpacing: "-0.01em",
            lineHeight: 1.05,
            textShadow: "0 2px 6px rgba(0,0,0,0.6)",
          }}
        >
          Discover Movie Clubs
        </div>
        <div style={{ display: "flex", color: BRAND_MUTED, fontSize: 28 }}>
          Browse public clubs and active film festivals on BackRow.
        </div>

        {posters.length > 0 && (
          <div style={{ display: "flex", gap: 16, marginTop: 8 }}>
            {posters.map((src, i) => (
              <PosterThumb key={i} src={src} width={120} />
            ))}
          </div>
        )}
      </div>

      <div style={{ display: "flex", justifyContent: "flex-end" }}>
        <BrandWordmark size="sm" />
      </div>
    </OgShell>
  );
}
