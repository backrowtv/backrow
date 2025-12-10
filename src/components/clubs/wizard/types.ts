import type { ClubWizardState, FestivalChoice } from "@/types/club-creation";

export interface WizardStepProps {
  state: ClubWizardState;
  updateState: (updates: Partial<ClubWizardState>) => void;
}

export interface StepModeProps extends WizardStepProps {
  selectFestivalChoice: (choice: FestivalChoice) => void;
}

export interface StepReviewProps extends WizardStepProps {
  isAuthenticated: boolean | null;
  showAuthPassword: boolean;
  setShowAuthPassword: (show: boolean) => void;
  isPending: boolean;
  onSubmit: () => void;
  goToStep: (step: number) => void;
}
