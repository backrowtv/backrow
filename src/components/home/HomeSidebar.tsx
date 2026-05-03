import { createClient } from "@/lib/supabase/server";
import Link from "next/link";
import { EntityAvatar } from "@/components/ui/entity-avatar";
import { clubToAvatarData } from "@/lib/avatar-helpers";
import { BrandText } from "@/components/ui/brand-text";
import { CaretRight } from "@phosphor-icons/react/dist/ssr";
import { cn } from "@/lib/utils";
import { type FestivalPhase } from "@/lib/phase-labels";
import { getClubThemeColorForGlow } from "@/lib/clubs/theme-colors";

interface ClubWithMeta {
  id: string;
  name: string;
  slug: string | null;
  picture_url: string | null;
  settings?: unknown;
  theme_color: string | null;
  member_count: number;
  user_role: string;
  has_active_festival: boolean;
  festival_phase: FestivalPhase;
  is_endless: boolean;
  ratings_enabled: boolean;
  avatar_color_index: number | null;
}

async function getFavoriteClubs(): Promise<ClubWithMeta[]> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return [];

  // Get user's favorite clubs only
  const { data: favorites } = await supabase
    .from("favorite_clubs")
    .select("club_id")
    .eq("user_id", user.id);

  if (!favorites || favorites.length === 0) return [];

  const favoriteClubIds = favorites.map((f) => f.club_id);

  // Get memberships for role info
  const { data: memberships } = await supabase
    .from("club_members")
    .select("club_id, role")
    .eq("user_id", user.id)
    .in("club_id", favoriteClubIds);

  // Get active festivals with phase info
  const { data: activeFestivals } = await supabase
    .from("festivals")
    .select("club_id, phase, status")
    .in("club_id", favoriteClubIds)
    .in("status", ["nominating", "watching", "completed"])
    .order("created_at", { ascending: false });

  // Map club_id to most recent festival info
  const festivalMap = new Map<string, { phase: string; status: string }>();
  activeFestivals?.forEach((f) => {
    // Only keep the first (most recent) festival per club
    if (!festivalMap.has(f.club_id)) {
      festivalMap.set(f.club_id, { phase: f.phase, status: f.status });
    }
  });

  // Get clubs with their settings and theme_color
  const { data: clubs } = await supabase
    .from("clubs")
    .select(
      "id, name, slug, picture_url, settings, theme_color, avatar_icon, avatar_color_index, avatar_border_color_index"
    )
    .in("id", favoriteClubIds)
    .eq("archived", false)
    .order("name", { ascending: true })
    .limit(6);

  if (!clubs || clubs.length === 0) return [];

  const clubIds = clubs.map((c) => c.id);

  // Batch query: Get all member counts in one query instead of N individual queries
  const { data: allClubMemberships } = await supabase
    .from("club_members")
    .select("club_id")
    .in("club_id", clubIds);

  // Count members per club
  const memberCountMap = new Map<string, number>();
  allClubMemberships?.forEach((m) => {
    memberCountMap.set(m.club_id, (memberCountMap.get(m.club_id) || 0) + 1);
  });

  // Build clubs with metadata (no additional queries needed)
  const clubsWithRole = clubs.map((club) => {
    const membership = memberships?.find((m) => m.club_id === club.id);
    const festivalInfo = festivalMap.get(club.id);
    const clubSettings = (club.settings as Record<string, unknown>) || {};
    const isEndless = clubSettings.festival_type === "endless";
    const ratingsEnabled = clubSettings.club_ratings_enabled !== false; // Default true
    const hasActiveFestival =
      festivalInfo && ["nominating", "watching"].includes(festivalInfo.status);
    const avatarColorIndex = club.avatar_color_index ?? null;

    return {
      ...club,
      theme_color: club.theme_color,
      member_count: memberCountMap.get(club.id) || 0,
      user_role: membership?.role || "critic",
      has_active_festival: !!hasActiveFestival,
      festival_phase: hasActiveFestival ? (festivalInfo?.phase as FestivalPhase) : null,
      is_endless: isEndless,
      ratings_enabled: ratingsEnabled,
      avatar_color_index: avatarColorIndex,
    };
  });

  // Sort: active festivals first
  return clubsWithRole.sort((a, b) => {
    if (a.has_active_festival && !b.has_active_festival) return -1;
    if (!a.has_active_festival && b.has_active_festival) return 1;
    return 0;
  });
}

export async function HomeSidebar() {
  const clubs = await getFavoriteClubs();

  // Dynamic header based on count
  const headerText = clubs.length === 1 ? "Favorite Club" : "Favorite Clubs";

  if (clubs.length === 0) {
    return (
      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-semibold text-[var(--text-primary)] uppercase tracking-wide">
            Favorite Clubs
          </h2>
          <Link
            href="/clubs"
            className="flex items-center gap-0.5 text-sm text-[var(--primary)] transition-colors"
          >
            All
            <CaretRight className="h-4 w-4" />
          </Link>
        </div>
        <p className="text-xs text-[var(--text-muted)]">Star clubs to add them here</p>
      </div>
    );
  }

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-sm font-semibold text-[var(--text-primary)] uppercase tracking-wide">
          {headerText}
        </h2>
        <Link
          href="/clubs"
          className="flex items-center gap-0.5 text-sm text-[var(--primary)] transition-colors"
        >
          All
          <CaretRight className="h-4 w-4" />
        </Link>
      </div>

      {/* Card Grid - 2-3 columns max based on container width */}
      <div
        className="grid gap-2"
        style={{ gridTemplateColumns: "repeat(auto-fill, minmax(68px, 1fr))" }}
      >
        {clubs.map((club) => {
          if (!club.slug) return null;

          // Get theme color for accent background (matches ClubCard's 0.3 solid opacity)
          const themeGlow = getClubThemeColorForGlow(club.theme_color);
          const accentStyle = themeGlow
            ? {
                backgroundColor: `hsla(${themeGlow.h}, ${themeGlow.s}%, ${themeGlow.l}%, 0.3)`,
              }
            : undefined;

          return (
            <Link key={club.id} href={`/club/${club.slug}`} className="block group">
              <div className="flex flex-col items-center">
                {/* Square card with centered avatar */}
                <div
                  className={cn(
                    "relative w-full flex items-center justify-center rounded-xl aspect-square",
                    "border border-[var(--emboss-border)]",
                    "shadow-[var(--emboss-shadow)]",
                    "group-hover:bg-[var(--surface-1)] group-hover:border-[var(--border)] transition-all"
                  )}
                  style={accentStyle}
                >
                  <EntityAvatar entity={clubToAvatarData(club)} emojiSet="club" size="lg" />
                </div>
                {/* Name floating below — leading-[1.5] gives the clamp box enough vertical room that
                    tall glyphs on a clipped 3rd line (e.g. brackets, which extend above cap-line) stay hidden */}
                <p className="mt-1.5 text-[10px] font-medium text-[var(--text-primary)] text-center line-clamp-2 leading-[1.5] group-hover:text-[var(--primary)] transition-colors w-full px-0.5">
                  <BrandText>{club.name}</BrandText>
                </p>
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
