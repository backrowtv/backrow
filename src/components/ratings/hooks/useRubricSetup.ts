import { useEffect } from "react";
import { getFestivalRubricLock, getUserRubricPreference, getUserRubrics } from "@/app/actions/rubrics";
import type { FestivalRubricLock } from "@/app/actions/rubrics.types";
import type { RatingRubric, RubricEnforcement } from "@/types/club-settings";

interface UseRubricSetupOptions {
  festivalId: string;
  rubricEnforcement: RubricEnforcement;
  isRatingPhase: boolean;
  rateableNominationCount: number;
  ratedCount: number;
  useRubrics: boolean;
  // State setters from useRatingCarousel
  setRubricLock: (lock: FestivalRubricLock | null) => void;
  setActiveRubric: (rubric: { name: string; categories: RatingRubric[] } | null) => void;
  setShowRubricSelectionModal: (show: boolean) => void;
  setPersonalRubrics: (
    rubrics: Array<{ id: string; name: string; rubrics: RatingRubric[] }>
  ) => void;
  rubricLock: FestivalRubricLock | null | undefined;
}

/**
 * Handles rubric initialization: checking locks, showing selection modal,
 * and fetching personal rubrics.
 */
export function useRubricSetup({
  festivalId,
  rubricEnforcement,
  isRatingPhase,
  rateableNominationCount,
  ratedCount,
  useRubrics,
  setRubricLock,
  setActiveRubric,
  setShowRubricSelectionModal,
  setPersonalRubrics,
  rubricLock,
}: UseRubricSetupOptions) {
  // Check for existing rubric lock on mount
  useEffect(() => {
    async function checkRubricLock() {
      const result = await getFestivalRubricLock(festivalId);
      if (result.data) {
        setRubricLock(result.data);
        if (result.data.rubric_snapshot && !result.data.opted_out) {
          setActiveRubric({
            name: result.data.rubric_snapshot.name,
            categories: result.data.rubric_snapshot.categories,
          });
        }
      } else if (result.success) {
        setRubricLock(null);
      }
    }

    checkRubricLock();
  }, [festivalId, setRubricLock, setActiveRubric]);

  // Show rubric selection modal on first rating attempt if no lock exists
  useEffect(() => {
    const hasUnratedMovies = ratedCount < rateableNominationCount;
    const hasNotRatedAny = ratedCount === 0;

    if (
      rubricLock === null &&
      hasUnratedMovies &&
      hasNotRatedAny &&
      rubricEnforcement !== "off" &&
      isRatingPhase
    ) {
      getUserRubricPreference().then((result) => {
        if (result.data?.dontAskAgain) {
          setActiveRubric(null);
        } else {
          setShowRubricSelectionModal(true);
        }
      });
    }
  }, [
    rubricLock,
    rateableNominationCount,
    ratedCount,
    rubricEnforcement,
    isRatingPhase,
    setActiveRubric,
    setShowRubricSelectionModal,
  ]);

  // Fetch user's personal rubrics from user_rubrics table
  useEffect(() => {
    async function fetchPersonalRubrics() {
      if (!useRubrics) return;

      const result = await getUserRubrics();
      if (result.data && result.data.length > 0) {
        setPersonalRubrics(
          result.data.map((r) => ({
            id: r.id,
            name: r.name,
            rubrics: r.categories,
          }))
        );
      }
    }

    fetchPersonalRubrics();
  }, [useRubrics, setPersonalRubrics]);
}
