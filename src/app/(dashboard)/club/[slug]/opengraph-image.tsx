import { ImageResponse } from "next/og";
import { createClient } from "@/lib/supabase/server";

export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
export const alt = "BackRow Club";

export default async function ClubOGImage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const supabase = await createClient();

  // Fetch club data
  const { data: club } = await supabase
    .from("clubs")
    .select("name, description, theme_color")
    .eq("slug", slug)
    .eq("archived", false)
    .maybeSingle();

  // Fetch member count
  const { count: memberCount } = await supabase
    .from("club_members")
    .select("id", { count: "exact", head: true })
    .eq(
      "club_id",
      (await supabase.from("clubs").select("id").eq("slug", slug).maybeSingle()).data?.id || ""
    );

  const clubName = club?.name || "Movie Club";
  const description = club?.description || "A BackRow movie club";
  const themeColor = club?.theme_color || "#6B9B6B";
  const members = memberCount || 0;

  // Load Righteous font
  let righteousFont: ArrayBuffer | null = null;
  try {
    const response = await fetch(
      "https://fonts.gstatic.com/s/righteous/v17/1cXxaUPXBpj2rGoU7C9mj3uEicG01A.woff2"
    );
    if (response.ok) righteousFont = await response.arrayBuffer();
  } catch {
    // Font fetch failed, will use fallback
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
        gap: 24,
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

      {/* Club name */}
      <div
        style={{
          display: "flex",
          color: "#ffffff",
          fontSize: 56,
          fontWeight: 700,
          textAlign: "center",
          maxWidth: "80%",
          lineClamp: 2,
        }}
      >
        {clubName}
      </div>

      {/* Description */}
      <div
        style={{
          display: "flex",
          color: "#9ca3af",
          fontSize: 24,
          textAlign: "center",
          maxWidth: "70%",
          lineClamp: 2,
        }}
      >
        {description.length > 100 ? description.slice(0, 100) + "..." : description}
      </div>

      {/* Member count */}
      <div
        style={{
          display: "flex",
          color: themeColor,
          fontSize: 20,
          marginTop: 8,
        }}
      >
        {members} {members === 1 ? "member" : "members"}
      </div>

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
