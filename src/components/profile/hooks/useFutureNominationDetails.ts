/**
 * Custom hook for fetching movie details for a future nomination item
 *
 * Handles loading movie details from TMDB API for the currently selected item.
 */
import { useState, useEffect } from "react";
import { getMovieDetailsForDisplay, type MovieDetailsForDisplay } from "@/app/actions/tmdb";
import type { FutureNominationItem } from "./useFutureNominationsList";

interface UseFutureNominationDetailsReturn {
  movieDetails: MovieDetailsForDisplay | null;
  detailsLoading: boolean;
}

export function useFutureNominationDetails(
  item: FutureNominationItem | null
): UseFutureNominationDetailsReturn {
  const [movieDetails, setMovieDetails] = useState<MovieDetailsForDisplay | null>(null);
  const [detailsLoading, setDetailsLoading] = useState(false);

  useEffect(() => {
    async function fetchMovieDetails() {
      if (!item?.tmdb_id) {
        setMovieDetails(null);
        return;
      }

      setDetailsLoading(true);
      try {
        const details = await getMovieDetailsForDisplay(item.tmdb_id);
        setMovieDetails(details);
      } catch (error) {
        console.error("Error fetching movie details:", error);
        setMovieDetails(null);
      } finally {
        setDetailsLoading(false);
      }
    }

    fetchMovieDetails();
  }, [item?.tmdb_id]);

  return {
    movieDetails,
    detailsLoading,
  };
}
