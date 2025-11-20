/**
 * Custom hook for managing theme linking operations
 *
 * Handles fetching club themes and linking/nominating movies to themes.
 */
import { useState, useEffect, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import { nominateFromFutureList } from "@/app/actions/profile";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";

export interface ClubTheme {
  clubId: string;
  clubName: string;
  clubSlug: string;
  clubPictureUrl?: string | null;
  themes: {
    id: string;
    theme: string;
    isThemePool: boolean; // true = theme_pool entry, false = festival
  }[];
}

interface UseThemeLinkingReturn {
  clubThemes: ClubTheme[];
  linkingLoading: boolean;
  handleNominate: (
    futureNominationId: string,
    clubId: string,
    festivalId: string,
    loadFutureNominations: () => Promise<void>,
    onComplete?: (stillExists: boolean) => void
  ) => Promise<void>;
  reloadClubThemes: () => Promise<void>;
}

export function useThemeLinking(userId: string): UseThemeLinkingReturn {
  const [clubThemes, setClubThemes] = useState<ClubTheme[]>([]);
  const [linkingLoading, setLinkingLoading] = useState(false);
  const router = useRouter();
  const supabase = createClient();

  const loadClubThemes = useCallback(async () => {
    if (!userId) {
      setClubThemes([]);
      return;
    }

    try {
      // Get clubs the user is a member of that allow theme submissions
      const { data: memberships, error: membershipError } = await supabase
        .from("club_members")
        .select(
          `
          club_id,
          clubs:club_id (
            id,
            name,
            slug,
            picture_url,
            theme_submissions_locked,
            settings
          )
        `
        )
        .eq("user_id", userId);

      if (membershipError) {
        console.error("Error loading memberships:", membershipError);
        throw membershipError;
      }

      if (!memberships || memberships.length === 0) {
        setClubThemes([]);
        return;
      }

      // Filter to clubs that have themes enabled
      // Note: theme_submissions_locked only controls adding NEW themes to the pool,
      // it should NOT prevent linking movies to existing themes
      const eligibleClubs = memberships.filter((m) => {
        const club = Array.isArray(m.clubs) ? m.clubs[0] : m.clubs;
        if (!club) return false;
        const settings = (club.settings as Record<string, unknown>) || {};
        return settings.themes_enabled !== false;
      });

      const clubIds = eligibleClubs.map((m) => m.club_id);

      if (clubIds.length === 0) {
        setClubThemes([]);
        return;
      }

      // Fetch themes from theme_pool (unused themes)
      const { data: themePoolEntries, error: themePoolError } = await supabase
        .from("theme_pool")
        .select("id, theme_name, club_id")
        .in("club_id", clubIds)
        .eq("is_used", false)
        .order("theme_name", { ascending: true });

      if (themePoolError) {
        console.error("Error loading theme pool:", themePoolError);
        throw themePoolError;
      }

      // Group themes by club
      const clubThemesMap = new Map<string, ClubTheme>();

      eligibleClubs.forEach((m) => {
        const club = Array.isArray(m.clubs) ? m.clubs[0] : m.clubs;
        if (club) {
          clubThemesMap.set(club.id, {
            clubId: club.id,
            clubName: club.name || "Unknown Club",
            clubSlug: club.slug || club.id,
            clubPictureUrl: club.picture_url,
            themes: [],
          });
        }
      });

      // Add theme pool entries
      themePoolEntries?.forEach((tp) => {
        const clubTheme = clubThemesMap.get(tp.club_id!);
        if (clubTheme) {
          clubTheme.themes.push({
            id: tp.id,
            theme: tp.theme_name,
            isThemePool: true,
          });
        }
      });

      // Include all eligible clubs (even those without themes for linking)
      setClubThemes(Array.from(clubThemesMap.values()));
    } catch (error) {
      console.error("Error loading club themes:", error);
    }
  }, [userId, supabase]);

  // Load club themes on mount
  useEffect(() => {
    loadClubThemes();
  }, [loadClubThemes]);

  const handleNominate = useCallback(
    async (
      futureNominationId: string,
      clubId: string,
      festivalId: string,
      loadFutureNominations: () => Promise<void>,
      onComplete?: (stillExists: boolean) => void
    ) => {
      setLinkingLoading(true);
      try {
        const result = await nominateFromFutureList(futureNominationId, clubId, festivalId);

        if ("error" in result && result.error) {
          toast.error(result.error);
          return;
        }

        toast.success("Movie nominated to festival!");

        // Reload the list to see if the item was removed (all links nominated)
        await loadFutureNominations();

        // Notify caller about completion
        if (onComplete) {
          // Note: caller should check if item still exists in their local state
          onComplete(true);
        }

        router.refresh();
      } catch (error) {
        console.error("Error nominating:", error);
        toast.error("Failed to nominate movie");
      } finally {
        setLinkingLoading(false);
      }
    },
    [router]
  );

  return {
    clubThemes,
    linkingLoading,
    handleNominate,
    reloadClubThemes: loadClubThemes,
  };
}
