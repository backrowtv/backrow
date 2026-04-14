"use client";

import React, { useState, useTransition, ReactNode } from "react";
import { useRouter } from "next/navigation";
import { updateSeason } from "@/app/actions/seasons";
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
import { CircleNotch } from "@phosphor-icons/react";
import toast from "react-hot-toast";

interface Season {
  id: string;
  name: string;
  subtitle: string | null;
  start_date: string;
  end_date: string;
}

interface EditSeasonModalProps {
  season: Season;
  trigger: ReactNode;
}

export function EditSeasonModal({ season, trigger }: EditSeasonModalProps) {
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  // Format dates for input (YYYY-MM-DD)
  const formatDateForInput = (dateString: string) => {
    if (!dateString) return "";
    const date = new Date(dateString);
    return date.toISOString().split("T")[0];
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);

    const formData = new FormData(e.currentTarget);

    startTransition(async () => {
      try {
        const result = await updateSeason(null, formData);
        if (result && "error" in result && result.error) {
          setError(result.error);
        } else if (result?.success) {
          toast.success("Season updated!");
          setOpen(false);
          router.refresh();
        }
      } catch (err) {
        console.error("Error updating season:", err);
        setError("An unexpected error occurred");
      }
    });
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="max-w-[calc(100vw-2rem)] sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Edit Season</DialogTitle>
          <DialogDescription>Update the season details.</DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <input type="hidden" name="seasonId" value={season.id} />

          {error && (
            <div
              className="p-3 rounded-lg bg-red-500/10 border border-red-500/20 flex items-center gap-1.5"
              role="alert"
            >
              <span aria-hidden="true">⚠</span>
              <p className="text-sm text-red-500">{error}</p>
            </div>
          )}

          <Input
            id="name"
            name="name"
            type="text"
            label="Season Name"
            required
            disabled={isPending}
            defaultValue={season.name}
          />

          <Input
            id="subtitle"
            name="subtitle"
            type="text"
            label="Subtitle (Optional)"
            disabled={isPending}
            defaultValue={season.subtitle || ""}
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
              defaultValue={formatDateForInput(season.start_date)}
            />

            <Input
              id="endDate"
              name="endDate"
              type="date"
              label="End Date"
              required
              disabled={isPending}
              defaultValue={formatDateForInput(season.end_date)}
            />
          </div>

          <p className="text-xs text-[var(--text-muted)]">
            Seasons cannot overlap with other seasons.
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
              Save Changes
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
