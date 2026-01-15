"use client";

import React, { useState, useTransition, ReactNode } from "react";
import { useRouter } from "next/navigation";
import { createSeason } from "@/app/actions/seasons";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { CircleNotch, Sparkle } from "@phosphor-icons/react";
import toast from "react-hot-toast";

interface CreateSeasonModalProps {
  clubId: string;
  nextSeasonNumber: number;
  trigger: ReactNode;
}

// Creative season name suggestions (works for any season)
const SEASON_NAME_IDEAS = [
  "The Golden Reel",
  "Midnight Screenings",
  "The Director's Cut",
  "Cinema Paradiso",
  "The Silver Screen",
  "Reel Adventures",
  "Feature Presentation",
  "Opening Credits",
  "The Premiere League",
  "Cult Classics",
  "Hidden Gems",
  "Double Feature",
];

export function CreateSeasonModal({ clubId, nextSeasonNumber, trigger }: CreateSeasonModalProps) {
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  // Get today's date formatted for input
  const today = new Date().toISOString().split("T")[0];

  // Default end date is 3 months from now
  const defaultEndDate = new Date();
  defaultEndDate.setMonth(defaultEndDate.getMonth() + 3);
  const threeMonthsFromNow = defaultEndDate.toISOString().split("T")[0];

  // Random creative suggestion - use useState initializer to avoid purity issues
  // The initializer only runs once on mount, making it safe for React Compiler
  const [randomSuggestion] = useState(
    () => SEASON_NAME_IDEAS[Math.floor(Math.random() * SEASON_NAME_IDEAS.length)]
  );

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);

    const formData = new FormData(e.currentTarget);

    startTransition(async () => {
      try {
        const result = await createSeason(null, formData);
        if (result && "error" in result && result.error) {
          setError(result.error);
        } else if (result?.success) {
          toast.success("Season created!");
          setOpen(false);
          router.refresh();
        }
      } catch (err) {
        console.error("Error creating season:", err);
        setError("An unexpected error occurred");
      }
    });
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="max-w-[calc(100vw-2rem)] sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Create New Season</DialogTitle>
          <DialogDescription>
            Seasons help organize your festivals into time periods. Give it a fun name!
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <input type="hidden" name="clubId" value={clubId} />

          {error && (
            <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20">
              <p className="text-sm text-[var(--destructive)]">{error}</p>
            </div>
          )}

          <div>
            <Input
              id="name"
              name="name"
              type="text"
              label="Season Name"
              required
              disabled={isPending}
              defaultValue={`Season ${nextSeasonNumber}`}
              placeholder="Season 1"
            />
            <div className="flex items-center gap-1.5 mt-1.5 text-xs text-[var(--text-muted)]">
              <Sparkle className="w-3 h-3" />
              <span>Try something creative like &quot;{randomSuggestion}&quot;</span>
            </div>
          </div>

          <Input
            id="subtitle"
            name="subtitle"
            type="text"
            label="Subtitle (Optional)"
            disabled={isPending}
            placeholder="e.g., A Journey Through Sci-Fi"
          />

          <div className="grid grid-cols-2 gap-3">
            <Input
              id="startDate"
              name="startDate"
              type="date"
              label="Start Date"
              required
              disabled={isPending}
              defaultValue={today}
            />

            <Input
              id="endDate"
              name="endDate"
              type="date"
              label="End Date"
              required
              disabled={isPending}
              defaultValue={threeMonthsFromNow}
            />
          </div>

          <p className="text-xs text-[var(--text-muted)]">
            Seasons cannot overlap. The end date must be after the start date.
          </p>

          <DialogFooter>
            <Button
              type="button"
              variant="ghost"
              onClick={() => setOpen(false)}
              disabled={isPending}
            >
              Cancel
            </Button>
            <Button type="submit" variant="primary" disabled={isPending}>
              {isPending && <CircleNotch className="w-4 h-4 mr-2 animate-spin" />}
              Create Season
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
