"use client";

import { useState, useTransition, useEffect } from "react";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  CaretRight,
  CaretLeft,
  Sparkle,
  FilmReel,
  Star,
  Trophy,
  WarningCircle,
  CircleNotch,
} from "@phosphor-icons/react";
import {
  advanceFestivalPhase,
  revertFestivalPhase,
  forceAdvanceFestivalPhase,
  getPhaseRequirements,
} from "@/app/actions/festivals";
import toast from "react-hot-toast";
import { cn } from "@/lib/utils";
import type { FestivalPhase } from "@/types/festival";

interface FestivalPhaseControlsProps {
  festivalId: string;
  currentPhase: FestivalPhase;
  hasTheme: boolean;
  nominationCount: number;
  ratingCount?: number;
  guessingEnabled?: boolean;
  isEndless?: boolean;
  ratingsEnabled?: boolean;
  onPhaseChange?: () => void;
}

interface Requirement {
  id: string;
  label: string;
  met: boolean;
  required: boolean;
  value?: number;
  target?: number;
}

// Helper to get phases with dynamic labels based on ratings setting
function getPhases(ratingsEnabled: boolean): Array<{
  key: FestivalPhase;
  label: string;
  shortLabel: string;
  icon: typeof Sparkle;
}> {
  return [
    { key: "theme_selection", label: "Theme Selection", shortLabel: "Theme", icon: Sparkle },
    { key: "nomination", label: "Nominations", shortLabel: "Nominate", icon: FilmReel },
    {
      key: "watch_rate",
      label: ratingsEnabled ? "Watch & Rate" : "Watch",
      shortLabel: "Watch",
      icon: Star,
    },
    { key: "results", label: "Results", shortLabel: "Results", icon: Trophy },
  ];
}

