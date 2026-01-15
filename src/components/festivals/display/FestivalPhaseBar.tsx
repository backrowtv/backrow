"use client";

import { useState, useTransition } from "react";
import { motion } from "framer-motion";
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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  CaretRight,
  Sparkle,
  FilmReel,
  Star,
  Trophy,
  DotsThree,
  CircleNotch,
  SkipForward,
  ArrowBendUpLeft,
  PencilSimple,
} from "@phosphor-icons/react";
import { advanceFestivalPhase, revertFestivalPhase } from "@/app/actions/festivals";
import toast from "react-hot-toast";
import { cn } from "@/lib/utils";
import type { FestivalPhase } from "@/types/festival";

interface FestivalPhaseBarProps {
  festivalId: string;
  currentPhase: FestivalPhase;
  hasTheme: boolean;
  nominationCount: number;
  isEndless?: boolean;
  isAdmin?: boolean;
  compact?: boolean;
  ratingsEnabled?: boolean;
  onPhaseChange?: () => void;
  onEditClick?: () => void;
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
    { key: "nomination", label: "Nomination", shortLabel: "Nomination", icon: FilmReel },
    {
      key: "watch_rate",
      label: ratingsEnabled ? "Watch & Rate" : "Watch",
      shortLabel: "Watch",
      icon: Star,
    },
    { key: "results", label: "Results", shortLabel: "Results", icon: Trophy },
  ];
}

