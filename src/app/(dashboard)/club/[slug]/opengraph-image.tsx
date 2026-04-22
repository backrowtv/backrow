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
export const alt = "BackRow Club";

export default async function ClubOpenGraphImage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const supabase = createPublicClient();

  const { data: club } = await supabase
    .from("clubs")
    .select("id, name, description, theme_color")
    .eq("slug", slug)
    .eq("archived", false)
    .maybeSingle();

  let memberCount = 0;
  if (club) {
    const { count } = await supabase
      .from("club_members")
      .select("user_id", { count: "exact", head: true })
      .eq("club_id", club.id);
    memberCount = count ?? 0;
  }

  const clubName = club?.name ?? "Movie Club";
  const description = club?.description ?? "A BackRow movie club";
  const accent = club?.theme_color ?? BRAND_PRIMARY;

  return renderOg(
    <OgShell accentColor={accent}>
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
          MOVIE CLUB
        </div>
      </div>

      <div
        style={{
          flex: 1,
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          gap: 24,
        }}
      >
        <div
          style={{
            display: "flex",
            color: "#ffffff",
            fontSize: 76,
            fontFamily: "Righteous",
            letterSpacing: "-0.01em",
            lineHeight: 1.05,
            textShadow: "0 2px 6px rgba(0,0,0,0.6)",
          }}
        >
          {clubName}
        </div>
        {description && (
          <div
            style={{
              display: "flex",
              color: BRAND_MUTED,
              fontSize: 28,
              lineHeight: 1.3,
              maxWidth: 900,
            }}
          >
            {description.length > 140 ? `${description.slice(0, 140)}…` : description}
          </div>
        )}
      </div>

      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          color: accent,
          fontSize: 24,
          fontFamily: "Righteous",
        }}
      >
        <div style={{ display: "flex" }}>
          {memberCount} {memberCount === 1 ? "member" : "members"}
        </div>
        <BrandWordmark size="sm" />
      </div>
    </OgShell>
  );
}
