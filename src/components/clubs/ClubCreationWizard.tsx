"use client";

import { useState, useEffect, useTransition, useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowRight, ArrowLeft, Check } from "@phosphor-icons/react";
import toast from "react-hot-toast";

import { Button } from "@/components/ui/button";
import { Logo } from "@/components/shared/Logo";
import { createUserAndClub } from "@/app/actions/wizard-auth";
import { createClub } from "@/app/actions/clubs";
import { createClient } from "@/lib/supabase/client";

import {
  ClubWizardState,
  INITIAL_WIZARD_STATE,
  FestivalChoice,
  applyFestivalChoiceToState,
} from "@/types/club-creation";

import { StepMode } from "./wizard/StepMode";
import { StepIdentity } from "./wizard/StepIdentity";
import { StepHowItRuns } from "./wizard/StepHowItRuns";
import { StepReview } from "./wizard/StepReview";

const TOTAL_STEPS = 4;
const STORAGE_KEY = "backrow_club_wizard_state_v5";
const LEGACY_STORAGE_KEY = "backrow_club_wizard_state_v4";

const STEP_TITLES = ["Identity", "Mode", "How It Runs", "Review"] as const;

export function ClubCreationWizard() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);
  const [showAuthPassword, setShowAuthPassword] = useState(false);

  const [state, setState] = useState<ClubWizardState>(INITIAL_WIZARD_STATE);

  useEffect(() => {
    const checkAuth = async () => {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      setIsAuthenticated(!!user);
    };
    checkAuth();
  }, []);

  useEffect(() => {
    const typeParam = searchParams.get("type");
    if (typeParam === "standard" || typeParam === "endless") {
      setState((prev) => applyFestivalChoiceToState(prev, typeParam));
    }
  }, [searchParams]);

  useEffect(() => {
    try {
      localStorage.removeItem(LEGACY_STORAGE_KEY);
    } catch {}

    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        setState((prev) => ({
          ...prev,
          ...parsed,
          genres: Array.isArray(parsed.genres) ? parsed.genres : [],
          avatarFile: null,
          email: "",
          authPassword: "",
          confirmPassword: "",
        }));
      } catch {}
    }
  }, []);

  useEffect(() => {
    const {
      avatarFile: _avatarFile,
      email: _email,
      authPassword: _authPassword,
      confirmPassword: _confirmPassword,
      ...stateToSave
    } = state;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(stateToSave));
  }, [state]);

  const updateState = useCallback((updates: Partial<ClubWizardState>) => {
    setState((prev) => ({ ...prev, ...updates }));
  }, []);

  const selectFestivalChoice = useCallback((choice: FestivalChoice) => {
    setState((prev) => applyFestivalChoiceToState(prev, choice));
  }, []);

  const handleSubmit = useCallback(async () => {
    startTransition(async () => {
      try {
        const formData = new FormData();

        formData.append("name", state.name);
        formData.append("description", state.description);
        formData.append("privacy", state.privacy);

        if (state.avatarFile) formData.append("picture", state.avatarFile);
        if (state.avatarIcon) formData.append("avatar_icon", state.avatarIcon);
        if (state.avatarColorIndex !== null)
          formData.append("avatar_color_index", state.avatarColorIndex.toString());
        if (state.avatarBorderColorIndex !== null)
          formData.append("avatar_border_color_index", state.avatarBorderColorIndex.toString());

        if (state.themeColor) formData.append("theme_color", state.themeColor);

        formData.append("genres", JSON.stringify(state.genres));

        formData.append("festival_type", state.festivalType);

        formData.append("themes_enabled", state.themesEnabled.toString());
        formData.append("theme_governance", state.themeGovernance);
        formData.append("max_themes_per_user", state.maxThemesPerUser.toString());

        formData.append("max_nominations_per_user", state.maxNominationsPerUser.toString());
        formData.append("blind_nominations", state.blindNominations.toString());

        formData.append("scoring_enabled", state.scoringEnabled.toString());
        formData.append("nomination_guessing_enabled", state.nominationGuessing.toString());
        formData.append("season_standings_enabled", state.seasonStandingsEnabled.toString());

        formData.append("timing_mode", state.timingMode);
        formData.append("auto_start_next_festival", state.autoStartNextFestival.toString());

        formData.append("movie_pool_governance", state.moviePoolGovernance);
        formData.append("allow_non_admin_movie_pool", state.allowNonAdminMoviePool.toString());

        let result;

        if (isAuthenticated) {
          result = await createClub(null, formData);
        } else {
          formData.append("email", state.email);
          formData.append("username", state.username);
          formData.append("auth_password", state.authPassword);
          result = await createUserAndClub(formData);
        }

        if (result && "error" in result && result.error) {
          toast.error(result.error);
        } else if (
          result &&
          "success" in result &&
          result.success &&
          "clubSlug" in result &&
          result.clubSlug
        ) {
          localStorage.removeItem(STORAGE_KEY);
          toast.success("Your club is ready!");
          router.push(`/club/${result.clubSlug}`);
        } else {
          localStorage.removeItem(STORAGE_KEY);
          toast.success("Your club is ready!");
          router.push("/");
        }
      } catch (error) {
        console.error("Club creation error:", error);
        toast.error("Something went wrong. Please try again.");
      }
    });
  }, [state, isAuthenticated, router]);

  const nextStep = useCallback(() => {
    setState((prev) => ({
      ...prev,
      currentStep: Math.min(prev.currentStep + 1, TOTAL_STEPS),
    }));
  }, []);

  const prevStep = useCallback(() => {
    setState((prev) => ({
      ...prev,
      currentStep: Math.max(prev.currentStep - 1, 1),
    }));
  }, []);

  const goToStep = useCallback((step: number) => {
    setState((prev) => ({
      ...prev,
      currentStep: Math.max(1, Math.min(step, TOTAL_STEPS)),
    }));
  }, []);

  const canProceed = () => {
    switch (state.currentStep) {
      case 1:
        return state.name.trim().length >= 3;
      case 2:
        return state.festivalChoice !== null;
      case TOTAL_STEPS:
        if (isAuthenticated) return true;
        return (
          state.email.includes("@") &&
          state.username.length >= 3 &&
          state.authPassword.length >= 8 &&
          state.authPassword === state.confirmPassword
        );
      default:
        return true;
    }
  };

  const renderStep = () => {
    switch (state.currentStep) {
      case 1:
        return <StepIdentity state={state} updateState={updateState} />;
      case 2:
        return (
          <StepMode
            state={state}
            selectFestivalChoice={selectFestivalChoice}
            updateState={updateState}
          />
        );
      case 3:
        return <StepHowItRuns state={state} updateState={updateState} />;
      case 4:
        return (
          <StepReview
            state={state}
            updateState={updateState}
            isAuthenticated={isAuthenticated}
            showAuthPassword={showAuthPassword}
            setShowAuthPassword={setShowAuthPassword}
            isPending={isPending}
            onSubmit={handleSubmit}
            goToStep={goToStep}
          />
        );
      default:
        return null;
    }
  };

  if (isAuthenticated === null) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-pulse text-center">
          <Logo variant="icon" size="lg" className="mx-auto mb-4 opacity-50" />
          <p className="text-sm" style={{ color: "var(--text-muted)" }}>
            Loading...
          </p>
        </div>
      </div>
    );
  }

  const currentStepTitle = STEP_TITLES[state.currentStep - 1];

  return (
    <div className="space-y-8">
      <div className="text-center">
        <Logo variant="full" size="lg" className="mx-auto" />
      </div>

      <div className="flex items-center gap-2">
        {Array.from({ length: TOTAL_STEPS }).map((_, index) => {
          const stepNum = index + 1;
          const isActive = stepNum === state.currentStep;
          const isComplete = stepNum < state.currentStep;
          const isClickable = stepNum <= state.currentStep;

          return (
            <div key={stepNum} className="flex items-center gap-2 flex-1">
              <button
                type="button"
                onClick={() => isClickable && goToStep(stepNum)}
                disabled={!isClickable || isPending}
                aria-label={`Go to step ${stepNum}: ${STEP_TITLES[index]}`}
                className="flex items-center justify-center w-8 h-8 rounded-full border transition-colors duration-200 disabled:cursor-not-allowed flex-shrink-0"
                style={{
                  backgroundColor: isActive || isComplete ? "var(--primary)" : "var(--surface-1)",
                  borderColor: isActive || isComplete ? "var(--primary)" : "var(--border)",
                }}
              >
                {isComplete ? (
                  <Check weight="bold" className="w-4 h-4 text-white" />
                ) : (
                  <span
                    className="text-xs font-semibold"
                    style={{
                      color: isActive ? "white" : "var(--text-muted)",
                    }}
                  >
                    {stepNum}
                  </span>
                )}
              </button>
              {index < TOTAL_STEPS - 1 && (
                <div
                  className="flex-1 h-px transition-colors duration-200"
                  style={{
                    backgroundColor: isComplete ? "var(--primary)" : "var(--border)",
                  }}
                />
              )}
            </div>
          );
        })}
      </div>

      <div className="text-center space-y-0.5">
        <p className="text-lg font-semibold" style={{ color: "var(--text-primary)" }}>
          {currentStepTitle}
        </p>
        <p className="text-xs" style={{ color: "var(--text-muted)" }}>
          Step {state.currentStep} of {TOTAL_STEPS}
        </p>
      </div>

      <AnimatePresence mode="wait">
        <motion.div
          key={state.currentStep}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.15 }}
        >
          {renderStep()}
        </motion.div>
      </AnimatePresence>

      {state.currentStep < TOTAL_STEPS && (
        <div className="flex justify-between items-center pt-4">
          {state.currentStep > 1 ? (
            <button
              onClick={prevStep}
              disabled={isPending}
              className="flex items-center gap-2 text-sm transition-opacity hover:opacity-70 disabled:opacity-50"
              style={{ color: "var(--text-muted)" }}
            >
              <ArrowLeft className="w-4 h-4" /> Back
            </button>
          ) : (
            <div />
          )}
          <Button onClick={nextStep} disabled={!canProceed() || isPending} className="gap-2">
            Continue
            <ArrowRight className="w-4 h-4" />
          </Button>
        </div>
      )}
    </div>
  );
}
