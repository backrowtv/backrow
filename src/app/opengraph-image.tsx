import {
  BrandLockup,
  BRAND_MUTED,
  BRAND_PRIMARY,
  OgShell,
  OG_CONTENT_TYPE,
  OG_SIZE,
  renderOg,
} from "@/lib/seo/og-template";

export const size = OG_SIZE;
export const contentType = OG_CONTENT_TYPE;
export const alt = "BackRow — Movie Clubs";

export default async function OpenGraphImage() {
  return renderOg(
    <OgShell accentColor={BRAND_PRIMARY}>
      <div
        style={{
          flex: 1,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: 28,
        }}
      >
        <BrandLockup size="lg" />
        <div
          style={{
            display: "flex",
            color: BRAND_MUTED,
            fontSize: 30,
            fontFamily: "Righteous",
            textAlign: "center",
          }}
        >
          The best view is from the BackRow
        </div>
        <div
          style={{
            display: "flex",
            color: "#6f7b70",
            fontSize: 22,
            marginTop: 8,
          }}
        >
          Movie clubs · Themed festivals · Community ratings
        </div>
      </div>
    </OgShell>
  );
}
