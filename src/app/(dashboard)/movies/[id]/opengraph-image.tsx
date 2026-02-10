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
export const alt = "BackRow Movie";

function posterUrl(raw: string | null | undefined): string | null {
  if (!raw) return null;
  if (raw.startsWith("http")) return raw;
  return `https://image.tmdb.org/t/p/w500${raw.startsWith("/") ? "" : "/"}${raw}`;
}

export default async function MovieOpenGraphImage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = createPublicClient();

  const asNum = Number(id);
  const isNumeric = Number.isFinite(asNum) && asNum > 0;
  const query = supabase
    .from("movies")
    .select("title, year, director, poster_url, genres, tagline");
  const { data: movie } = isNumeric
    ? await query.eq("tmdb_id", asNum).maybeSingle()
    : await query.eq("slug", id).maybeSingle();

  const title = movie?.title ?? "Movie";
  const year = movie?.year ?? null;
  const director = movie?.director ?? null;
  const poster = posterUrl(movie?.poster_url);
  const genres = (movie?.genres ?? []).slice(0, 3).join(" · ");

  return renderOg(
    <OgShell accentColor={BRAND_PRIMARY}>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
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
          MOVIE
        </div>
      </div>

      <div
        style={{
          flex: 1,
          display: "flex",
          alignItems: "center",
          gap: 48,
          marginTop: 24,
        }}
      >
        <PosterThumb src={poster} width={220} />

        <div style={{ display: "flex", flexDirection: "column", flex: 1, gap: 16 }}>
          <div
            style={{
              display: "flex",
              color: "#ffffff",
              fontSize: 62,
              fontFamily: "Righteous",
              letterSpacing: "-0.01em",
              lineHeight: 1.05,
              textShadow: "0 2px 6px rgba(0,0,0,0.6)",
            }}
          >
            {title}
          </div>
          {year && <div style={{ display: "flex", color: BRAND_MUTED, fontSize: 30 }}>{year}</div>}
          {director && (
            <div
              style={{
                display: "flex",
                color: BRAND_MUTED,
                fontSize: 24,
                marginTop: 4,
              }}
            >
              Directed by {director}
            </div>
          )}
          {genres && (
            <div style={{ display: "flex", color: "#6f7b70", fontSize: 22 }}>{genres}</div>
          )}
        </div>
      </div>

      <div style={{ display: "flex", justifyContent: "flex-end" }}>
        <BrandWordmark size="sm" />
      </div>
    </OgShell>
  );
}
