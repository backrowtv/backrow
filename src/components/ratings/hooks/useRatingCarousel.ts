import { useState, useRef, useCallback, useReducer } from "react";
import type { RatingRubric } from "@/types/club-settings";
import type { FestivalRubricLock } from "@/app/actions/rubrics.types";

// UI State reducer
type UIState = {
  currentIndex: number;
  filterTab: "all" | "unrated" | "rated";
  rubricModalOpen: boolean;
  showRubricSelectionModal: boolean;
};

type UIAction =
  | { type: "SET_INDEX"; payload: number }
  | { type: "SET_FILTER"; payload: "all" | "unrated" | "rated" }
  | { type: "SET_RUBRIC_MODAL"; payload: boolean }
  | { type: "SET_SELECTION_MODAL"; payload: boolean };

function uiReducer(state: UIState, action: UIAction): UIState {
  switch (action.type) {
    case "SET_INDEX":
      return { ...state, currentIndex: action.payload };
    case "SET_FILTER":
      return { ...state, filterTab: action.payload };
    case "SET_RUBRIC_MODAL":
      return { ...state, rubricModalOpen: action.payload };
    case "SET_SELECTION_MODAL":
      return { ...state, showRubricSelectionModal: action.payload };
    default:
      return state;
  }
}

// Rating State reducer
type RatingState = {
  rating: number;
  rubricRatings: Record<string, number>;
  selectedRubricId: string | null;
};

type RatingAction =
  | { type: "SET_RATING"; payload: number }
  | { type: "SET_RUBRIC_RATINGS"; payload: Record<string, number> }
  | { type: "SET_SELECTED_RUBRIC_ID"; payload: string | null }
  | { type: "RESET_RATING" };

function ratingReducer(state: RatingState, action: RatingAction): RatingState {
  switch (action.type) {
    case "SET_RATING":
      return { ...state, rating: action.payload };
    case "SET_RUBRIC_RATINGS":
      return { ...state, rubricRatings: action.payload };
    case "SET_SELECTED_RUBRIC_ID":
      return { ...state, selectedRubricId: action.payload };
    case "RESET_RATING":
      return { ...state, rating: 0, rubricRatings: {} };
    default:
      return state;
  }
}

// Submission State reducer
type SubmissionState = {
  submittingId: string | null;
  errors: Record<string, string>;
};

type SubmissionAction =
  | { type: "SET_SUBMITTING"; payload: string | null }
  | { type: "SET_ERROR"; payload: { id: string; error: string } }
  | { type: "CLEAR_ERROR"; payload: string };

function submissionReducer(state: SubmissionState, action: SubmissionAction): SubmissionState {
  switch (action.type) {
    case "SET_SUBMITTING":
      return { ...state, submittingId: action.payload };
    case "SET_ERROR":
      return {
        ...state,
        errors: { ...state.errors, [action.payload.id]: action.payload.error },
      };
    case "CLEAR_ERROR":
      const newErrors = { ...state.errors };
      delete newErrors[action.payload];
      return { ...state, errors: newErrors };
    default:
      return state;
  }
}

// Guess State reducer
type GuessState = {
  guesses: Record<string, string>;
  savingGuess: string | null;
  guessErrors: Record<string, string>;
};

type GuessAction =
  | { type: "SET_GUESSES"; payload: Record<string, string> }
  | { type: "UPDATE_GUESS"; payload: { id: string; userId: string } }
  | { type: "SET_SAVING"; payload: string | null }
  | { type: "SET_GUESS_ERROR"; payload: { id: string; error: string } }
  | { type: "CLEAR_GUESS_ERROR"; payload: string }
  | { type: "REVERT_GUESS"; payload: { id: string; previousValue?: string } };

function guessReducer(state: GuessState, action: GuessAction): GuessState {
  switch (action.type) {
    case "SET_GUESSES":
      return { ...state, guesses: action.payload };
    case "UPDATE_GUESS":
      return {
        ...state,
        guesses: { ...state.guesses, [action.payload.id]: action.payload.userId },
        guessErrors: { ...state.guessErrors, [action.payload.id]: "" },
      };
    case "SET_SAVING":
      return { ...state, savingGuess: action.payload };
    case "SET_GUESS_ERROR":
      return {
        ...state,
        guessErrors: { ...state.guessErrors, [action.payload.id]: action.payload.error },
      };
    case "CLEAR_GUESS_ERROR": {
      const newGuessErrors = { ...state.guessErrors };
      delete newGuessErrors[action.payload];
      return { ...state, guessErrors: newGuessErrors };
    }
    case "REVERT_GUESS": {
      const newGuesses = { ...state.guesses };
      if (action.payload.previousValue) {
        newGuesses[action.payload.id] = action.payload.previousValue;
      } else {
        delete newGuesses[action.payload.id];
      }
      return { ...state, guesses: newGuesses };
    }
    default:
      return state;
  }
}

interface UseRatingCarouselOptions {
  existingGuesses: Record<string, string> | null;
}

