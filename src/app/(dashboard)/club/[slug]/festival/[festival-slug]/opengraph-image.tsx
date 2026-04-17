import { createPublicClient } from "@/lib/supabase/server";
import {
  BrandLockup,
  BrandWordmark,
  BRAND_MUTED,
  BRAND_PRIMARY,
  OgShell,
  OG_CONTENT_TYPE,
  OG_SIZE,
  renderOg,
} from "@/lib/seo/og-template";

export const size = OG_SIZE;
export const contentType = OG_CONTENT_TYPE;
export const alt = "BackRow Festival";

function formatDate(iso: string | null | undefined): string | null {
  if (!iso) return null;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

export default async function FestivalOpenGraphImage({
  params,
}: {
  params: Promise<{ slug: string; "festival-slug": string }>;
}) {
  const { slug, "festival-slug": festivalSlug } = await params;
  const supabase = createPublicClient();

  const { data: club } = await supabase
    .from("clubs")
    .select("id, name, theme_color")
    .eq("slug", slug)
    .eq("archived", false)
    .maybeSingle();

  let festival: {
    theme: string | null;
    start_date: string | null;
    results_date: string | null;
    status: string | null;
  } | null = null;

  if (club) {
    const { data } = await supabase
      .from("festivals")
      .select("theme, start_date, results_date, status")
      .eq("club_id", club.id)
      .eq("slug", festivalSlug)
      .is("deleted_at", null)
      .maybeSingle();
    festival = data;
  }

  const clubName = club?.name ?? "Movie Club";
  const accent = club?.theme_color ?? BRAND_PRIMARY;
  const theme = festival?.theme ?? "Festival";
  const dateLine =
    formatDate(festival?.start_date) && formatDate(festival?.results_date)
      ? `${formatDate(festival?.start_date)} → ${formatDate(festival?.results_date)}`
      : formatDate(festival?.start_date);

  return renderOg(
    <OgShell accentColor={accent}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <BrandLockup size="sm" />
        <div
          style={{
            display: "flex",
            color: accent,
            fontSize: 22,
            fontFamily: "Righteous",
            letterSpacing: "0.08em",
          }}
        >
          FESTIVAL
        </div>
      </div>

      <div
        style={{
          flex: 1,
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          gap: 20,
        }}
      >
        <div
          style={{
            display: "flex",
            color: BRAND_MUTED,
            fontSize: 28,
            fontFamily: "Righteous",
            letterSpacing: "0.05em",
            textTransform: "uppercase",
          }}
        >
          {clubName}
        </div>
        <div
          style={{
            display: "flex",
            color: "#ffffff",
            fontSize: 72,
            fontFamily: "Righteous",
            letterSpacing: "-0.01em",
            lineHeight: 1.05,
            textShadow: "0 2px 6px rgba(0,0,0,0.6)",
            maxWidth: 1000,
          }}
        >
          {theme}
        </div>
        {dateLine && (
          <div
            style={{
              display: "flex",
              color: BRAND_MUTED,
              fontSize: 26,
            }}
          >
            {dateLine}
          </div>
        )}
      </div>

      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "flex-end",
        }}
      >
        <BrandWordmark size="sm" />
      </div>
    </OgShell>
  );
}