export function FestivalPhaseBar({
  festivalId,
  currentPhase,
  hasTheme,
  nominationCount,
  isEndless: _isEndless = false,
  isAdmin = false,
  compact = false,
  ratingsEnabled = true,
  onPhaseChange,
  onEditClick,
}: FestivalPhaseBarProps) {
  const [isPending, startTransition] = useTransition();
  const [showAdvanceDialog, setShowAdvanceDialog] = useState(false);
  const [showRevertDialog, setShowRevertDialog] = useState(false);

  // Get phases with dynamic labels based on ratings setting
  const PHASES = getPhases(ratingsEnabled);
  const currentIndex = PHASES.findIndex((p) => p.key === currentPhase);
  const canAdvance = currentIndex < PHASES.length - 1;
  const canRevert = currentIndex > 0;

  // Check requirements for advancing
  const getAdvanceBlockers = (): string[] => {
    const blockers: string[] = [];
    if (currentPhase === "theme_selection" && !hasTheme) {
      blockers.push("Select a theme first");
    }
    if (currentPhase === "nomination" && nominationCount === 0) {
      blockers.push("Need at least one nomination");
    }
    return blockers;
  };

  const advanceBlockers = getAdvanceBlockers();
  const canAdvanceNow = canAdvance && advanceBlockers.length === 0;

  const handleAdvance = async () => {
    startTransition(async () => {
      const result = await advanceFestivalPhase(festivalId);
      if ("error" in result && result.error) {
        toast.error(result.error);
      } else {
        toast.success("Phase advanced!");
        onPhaseChange?.();
      }
      setShowAdvanceDialog(false);
    });
  };

  const handleRevert = async () => {
    startTransition(async () => {
      const result = await revertFestivalPhase(festivalId);
      if ("error" in result && result.error) {
        toast.error(result.error);
      } else {
        toast.success("Phase reverted");
        onPhaseChange?.();
      }
      setShowRevertDialog(false);
    });
  };

  const nextPhase = canAdvance ? PHASES[currentIndex + 1] : null;
  const prevPhase = canRevert ? PHASES[currentIndex - 1] : null;

  return (
    <div className="w-full">
      {/* Phase Progress Bar */}
      <div className="flex items-center gap-1">
        {PHASES.map((phase, index) => {
          const Icon = phase.icon;
          const isCurrent = index === currentIndex;
          const isPast = index < currentIndex;
          const _isFuture = index > currentIndex;

          return (
            <div key={phase.key} className="flex items-center flex-1">
              <motion.div
                className={cn(
                  "flex items-center gap-1.5 px-2 py-1 rounded-full flex-1",
                  compact ? "justify-center" : "justify-start"
                )}
                style={{
                  backgroundColor: isCurrent
                    ? "var(--primary)"
                    : isPast
                      ? "var(--surface-2)"
                      : "transparent",
                }}
                initial={false}
                animate={isCurrent ? { scale: 1 } : { scale: 1 }}
                transition={{ duration: 0.2, ease: "easeOut" }}
              >
                <Icon
                  className={cn("shrink-0 transition-colors", compact ? "w-3.5 h-3.5" : "w-4 h-4")}
                  style={{
                    color: isCurrent || isPast ? "var(--text-primary)" : "var(--text-muted)",
                  }}
                />
                {!compact && (
                  <span
                    className="text-xs font-medium truncate"
                    style={{
                      color: isCurrent || isPast ? "var(--text-primary)" : "var(--text-muted)",
                    }}
                  >
                    {phase.shortLabel}
                  </span>
                )}
              </motion.div>

              {index < PHASES.length - 1 && (
                <CaretRight
                  className="w-3 h-3 mx-0.5 shrink-0"
                  style={{
                    color: index < currentIndex ? "var(--text-muted)" : "var(--border)",
                  }}
                />
              )}
            </div>
          );
        })}

        {/* Admin Controls */}
        {isAdmin && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" className="ml-2 h-7 w-7 p-0" disabled={isPending}>
                {isPending ? (
                  <CircleNotch className="w-4 h-4 animate-spin" />
                ) : (
                  <DotsThree className="w-4 h-4" />
                )}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              {/* Advance */}
              {canAdvance && (
                <DropdownMenuItem
                  onClick={() => {
                    if (canAdvanceNow) {
                      setShowAdvanceDialog(true);
                    } else {
                      toast.error(advanceBlockers[0]);
                    }
                  }}
                  disabled={!canAdvanceNow}
                  className="gap-2"
                >
                  <SkipForward className="w-4 h-4" />
                  <span>Advance to {nextPhase?.label}</span>
                </DropdownMenuItem>
              )}

              {/* Revert */}
              {canRevert && (
                <DropdownMenuItem onClick={() => setShowRevertDialog(true)} className="gap-2">
                  <ArrowBendUpLeft className="w-4 h-4" />
                  <span>Revert to {prevPhase?.label}</span>
                </DropdownMenuItem>
              )}

              {(canAdvance || canRevert) && onEditClick && <DropdownMenuSeparator />}

              {/* Edit Festival */}
              {onEditClick && (
                <DropdownMenuItem onClick={onEditClick} className="gap-2">
                  <PencilSimple className="w-4 h-4" />
                  <span>Edit Festival</span>
                </DropdownMenuItem>
              )}

              {/* Blockers Info */}
              {advanceBlockers.length > 0 && canAdvance && (
                <>
                  <DropdownMenuSeparator />
                  <div className="px-2 py-1.5">
                    <p className="text-xs" style={{ color: "var(--text-muted)" }}>
                      To advance: {advanceBlockers[0]}
                    </p>
                  </div>
                </>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>

      {/* Advance Confirmation Dialog */}
      <AlertDialog open={showAdvanceDialog} onOpenChange={setShowAdvanceDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Advance to {nextPhase?.label}?</AlertDialogTitle>
            <AlertDialogDescription>
              This will move the festival to the next phase. Members will be notified of the change.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleAdvance} disabled={isPending}>
              {isPending ? "Advancing..." : "Advance Phase"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Revert Confirmation Dialog */}
      <AlertDialog open={showRevertDialog} onOpenChange={setShowRevertDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Revert to {prevPhase?.label}?</AlertDialogTitle>
            <AlertDialogDescription>
              This will move the festival back to the previous phase. This action can affect member
              submissions.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleRevert} disabled={isPending}>
              {isPending ? "Reverting..." : "Revert Phase"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