export function useRatingCarousel({ existingGuesses }: UseRatingCarouselOptions) {
  // UI State
  const [uiState, uiDispatch] = useReducer(uiReducer, {
    currentIndex: 0,
    filterTab: "unrated" as const,
    rubricModalOpen: false,
    showRubricSelectionModal: false,
  });

  // Rating State
  const [ratingState, ratingDispatch] = useReducer(ratingReducer, {
    rating: 0,
    rubricRatings: {},
    selectedRubricId: null,
  });

  // Submission State
  const [submissionState, submissionDispatch] = useReducer(submissionReducer, {
    submittingId: null,
    errors: {},
  });

  // Guess State
  const [guessState, guessDispatch] = useReducer(guessReducer, {
    guesses: existingGuesses || {},
    savingGuess: null,
    guessErrors: {},
  });

  // Additional states that don't fit well into reducers
  const [personalRubrics, setPersonalRubrics] = useState<
    Array<{ id: string; name: string; rubrics: RatingRubric[] }>
  >([]);
  const [rubricLock, setRubricLock] = useState<FestivalRubricLock | null | undefined>(undefined);
  const [activeRubric, setActiveRubric] = useState<{
    name: string;
    categories: RatingRubric[];
  } | null>(null);

  // Ref for timeout management
  const saveTimeoutRefs = useRef<Record<string, NodeJS.Timeout>>({});

  // UI Actions
  const setCurrentIndex = useCallback((index: number) => {
    uiDispatch({ type: "SET_INDEX", payload: index });
  }, []);

  const setFilterTab = useCallback((tab: "all" | "unrated" | "rated") => {
    uiDispatch({ type: "SET_FILTER", payload: tab });
  }, []);

  const setRubricModalOpen = useCallback((open: boolean) => {
    uiDispatch({ type: "SET_RUBRIC_MODAL", payload: open });
  }, []);

  const setShowRubricSelectionModal = useCallback((show: boolean) => {
    uiDispatch({ type: "SET_SELECTION_MODAL", payload: show });
  }, []);

  // Rating Actions
  const setRating = useCallback((value: number) => {
    ratingDispatch({ type: "SET_RATING", payload: value });
  }, []);

  const setRubricRatings = useCallback((ratings: Record<string, number>) => {
    ratingDispatch({ type: "SET_RUBRIC_RATINGS", payload: ratings });
  }, []);

  const setSelectedRubricId = useCallback((id: string | null) => {
    ratingDispatch({ type: "SET_SELECTED_RUBRIC_ID", payload: id });
  }, []);

  const resetRating = useCallback(() => {
    ratingDispatch({ type: "RESET_RATING" });
    uiDispatch({ type: "SET_RUBRIC_MODAL", payload: false });
  }, []);

  // Submission Actions
  const setSubmittingId = useCallback((id: string | null) => {
    submissionDispatch({ type: "SET_SUBMITTING", payload: id });
  }, []);

  const setError = useCallback((id: string, error: string) => {
    submissionDispatch({ type: "SET_ERROR", payload: { id, error } });
  }, []);

  const clearError = useCallback((id: string) => {
    submissionDispatch({ type: "CLEAR_ERROR", payload: id });
  }, []);

  // Guess Actions
  const setGuesses = useCallback((guesses: Record<string, string>) => {
    guessDispatch({ type: "SET_GUESSES", payload: guesses });
  }, []);

  const updateGuess = useCallback((id: string, userId: string) => {
    guessDispatch({ type: "UPDATE_GUESS", payload: { id, userId } });
  }, []);

  const setSavingGuess = useCallback((id: string | null) => {
    guessDispatch({ type: "SET_SAVING", payload: id });
  }, []);

  const setGuessError = useCallback((id: string, error: string) => {
    guessDispatch({ type: "SET_GUESS_ERROR", payload: { id, error } });
  }, []);

  const clearGuessError = useCallback((id: string) => {
    guessDispatch({ type: "CLEAR_GUESS_ERROR", payload: id });
  }, []);

  const revertGuess = useCallback((id: string, previousValue?: string) => {
    guessDispatch({ type: "REVERT_GUESS", payload: { id, previousValue } });
  }, []);

  return {
    // UI State
    currentIndex: uiState.currentIndex,
    setCurrentIndex,
    filterTab: uiState.filterTab,
    setFilterTab,
    rubricModalOpen: uiState.rubricModalOpen,
    setRubricModalOpen,
    showRubricSelectionModal: uiState.showRubricSelectionModal,
    setShowRubricSelectionModal,

    // Rating State
    rating: ratingState.rating,
    setRating,
    rubricRatings: ratingState.rubricRatings,
    setRubricRatings,
    selectedRubricId: ratingState.selectedRubricId,
    setSelectedRubricId,
    resetRating,

    // Submission State
    submittingId: submissionState.submittingId,
    setSubmittingId,
    errors: submissionState.errors,
    setError,
    clearError,

    // Guess State
    guesses: guessState.guesses,
    setGuesses,
    updateGuess,
    savingGuess: guessState.savingGuess,
    setSavingGuess,
    guessErrors: guessState.guessErrors,
    setGuessError,
    clearGuessError,
    revertGuess,

    // Rubric State (kept as useState due to complex objects)
    personalRubrics,
    setPersonalRubrics,
    rubricLock,
    setRubricLock,
    activeRubric,
    setActiveRubric,

    // Refs
    saveTimeoutRefs,
  };
}
