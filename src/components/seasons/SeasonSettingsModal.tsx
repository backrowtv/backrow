"use client";

import { useState, useEffect, startTransition } from "react";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { updateSeason } from "@/app/actions/seasons";
import { Database } from "@/types/database";
import { useActionState } from "react";
import toast from "react-hot-toast";

type Season = Database["public"]["Tables"]["seasons"]["Row"];

interface SeasonSettingsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  season: Season;
  clubId: string;
}

export function SeasonSettingsModal({
  open,
  onOpenChange,
  season,
  clubId: _clubId,
}: SeasonSettingsModalProps) {
  const [state, formAction, isPending] = useActionState(updateSeason, null);
  const [formData, setFormData] = useState({
    name: season.name,
    subtitle: "",
    startDate: "",
    endDate: "",
  });

  // Format dates for input (YYYY-MM-DD)
  const formatDateForInput = (dateString: string) => {
    if (!dateString) return "";
    const date = new Date(dateString);
    return date.toISOString().split("T")[0];
  };

  // Initialize form data when season changes
  useEffect(() => {
    if (season) {
      startTransition(() => {
        setFormData({
          name: season.name,
          subtitle: (season as { subtitle?: string | null }).subtitle || "",
          startDate: formatDateForInput(season.start_date),
          endDate: formatDateForInput(season.end_date),
        });
      });
    }
  }, [season]);

  // Handle success/error
  useEffect(() => {
    if (state && "success" in state && state.success) {
      toast.success("Season updated successfully");
      onOpenChange(false);
    }
    if (state && "error" in state && state.error) {
      toast.error(state.error);
    }
  }, [state, onOpenChange]);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formDataObj = new FormData();
    formDataObj.append("seasonId", season.id);
    formDataObj.append("name", formData.name);
    formDataObj.append("subtitle", formData.subtitle);
    formDataObj.append("startDate", formData.startDate);
    formDataObj.append("endDate", formData.endDate);

    formAction(formDataObj);
  };

  return (
    <Modal
      open={open}
      onOpenChange={onOpenChange}
      title={`Season ${season.name} Settings`}
      description="Edit Current Season"
      size="md"
    >
      <form onSubmit={handleSubmit} className="space-y-6">
        <div>
          <Input
            label="Name"
            type="text"
            required
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            disabled={isPending}
            placeholder="Spring 2024"
          />
        </div>

        <div>
          <Input
            label="Subtitle"
            type="text"
            value={formData.subtitle}
            onChange={(e) => setFormData({ ...formData, subtitle: e.target.value })}
            disabled={isPending}
            placeholder="Optional subtitle"
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="relative">
            <label
              className="block text-sm font-medium mb-2"
              style={{ color: "var(--text-primary)" }}
            >
              Start Date <span style={{ color: "var(--error)" }}>*</span>
            </label>
            <div className="relative">
              <svg
                className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 pointer-events-none"
                style={{ color: "var(--text-muted)" }}
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                />
              </svg>
              <Input
                type="date"
                required
                value={formData.startDate}
                onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                disabled={isPending}
                className="pl-10"
              />
            </div>
          </div>

          <div className="relative">
            <label
              className="block text-sm font-medium mb-2"
              style={{ color: "var(--text-primary)" }}
            >
              End Date <span style={{ color: "var(--error)" }}>*</span>
            </label>
            <div className="relative">
              <svg
                className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 pointer-events-none"
                style={{ color: "var(--text-muted)" }}
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                />
              </svg>
              <Input
                type="date"
                required
                value={formData.endDate}
                onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
                disabled={isPending}
                className="pl-10"
              />
            </div>
          </div>
        </div>

        <p className="text-xs flex items-start gap-2" style={{ color: "var(--text-muted)" }}>
          <svg
            className="w-4 h-4 mt-0.5 flex-shrink-0"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
          Seasons automatically roll over at midnight EST on the end date
        </p>

        <div
          className="flex items-center justify-end gap-3 pt-4 border-t"
          style={{ borderColor: "var(--border)" }}
        >
          <Button
            type="button"
            variant="secondary"
            onClick={() => onOpenChange(false)}
            disabled={isPending}
          >
            Cancel
          </Button>
          <Button type="submit" variant="primary" isLoading={isPending}>
            Save
          </Button>
        </div>
      </form>
    </Modal>
  );
}