export function FestivalPhaseControls({
  festivalId,
  currentPhase,
  hasTheme,
  nominationCount,
  ratingCount = 0,
  guessingEnabled = false,
  ratingsEnabled = true,
  onPhaseChange,
}: FestivalPhaseControlsProps) {
  const [isPending, startTransition] = useTransition();
  const [actionType, setActionType] = useState<"advance" | "revert" | "force" | null>(null);
  const [requirements, setRequirements] = useState<Requirement[]>([]);
  const [showForceDialog, setShowForceDialog] = useState(false);
  const [showRollbackDialog, setShowRollbackDialog] = useState(false);
  const [showAdvanceDialog, setShowAdvanceDialog] = useState(false);
  const [acknowledgedWarnings, setAcknowledgedWarnings] = useState<string[]>([]);
  const [rollbackOptions, setRollbackOptions] = useState<{
    clearRatings?: boolean;
    clearNominations?: boolean;
  }>({});

  // Get phases with dynamic labels based on ratings setting
  const PHASES = getPhases(ratingsEnabled);
  const currentIndex = PHASES.findIndex((p) => p.key === currentPhase);
  const canAdvance = currentIndex < PHASES.length - 1;
  const canRevert = currentIndex > 0;

  // Load requirements
  useEffect(() => {
    async function loadRequirements() {
      const result = await getPhaseRequirements(festivalId);
      if (result.data?.requirements) {
        setRequirements(result.data.requirements);
      }
    }
    loadRequirements();
  }, [festivalId, currentPhase, hasTheme, nominationCount, ratingCount]);

  // Calculate blockers from requirements
  const advanceBlockers = requirements.filter((r) => r.required && !r.met);
  const canAdvanceNow = canAdvance && advanceBlockers.length === 0;

  // Generate force advance warnings
  const getForceWarnings = (): string[] => {
    const warnings: string[] = [];
    if (currentPhase === "theme_selection" && !hasTheme) {
      warnings.push('No theme selected - will use "Open" theme');
    }
    if (currentPhase === "nomination") {
      if (nominationCount === 0) {
        warnings.push("No movies have been nominated");
      } else if (guessingEnabled && nominationCount < 3) {
        warnings.push(`Only ${nominationCount} nomination(s) - guessing requires 3+`);
      }
    }
    if (currentPhase === "watch_rate" && ratingCount === 0) {
      warnings.push("No ratings have been submitted");
    }
    return warnings;
  };

  const forceWarnings = getForceWarnings();

  // Handle clicking advance - show force dialog if conditions not met
  const handleAdvanceClick = () => {
    if (canAdvanceNow) {
      setShowAdvanceDialog(true);
    } else if (canAdvance) {
      // Conditions not met - show force dialog
      setShowForceDialog(true);
    }
  };

  const handleAdvance = async () => {
    setActionType("advance");
    startTransition(async () => {
      const result = await advanceFestivalPhase(festivalId);
      if ("error" in result && result.error) {
        toast.error(result.error);
      } else {
        toast.success("Phase advanced");
        onPhaseChange?.();
      }
      setActionType(null);
      setShowAdvanceDialog(false);
    });
  };

  const handleForceAdvance = async () => {
    if (forceWarnings.length > 0 && acknowledgedWarnings.length < forceWarnings.length) {
      toast.error("Acknowledge all warnings to proceed");
      return;
    }

    setActionType("force");
    startTransition(async () => {
      const result = await forceAdvanceFestivalPhase(festivalId, acknowledgedWarnings);
      if ("error" in result && result.error) {
        toast.error(result.error);
      } else {
        toast.success("Phase advanced");
        setShowForceDialog(false);
        setAcknowledgedWarnings([]);
        onPhaseChange?.();
      }
      setActionType(null);
    });
  };

  const handleRevert = async () => {
    setActionType("revert");
    startTransition(async () => {
      const result = await revertFestivalPhase(festivalId, rollbackOptions);
      if ("error" in result && result.error) {
        toast.error(result.error);
      } else {
        toast.success("Phase reverted");
        setShowRollbackDialog(false);
        setRollbackOptions({});
        onPhaseChange?.();
      }
      setActionType(null);
    });
  };

  const toggleWarning = (warning: string) => {
    setAcknowledgedWarnings((prev) =>
      prev.includes(warning) ? prev.filter((w) => w !== warning) : [...prev, warning]
    );
  };

  const nextPhase = canAdvance ? PHASES[currentIndex + 1] : null;
  const prevPhase = canRevert ? PHASES[currentIndex - 1] : null;
  const currentPhaseData = PHASES[currentIndex];
  const CurrentIcon = currentPhaseData?.icon || Sparkle;

  return (
    <div className="space-y-4">
      {/* Compact Phase Progress - dots with current label */}
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2">
          {PHASES.map((phase, index) => {
            const isCurrent = index === currentIndex;
            const isPast = index < currentIndex;

            return (
              <div
                key={phase.key}
                className={cn(
                  "w-2 h-2 rounded-full transition-all",
                  isPast && "bg-[var(--primary)]",
                  isCurrent && "bg-[var(--primary)] w-3 h-3",
                  !isPast && !isCurrent && "bg-[var(--surface-2)]"
                )}
              />
            );
          })}
        </div>
        <div className="flex items-center gap-1.5 text-sm text-[var(--text-muted)]">
          <CurrentIcon className="w-3.5 h-3.5" />
          <span>{currentPhaseData?.shortLabel}</span>
        </div>
      </div>

      {/* Two Button Row - Force Revert and Force Advance side by side */}
      <div className="flex items-center gap-3">
        {/* Force Revert Button */}
        {canRevert ? (
          <Button
            variant="outline"
            size="sm"
            className="flex-1 min-w-0"
            disabled={isPending}
            onClick={() => setShowRollbackDialog(true)}
          >
            {isPending && actionType === "revert" ? (
              <CircleNotch className="w-3.5 h-3.5 mr-1.5 animate-spin" />
            ) : (
              <CaretLeft className="w-3.5 h-3.5 mr-1.5" />
            )}
            Force Revert
          </Button>
        ) : (
          <div className="flex-1" />
        )}

        {/* Force Advance Button */}
        {canAdvance ? (
          <Button
            variant="club-accent"
            size="sm"
            className="flex-1 min-w-0"
            disabled={isPending}
            onClick={handleAdvanceClick}
          >
            {isPending && (actionType === "advance" || actionType === "force") ? (
              <CircleNotch className="w-3.5 h-3.5 mr-1.5 animate-spin" />
            ) : null}
            Force Advance
            <CaretRight className="w-3.5 h-3.5 ml-1.5" />
          </Button>
        ) : (
          <div className="flex-1 text-sm text-[var(--text-muted)] text-center">
            Festival complete
          </div>
        )}
      </div>

      {/* Advance Confirmation Dialog */}
      <AlertDialog open={showAdvanceDialog} onOpenChange={setShowAdvanceDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Advance to {nextPhase?.label}?</AlertDialogTitle>
            <AlertDialogDescription>
              {nextPhase?.key === "results" && "Results will be calculated and revealed."}
              {nextPhase?.key === "watch_rate" && "Members can start watching and rating."}
              {nextPhase?.key === "nomination" && "Members can nominate movies."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleAdvance}>
              {isPending && actionType === "advance" && (
                <CircleNotch className="w-4 h-4 mr-2 animate-spin" />
              )}
              Advance
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Force Advance Dialog - shown when conditions not met */}
      <AlertDialog
        open={showForceDialog}
        onOpenChange={(open) => {
          setShowForceDialog(open);
          if (!open) setAcknowledgedWarnings([]);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <WarningCircle className="w-5 h-5 text-[var(--warning)]" />
              Requirements Not Met
            </AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-3">
                <p>The following requirements are not met. Do you want to force advance anyway?</p>
                {forceWarnings.map((warning, i) => (
                  <label
                    key={i}
                    className="flex items-start gap-2 p-2 rounded border border-[var(--border)] cursor-pointer hover:bg-[var(--surface-1)]"
                  >
                    <input
                      type="checkbox"
                      checked={acknowledgedWarnings.includes(warning)}
                      onChange={() => toggleWarning(warning)}
                      className="mt-0.5"
                    />
                    <span className="text-sm">{warning}</span>
                  </label>
                ))}
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleForceAdvance}
              disabled={
                forceWarnings.length > 0 && acknowledgedWarnings.length < forceWarnings.length
              }
              className="bg-[var(--warning)] hover:bg-[var(--warning)]/90 text-white"
            >
              {isPending && actionType === "force" && (
                <CircleNotch className="w-4 h-4 mr-2 animate-spin" />
              )}
              Force Advance
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Revert Dialog */}
      <AlertDialog open={showRollbackDialog} onOpenChange={setShowRollbackDialog}>
        <AlertDialogContent className="max-w-[calc(100vw-2rem)] sm:max-w-md">
          <AlertDialogHeader>
            <AlertDialogTitle>Revert to {prevPhase?.label}?</AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-3">
                {currentPhase === "results" && (
                  <p className="text-sm text-[var(--warning)]">
                    Results will be deleted and must be recalculated.
                  </p>
                )}
                {currentPhase === "watch_rate" && (
                  <label className="flex items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      checked={rollbackOptions.clearRatings || false}
                      onChange={(e) =>
                        setRollbackOptions((prev) => ({ ...prev, clearRatings: e.target.checked }))
                      }
                    />
                    Also delete all ratings
                  </label>
                )}
                {currentPhase === "nomination" && (
                  <label className="flex items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      checked={rollbackOptions.clearNominations || false}
                      onChange={(e) =>
                        setRollbackOptions((prev) => ({
                          ...prev,
                          clearNominations: e.target.checked,
                        }))
                      }
                    />
                    Also delete all nominations
                  </label>
                )}
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setRollbackOptions({})}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleRevert}>
              {isPending && actionType === "revert" && (
                <CircleNotch className="w-4 h-4 mr-2 animate-spin" />
              )}
              Revert
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
