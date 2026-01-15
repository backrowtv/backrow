"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { FestivalWizard } from "./FestivalWizard";
import { Plus } from "@phosphor-icons/react";
import { Database } from "@/types/database";
import type { DefaultPhaseDuration } from "@/types/club-settings";

type Season = Database["public"]["Tables"]["seasons"]["Row"];
type Theme = Database["public"]["Tables"]["theme_pool"]["Row"];

interface CreateFestivalModalProps {
  seasons: Season[];
  themes: Theme[];
  clubId: string;
  trigger?: React.ReactNode;
  disabled?: boolean;
  disabledMessage?: string;
  variant?: "default" | "subtle";
  /** Club-level defaults to pre-populate the festival wizard */
  clubSettings?: {
    default_nomination_duration?: DefaultPhaseDuration;
    default_watch_rate_duration?: DefaultPhaseDuration;
    theme_governance?: "democracy" | "random" | "autocracy";
    themes_enabled?: boolean;
    rubric_enforcement?: "off" | "suggested" | "required";
    nomination_guessing_enabled?: boolean;
  };
}

export function CreateFestivalModal({
  seasons,
  themes,
  clubId,
  trigger,
  disabled = false,
  disabledMessage,
  variant = "default",
  clubSettings,
}: CreateFestivalModalProps) {
  const [open, setOpen] = useState(false);

  const defaultTrigger =
    variant === "subtle" ? (
      <Button
        variant="ghost"
        size="sm"
        disabled={disabled}
        title={disabled ? disabledMessage : undefined}
        className="h-6 px-2 text-[10px] text-[var(--text-muted)] hover:text-[var(--text-primary)]"
      >
        <Plus className="h-3 w-3 mr-1" />
        Festival
      </Button>
    ) : (
      <Button
        variant="club-accent"
        size="lg"
        disabled={disabled}
        title={disabled ? disabledMessage : undefined}
      >
        <Plus className="h-4 w-4 mr-2" />
        Start Festival
      </Button>
    );

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{trigger || defaultTrigger}</DialogTrigger>
      <DialogContent className="sm:max-w-lg max-h-[90dvh] overflow-x-hidden overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Create New Festival</DialogTitle>
        </DialogHeader>
        <FestivalWizard
          seasons={seasons}
          themes={themes}
          clubId={clubId}
          onSuccess={() => setOpen(false)}
          clubSettings={clubSettings}
        />
      </DialogContent>
    </Dialog>
  );
}
