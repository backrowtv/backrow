/**
 * Custom hook for managing the future nominations list
 *
 * Handles fetching, loading, pagination, and deletion of future nomination items.
 */
import { useState, useEffect, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import { removeFromFutureNominations } from "@/app/actions/profile";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";

export interface FutureNominationItem {
  id: string;
  tmdb_id: number;
  note: string | null;
  tags: string[] | null;
  created_at: string;
  movie: {
    tmdb_id: number;
    title: string;
    poster_url: string | null;
    year: number | null;
  } | null;
  linkCount?: number;
  clubCount?: number;
  themeCount?: number;
  hasThemeLink?: boolean;
  primaryClubName?: string;
  primaryThemeName?: string;
}

interface UseFutureNominationsListReturn {
  items: FutureNominationItem[];
  loading: boolean;
  selectedIndex: number;
  setSelectedIndex: (index: number) => void;
  deletingId: string | null;
  loadFutureNominations: () => Promise<void>;
  handleDeleteItem: (itemId: string) => Promise<void>;
}

export function useFutureNominationsList(userId: string): UseFutureNominationsListReturn {
  const [items, setItems] = useState<FutureNominationItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const router = useRouter();
  const supabase = createClient();

  const loadFutureNominations = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from("future_nomination_list")
        .select("id, tmdb_id, note, tags, created_at")
        .eq("user_id", userId)
        .order("created_at", { ascending: false });

      if (error) throw error;

      if (!data || data.length === 0) {
        setItems([]);
        setLoading(false);
        return;
      }

      // Get movie details for each item
      const tmdbIds = data.map((item) => item.tmdb_id);

      const { data: movies, error: moviesError } = await supabase
        .from("movies")
        .select("tmdb_id, title, poster_url, year")
        .in("tmdb_id", [...new Set(tmdbIds)]);

      if (moviesError) throw moviesError;

      const moviesMap = new Map((movies || []).map((m) => [m.tmdb_id, m]));

      // Get theme links for each future nomination
      const { data: themeLinks, error: themeLinksError } = await supabase
        .from("future_nomination_links")
        .select("future_nomination_id")
        .in(
          "future_nomination_id",
          data.map((d) => d.id)
        )
        .eq("nominated", false);

      if (themeLinksError) {
        console.error("Error loading theme links:", themeLinksError);
      }

      // Count theme links per future nomination and track if any has a theme
      const themeLinkCountMap = new Map<string, number>();
      const hasThemeLinkMap = new Map<string, boolean>();
      themeLinks?.forEach((tl) => {
        const count = themeLinkCountMap.get(tl.future_nomination_id) || 0;
        themeLinkCountMap.set(tl.future_nomination_id, count + 1);
        hasThemeLinkMap.set(tl.future_nomination_id, true);
      });

      // Fetch link details (club name + theme name) for list view sorting
      const nominationIds = data.map((d) => d.id);
      const { data: linkDetails } = await supabase
        .from("future_nomination_links")
        .select("future_nomination_id, club:club_id(name), theme_pool:theme_pool_id(theme_name)")
        .in("future_nomination_id", nominationIds)
        .eq("nominated", false);

      // Build map of nomination -> primary link details + distinct club/theme counts
      const primaryLinkMap = new Map<string, { clubName?: string; themeName?: string }>();
      const clubCountMap = new Map<string, Set<string>>();
      const themeCountMap = new Map<string, Set<string>>();
      linkDetails?.forEach((ld) => {
        const club = Array.isArray(ld.club) ? ld.club[0] : ld.club;
        const themePool = Array.isArray(ld.theme_pool) ? ld.theme_pool[0] : ld.theme_pool;

        // Track distinct clubs and themes per nomination
        if (club?.name) {
          if (!clubCountMap.has(ld.future_nomination_id))
            clubCountMap.set(ld.future_nomination_id, new Set());
          clubCountMap.get(ld.future_nomination_id)!.add(club.name);
        }
        if (themePool?.theme_name) {
          if (!themeCountMap.has(ld.future_nomination_id))
            themeCountMap.set(ld.future_nomination_id, new Set());
          themeCountMap.get(ld.future_nomination_id)!.add(themePool.theme_name);
        }

        if (!primaryLinkMap.has(ld.future_nomination_id)) {
          primaryLinkMap.set(ld.future_nomination_id, {
            clubName: club?.name || undefined,
            themeName: themePool?.theme_name || undefined,
          });
        }
      });

      // Combine items with movie data and theme link info
      const itemsWithMovies: FutureNominationItem[] = data.map((item) => {
        const primaryLink = primaryLinkMap.get(item.id);
        return {
          id: item.id,
          tmdb_id: item.tmdb_id,
          note: item.note,
          tags: item.tags,
          created_at: item.created_at,
          movie: moviesMap.get(item.tmdb_id) || null,
          linkCount: themeLinkCountMap.get(item.id) || 0,
          clubCount: clubCountMap.get(item.id)?.size || 0,
          themeCount: themeCountMap.get(item.id)?.size || 0,
          hasThemeLink: hasThemeLinkMap.get(item.id) || false,
          primaryClubName: primaryLink?.clubName,
          primaryThemeName: primaryLink?.themeName,
        };
      });

      setItems(itemsWithMovies);
    } catch (error) {
      console.error("Error loading future nominations:", error);
      toast.error("Failed to load future nominations");
    } finally {
      setLoading(false);
    }
  }, [userId, supabase]);

  // Load future nominations on mount
  useEffect(() => {
    loadFutureNominations();
  }, [loadFutureNominations]);

  const handleDeleteItem = useCallback(
    async (itemId: string) => {
      setDeletingId(itemId);
      try {
        const result = await removeFromFutureNominations(itemId);

        if ("error" in result && result.error) {
          toast.error(result.error);
          return;
        }

        toast.success("Removed from future nominations");
        setItems((prev) => {
          const newItems = prev.filter((item) => item.id !== itemId);
          // Adjust selected index if needed
          if (selectedIndex >= newItems.length) {
            setSelectedIndex(Math.max(0, newItems.length - 1));
          }
          return newItems;
        });

        router.refresh();
      } catch (error) {
        console.error("Error removing from future nominations:", error);
        toast.error("Failed to remove movie");
      } finally {
        setDeletingId(null);
      }
    },
    [router, selectedIndex]
  );

  return {
    items,
    loading,
    selectedIndex,
    setSelectedIndex,
    deletingId,
    loadFutureNominations,
    handleDeleteItem,
  };
}
