import { useState, useEffect } from "react";
import {
  getPastNominations,
  type PastNominationItem,
} from "@/app/actions/profile/past-nominations";
import { getMovieDetailsForDisplay, type MovieDetailsForDisplay } from "@/app/actions/tmdb";
import { getMovieLinkPreferences } from "@/app/actions/navigation-preferences";
import type { MovieLinkType } from "@/lib/navigation-constants";
import toast from "react-hot-toast";

interface UsePastNominationDataOptions {
  userId: string;
  selectedIndex: number;
}

export function usePastNominationData({ userId, selectedIndex }: UsePastNominationDataOptions) {
  const [items, setItems] = useState<PastNominationItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [movieDetails, setMovieDetails] = useState<MovieDetailsForDisplay | null>(null);
  const [detailsLoading, setDetailsLoading] = useState(false);
  const [visibleLinks, setVisibleLinks] = useState<MovieLinkType[]>([]);

  // Load past nominations
  useEffect(() => {
    async function loadPastNominations() {
      try {
        const result = await getPastNominations();

        if ("error" in result && result.error) {
          toast.error(result.error);
          return;
        }

        setItems(result.data || []);
      } catch (error) {
        console.error("Error loading past nominations:", error);
        toast.error("Failed to load past nominations");
      } finally {
        setLoading(false);
      }
    }

    loadPastNominations();
  }, [userId]);

  // Load user's movie link preferences
  useEffect(() => {
    async function loadLinkPreferences() {
      try {
        const prefs = await getMovieLinkPreferences();
        setVisibleLinks(prefs.visibleLinks);
      } catch (error) {
        console.error("Error loading link preferences:", error);
        setVisibleLinks(["imdb", "letterboxd", "trakt", "tmdb", "wikipedia"]);
      }
    }
    loadLinkPreferences();
  }, []);

  // Fetch movie details when selection changes
  useEffect(() => {
    async function fetchMovieDetails() {
      const currentItem = items[selectedIndex];
      if (!currentItem?.tmdb_id) {
        setMovieDetails(null);
        return;
      }

      setDetailsLoading(true);
      try {
        const details = await getMovieDetailsForDisplay(currentItem.tmdb_id);
        setMovieDetails(details);
      } catch (error) {
        console.error("Error fetching movie details:", error);
        setMovieDetails(null);
      } finally {
        setDetailsLoading(false);
      }
    }

    fetchMovieDetails();
  }, [selectedIndex, items]);

  return { items, loading, movieDetails, detailsLoading, visibleLinks };
}
