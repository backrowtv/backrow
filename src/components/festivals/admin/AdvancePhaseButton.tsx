"use client";

import { advanceFestivalPhase, revertFestivalPhase } from "@/app/actions/festivals";
import { useTransition, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { ConfirmationDialog } from "@/components/ui/confirmation-dialog";

interface AdvancePhaseButtonProps {
  festivalId: string;
  currentPhase: string;
}

type DialogAction = "advance" | "revert" | null;

export function AdvancePhaseButton({ festivalId, currentPhase }: AdvancePhaseButtonProps) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [dialogAction, setDialogAction] = useState<DialogAction>(null);
  const router = useRouter();

  const phaseOrder = ["theme_selection", "nomination", "watch_rate", "results"];
  const currentIndex = phaseOrder.indexOf(currentPhase);
  const canAdvance = currentIndex < phaseOrder.length - 1;
  const canRevert = currentIndex > 0;

  const nextPhase = canAdvance ? phaseOrder[currentIndex + 1] : null;
  const previousPhase = canRevert ? phaseOrder[currentIndex - 1] : null;

  function formatPhaseName(phase: string): string {
    return phase.replace("_", " ");
  }

  async function handleAdvance() {
    if (!canAdvance) return;

    startTransition(async () => {
      const result = await advanceFestivalPhase(festivalId);
      if (result && "error" in result && result.error) {
        setError(result.error);
      } else {
        setError(null);
        router.refresh();
      }
      setDialogAction(null);
    });
  }

  async function handleRevert() {
    if (!canRevert) return;

    startTransition(async () => {
      const result = await revertFestivalPhase(festivalId);
      if (result && "error" in result && result.error) {
        setError(result.error);
      } else {
        setError(null);
        router.refresh();
      }
      setDialogAction(null);
    });
  }

  return (
    <div className="space-y-3">
      {error && (
        <div
          className="rounded-md p-3 text-sm"
          style={{ backgroundColor: "var(--destructive)/10", color: "var(--destructive)" }}
        >
          {error}
        </div>
      )}
      <div className="flex gap-2">
        {canRevert && previousPhase && (
          <Button
            onClick={() => setDialogAction("revert")}
            disabled={isPending}
            variant="outline"
            className="flex-1"
          >
            {isPending && dialogAction === "revert"
              ? "Reverting..."
              : `Go Back to ${formatPhaseName(previousPhase)}`}
          </Button>
        )}
        {canAdvance && nextPhase && (
          <Button
            onClick={() => setDialogAction("advance")}
            disabled={isPending}
            className="flex-1"
          >
            {isPending && dialogAction === "advance"
              ? "Advancing..."
              : `Advance to ${formatPhaseName(nextPhase)}`}
          </Button>
        )}
      </div>
      {!canAdvance && !canRevert && (
        <p className="text-sm text-[var(--text-muted)] text-center">
          Festival is at the final phase.
        </p>
      )}

      {/* Advance Phase Confirmation */}
      <ConfirmationDialog
        open={dialogAction === "advance"}
        onOpenChange={(open) => !open && setDialogAction(null)}
        title={`Advance to ${nextPhase ? formatPhaseName(nextPhase) : "Next"} Phase?`}
        description={`Are you sure you want to advance the festival to the ${nextPhase ? formatPhaseName(nextPhase) : "next"} phase? Members will be notified of this change.`}
        confirmText="Advance Phase"
        onConfirm={handleAdvance}
        variant="default"
        isLoading={isPending}
      />

      {/* Revert Phase Confirmation */}
      <ConfirmationDialog
        open={dialogAction === "revert"}
        onOpenChange={(open) => !open && setDialogAction(null)}
        title={`Go Back to ${previousPhase ? formatPhaseName(previousPhase) : "Previous"} Phase?`}
        description={
          <span>
            Are you sure you want to revert to the{" "}
            <strong>{previousPhase ? formatPhaseName(previousPhase) : "previous"}</strong> phase?
            This may affect member progress and cannot be easily undone.
          </span>
        }
        confirmText="Revert Phase"
        onConfirm={handleRevert}
        variant="danger"
        isLoading={isPending}
      />
    </div>
  );
}
