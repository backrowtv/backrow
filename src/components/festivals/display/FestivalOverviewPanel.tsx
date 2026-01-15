"use client";

import { useState, useTransition, useRef } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { ConfirmationDialog } from "@/components/ui/confirmation-dialog";
import { Trash, CircleNotch, Camera, Trophy, CaretDown, CaretUp } from "@phosphor-icons/react";
import { uploadFestivalPoster, removeFestivalPoster } from "@/app/actions/admin-festival";
import toast from "react-hot-toast";
import { DateDisplay } from "@/components/ui/date-display";

type FestivalPhase = "theme_selection" | "nomination" | "watch_rate" | "results";

interface FestivalOverviewPanelProps {
  festivalId: string;
  posterUrl: string | null;
  theme: string | null;
  themeSubmitter: { name: string; id: string } | null;
  themeSelector: { name: string; id: string } | null;
  themeSource: "pool" | "custom" | "random" | null;
  createdAt: string;
  startDate: string;
  participantCount: number;
  nominationCount: number;
  season: { name: string; number: number } | null;
  isAdmin: boolean;
  nominationDeadline?: string | null;
  ratingDeadline?: string | null;
  currentPhase?: FestivalPhase;
  onDetailsToggle?: (isOpen: boolean) => void;
}

export function FestivalOverviewPanel({
  festivalId,
  posterUrl,
  theme,
  themeSubmitter,
  themeSource,
  participantCount,
  nominationCount,
  season,
  isAdmin,
  nominationDeadline,
  ratingDeadline,
  currentPhase,
  onDetailsToggle,
}: FestivalOverviewPanelProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [showRemovePosterConfirm, setShowRemovePosterConfirm] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handlePosterUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const formData = new FormData();
    formData.append("poster", file);

    startTransition(async () => {
      const result = await uploadFestivalPoster(festivalId, formData);
      if ("error" in result) {
        toast.error(result.error);
      } else {
        toast.success("Poster uploaded successfully");
        router.refresh();
      }

      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    });
  };

  const handleRemovePoster = () => {
    startTransition(async () => {
      const result = await removeFestivalPoster(festivalId);
      if ("error" in result) {
        toast.error(result.error);
      } else {
        toast.success("Poster removed");
        setShowRemovePosterConfirm(false);
        router.refresh();
      }
    });
  };

  const _getThemeSourceLabel = () => {
    switch (themeSource) {
      case "pool":
        return "from pool";
      case "custom":
        return "custom";
      case "random":
        return "random";
      default:
        return null;
    }
  };

  // Get the relevant deadline based on phase
  const getDeadlineInfo = () => {
    if (currentPhase === "nomination" && nominationDeadline) {
      return { label: "Nominations close", date: nominationDeadline };
    }
    if (currentPhase === "watch_rate" && ratingDeadline) {
      return { label: "Ratings due", date: ratingDeadline };
    }
    return null;
  };

  const deadlineInfo = getDeadlineInfo();

  const [isDetailsOpen, setIsDetailsOpen] = useState(false);

  const handleDetailsToggle = (open: boolean) => {
    setIsDetailsOpen(open);
    onDetailsToggle?.(open);
  };

  return (
    <Card variant="default" className="h-full">
      <CardContent className="p-4 space-y-3 pb-2">
        {/* Theme Title — above poster */}
        <div className="text-center">
          <h2 className="text-lg font-bold text-[var(--text-primary)]">
            {theme || "Untitled Festival"}
          </h2>
        </div>

        {/* Poster - centered, larger */}
        <div className="flex justify-center">
          <div className="relative group">
            <div className="relative w-40 aspect-[2/3] bg-[var(--surface-2)] rounded-lg overflow-hidden border border-[var(--border)] shadow-md">
              {posterUrl ? (
                <>
                  <Image
                    src={posterUrl}
                    alt="Festival Poster"
                    fill
                    className="object-cover"
                    sizes="160px"
                  />
                  {isAdmin && (
                    <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                      <input
                        ref={fileInputRef}
                        type="file"
                        accept="image/jpeg,image/jpg,image/png,image/gif,image/webp"
                        onChange={handlePosterUpload}
                        className="hidden"
                      />
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => fileInputRef.current?.click()}
                        disabled={isPending}
                        className="h-8 w-8 p-0"
                      >
                        {isPending ? (
                          <CircleNotch className="w-4 h-4 animate-spin text-white" />
                        ) : (
                          <Camera className="w-4 h-4 text-white" />
                        )}
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setShowRemovePosterConfirm(true)}
                        disabled={isPending}
                        className="h-8 w-8 p-0 hover:text-red-400"
                      >
                        <Trash className="w-4 h-4 text-white" />
                      </Button>
                    </div>
                  )}
                </>
              ) : (
                <div className="absolute inset-0 flex flex-col items-center justify-center bg-gradient-to-b from-[var(--primary)]/15 via-[var(--surface-2)] to-[var(--primary)]/25">
                  {/* Decorative poster frame */}
                  <div className="absolute inset-1.5 border border-[var(--primary)]/20 rounded pointer-events-none" />
                  <div className="absolute inset-3 border border-[var(--primary)]/10 rounded-sm pointer-events-none" />
                  {/* Theme name as poster title */}
                  <span
                    className="text-center text-sm font-bold leading-tight text-[var(--text-primary)] px-3 line-clamp-4"
                    style={{ fontFamily: "var(--font-heading)" }}
                  >
                    {theme || "Untitled Festival"}
                  </span>
                  {/* Admin upload overlay on hover */}
                  {isAdmin && (
                    <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center rounded-lg">
                      <input
                        ref={fileInputRef}
                        type="file"
                        accept="image/jpeg,image/jpg,image/png,image/gif,image/webp"
                        onChange={handlePosterUpload}
                        className="hidden"
                      />
                      <button
                        onClick={() => fileInputRef.current?.click()}
                        disabled={isPending}
                        className="text-xs text-white opacity-80 hover:opacity-100"
                      >
                        {isPending ? "..." : "+ Add Poster"}
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </CardContent>

      {/* Collapsible details below poster */}
      <Collapsible open={isDetailsOpen} onOpenChange={handleDetailsToggle}>
        <CollapsibleTrigger asChild>
          <div className="flex items-center justify-center gap-1.5 py-1 cursor-pointer hover:bg-[var(--surface-2)] transition-colors border-t border-[var(--border)]">
            <span className="text-[10px] font-medium uppercase tracking-wider text-[var(--text-muted)]">
              {isDetailsOpen ? "Hide" : "Show"} Details
            </span>
            {isDetailsOpen ? (
              <CaretUp className="w-3 h-3 text-[var(--text-muted)]" />
            ) : (
              <CaretDown className="w-3 h-3 text-[var(--text-muted)]" />
            )}
          </div>
        </CollapsibleTrigger>

        <CollapsibleContent>
          <CardContent className="pt-0 pb-4">
            <div className="text-center space-y-1.5 text-sm text-[var(--text-muted)]">
              {themeSubmitter && (
                <p className="text-[var(--text-secondary)]">
                  Submitted by{" "}
                  <span className="font-medium text-[var(--text-primary)]">
                    {themeSubmitter.name}
                  </span>
                </p>
              )}
              <p>
                {participantCount} participant{participantCount !== 1 ? "s" : ""} ·{" "}
                {nominationCount} movie{nominationCount !== 1 ? "s" : ""}
              </p>

              {deadlineInfo && (
                <p>
                  {deadlineInfo.label}:{" "}
                  <span className="text-[var(--text-primary)]">
                    <DateDisplay date={deadlineInfo.date} format="date" />
                  </span>
                </p>
              )}

              {season && (
                <p className="flex items-center justify-center gap-1">
                  <Trophy className="w-3.5 h-3.5 text-[var(--warning)]" />
                  {season.name} (Season {season.number})
                </p>
              )}
            </div>
          </CardContent>
        </CollapsibleContent>
      </Collapsible>

      <ConfirmationDialog
        open={showRemovePosterConfirm}
        onOpenChange={setShowRemovePosterConfirm}
        title="Remove Festival Poster?"
        description="Are you sure you want to remove the festival poster? This action cannot be undone."
        confirmText="Remove Poster"
        onConfirm={handleRemovePoster}
        variant="danger"
        isLoading={isPending}
      />
    </Card>
  );
}
