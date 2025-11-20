"use client";

import { useState } from "react";
import { Envelope, CircleNotch } from "@phosphor-icons/react";
import { Button } from "@/components/ui/button";
import toast from "react-hot-toast";

export function DataExportImport() {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [cooldownUntil, setCooldownUntil] = useState<number | null>(null);

  const onCooldown = cooldownUntil !== null && Date.now() < cooldownUntil;

  async function handleExport() {
    if (onCooldown) return;
    setIsSubmitting(true);
    try {
      const response = await fetch("/api/account/export", { method: "POST" });
      const payload = (await response.json().catch(() => ({}))) as {
        success?: boolean;
        error?: string;
      };
      if (!response.ok || !payload.success) {
        toast.error(payload.error ?? "Could not start your export. Please try again.");
        return;
      }
      toast.success("We're building your export. Check your email in a few minutes.");
      setCooldownUntil(Date.now() + 60_000);
    } catch {
      toast.error("Could not start your export. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h3 className="text-sm font-medium text-[var(--text-primary)] mb-1">Export Your Data</h3>
        <p className="text-xs text-[var(--text-muted)]">
          We'll build a ZIP of your profile, ratings, nominations, discussions, and notifications
          and email you a private download link. The link is valid for 7 days.
        </p>
      </div>
      <Button
        variant="outline"
        size="sm"
        onClick={handleExport}
        disabled={isSubmitting || onCooldown}
        className="w-fit"
      >
        {isSubmitting ? (
          <CircleNotch className="w-4 h-4 mr-2 animate-spin" />
        ) : (
          <Envelope className="w-4 h-4 mr-2" />
        )}
        {isSubmitting
          ? "Requesting export..."
          : onCooldown
            ? "Check your email"
            : "Email me my data"}
      </Button>
    </div>
  );
}
