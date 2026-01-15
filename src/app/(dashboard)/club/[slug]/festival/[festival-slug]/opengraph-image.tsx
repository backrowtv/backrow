import { ImageResponse } from "next/og";
import { createClient } from "@/lib/supabase/server";

export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
export const alt = "BackRow Festival";

export default async function FestivalOGImage({
  params,
}: {
  params: Promise<{ slug: string; "festival-slug": string }>;
}) {
  const { slug, "festival-slug": festivalSlug } = await params;
  const supabase = await createClient();

  // Resolve club
  const { data: club } = await supabase
    .from("clubs")
    .select("id, name, theme_color")
    .eq("slug", slug)
    .eq("archived", false)
    .maybeSingle();

  if (!club) {
    return new ImageResponse(
      <div
        style={{
          display: "flex",
          background: "#0a0a0a",
          width: "100%",
          height: "100%",
          alignItems: "center",
          justifyContent: "center",
          color: "#fff",
          fontSize: 40,
        }}
      >
        BackRow
      </div>,
      size
    );
  }

  // Fetch festival data
  const { data: festival } = await supabase
    .from("festivals")
    .select("name, theme_name")
    .eq("slug", festivalSlug)
    .eq("club_id", club.id)
    .maybeSingle();

  const festivalName = festival?.name || "Festival";
  const themeName = festival?.theme_name || null;
  const clubName = club.name || "Movie Club";
  const themeColor = club.theme_color || "#6B9B6B";

  // Load Righteous font
  let righteousFont: ArrayBuffer | null = null;
  try {
    const response = await fetch(
      "https://fonts.gstatic.com/s/righteous/v17/1cXxaUPXBpj2rGoU7C9mj3uEicG01A.woff2"
    );
    if (response.ok) righteousFont = await response.arrayBuffer();
  } catch {
    // Font fetch failed
  }

  return new ImageResponse(
    <div
      style={{
        fontSize: 40,
        background: "linear-gradient(135deg, #0a0a0a 0%, #1a1a1a 100%)",
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: 20,
        padding: 60,
      }}
    >
      {/* Club color accent bar */}
      <div
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          right: 0,
          height: 6,
          background: themeColor,
        }}
      />

      {/* Club name (smaller, above festival) */}
      <div
        style={{
          display: "flex",
          color: themeColor,
          fontSize: 22,
          textTransform: "uppercase",
          letterSpacing: "0.1em",
        }}
      >
        {clubName}
      </div>

      {/* Festival name */}
      <div
        style={{
          display: "flex",
          color: "#ffffff",
          fontSize: 52,
          fontWeight: 700,
          textAlign: "center",
          maxWidth: "80%",
          lineClamp: 2,
        }}
      >
        {festivalName}
      </div>

      {/* Theme */}
      {themeName && (
        <div
          style={{
            display: "flex",
            color: "#9ca3af",
            fontSize: 26,
            textAlign: "center",
          }}
        >
          Theme: {themeName}
        </div>
      )}

      {/* BackRow branding */}
      <div
        style={{
          position: "absolute",
          bottom: 30,
          display: "flex",
          color: "#6B9B6B",
          fontSize: 28,
          fontFamily: "Righteous",
          opacity: 0.7,
        }}
      >
        BackRow
      </div>
    </div>,
    {
      ...size,
      ...(righteousFont && {
        fonts: [
          {
            name: "Righteous",
            data: righteousFont,
            style: "normal" as const,
            weight: 400 as const,
          },
        ],
      }),
    }
  );
}
