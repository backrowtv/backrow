import { ClubMobileNavWrapper } from "@/components/clubs/ClubMobileNavWrapper";
import { ClubThemeProvider } from "@/components/clubs/ClubThemeProvider";
import { createClient } from "@/lib/supabase/server";
import { getClubThemeColor } from "@/lib/clubs/theme-colors";
import { resolveClub } from "@/lib/clubs/resolveClub";
import { isValidHexColor } from "@/lib/security/sanitize";

/**
 * Club Layout
 *
 * This layout provides:
 * - Club theme color passed directly to components (no CSS variable flakiness)
 * - Persistent mobile navigation that doesn't re-render on page changes
 * - Passthrough for desktop (individual pages handle their own layout)
 *
 * Auth and membership checks are performed in individual page components
 * to avoid duplicate Supabase calls and Next.js 16 warnings.
 */
interface ClubLayoutProps {
  children: React.ReactNode;
  params: Promise<{ slug: string }>;
}

export default async function ClubLayout({ children, params }: ClubLayoutProps) {
  const { slug } = await params;

  // Fetch club theme color server-side
  // Use resolveClub to handle both slug and ID access
  const supabase = await createClient();
  const clubResolution = await resolveClub(supabase, slug);

  const themeColor = clubResolution ? getClubThemeColor(clubResolution.theme_color) : null;

  // Validate theme color to prevent CSS injection attacks
  const safeThemeColor = themeColor && isValidHexColor(themeColor) ? themeColor : null;

  return (
    <div className="club-layout">
      {/* Always render style tag for stable React reconciliation */}
      <style
        dangerouslySetInnerHTML={{
          __html: safeThemeColor
            ? `:root{--club-accent:${safeThemeColor};--club-accent-muted:${safeThemeColor}26;--club-accent-light:${safeThemeColor}4D}`
            : "",
        }}
      />
      {/* Client-side theme CSS variable setter - runs on both mobile and desktop */}
      <ClubThemeProvider themeColor={themeColor} />
      {/* Mobile-only navigation - persists across page navigations */}
      <ClubMobileNavWrapper clubSlug={slug} themeColor={themeColor} />
      {children}
    </div>
  );
}
