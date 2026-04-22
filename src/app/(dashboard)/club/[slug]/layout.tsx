import { ClubMobileNavWrapper } from "@/components/clubs/ClubMobileNavWrapper";
import { createClient } from "@/lib/supabase/server";
import { getClubThemeColor } from "@/lib/clubs/theme-colors";
import { resolveClub } from "@/lib/clubs/resolveClub";
import { isValidHexColor } from "@/lib/security/validators";

interface ClubLayoutProps {
  children: React.ReactNode;
  params: Promise<{ slug: string }>;
}

export default async function ClubLayout({ children, params }: ClubLayoutProps) {
  const { slug } = await params;

  const supabase = await createClient();
  const clubResolution = await resolveClub(supabase, slug);

  const themeColor = clubResolution ? getClubThemeColor(clubResolution.theme_color) : null;
  const safeThemeColor = themeColor && isValidHexColor(themeColor) ? themeColor : null;

  // Scope CSS variables to this subtree so themes can't leak between clubs.
  const clubAccentStyle = safeThemeColor
    ? ({
        "--club-accent": safeThemeColor,
        "--club-accent-muted": `${safeThemeColor}26`,
        "--club-accent-light": `${safeThemeColor}4D`,
      } as React.CSSProperties)
    : undefined;

  return (
    <div className="club-layout" style={clubAccentStyle}>
      <ClubMobileNavWrapper clubSlug={slug} themeColor={themeColor} />
      {children}
    </div>
  );
}
