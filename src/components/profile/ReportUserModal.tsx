"use client";

import { useState, useTransition } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Text } from "@/components/ui/typography";
import { reportUser } from "@/app/actions/profile";
import { Flag, CircleNotch } from "@phosphor-icons/react";
import toast from "react-hot-toast";

interface ReportUserModalProps {
  userId: string;
  userName: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const REPORT_REASONS = [
  { value: "harassment", label: "Harassment or bullying" },
  { value: "spam", label: "Spam or misleading content" },
  { value: "inappropriate", label: "Inappropriate content" },
  { value: "impersonation", label: "Impersonation" },
  { value: "other", label: "Other" },
];

export function ReportUserModal({ userId, userName, open, onOpenChange }: ReportUserModalProps) {
  const [reason, setReason] = useState("");
  const [details, setDetails] = useState("");
  const [isPending, startTransition] = useTransition();

  const handleSubmit = () => {
    if (!reason) {
      toast.error("Please select a reason for the report");
      return;
    }

    startTransition(async () => {
      const result = await reportUser(userId, reason, details);
      if (result.success) {
        toast.success("Report submitted. Thank you for helping keep BackRow safe.");
        onOpenChange(false);
        setReason("");
        setDetails("");
      } else if ("error" in result && result.error) {
        toast.error(result.error);
      }
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[calc(100vw-2rem)] sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Flag className="h-5 w-5 text-red-500" />
            Report User
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <Text size="sm" muted>
            You are reporting{" "}
            <span className="font-medium text-[var(--text-primary)]">{userName}</span>. Please
            select a reason and provide any additional details.
          </Text>

          {/* Reason Selection */}
          <div className="space-y-2">
            <Label className="text-sm font-medium">Reason for report</Label>
            <div className="space-y-2">
              {REPORT_REASONS.map((option) => (
                <label
                  key={option.value}
                  className={`flex items-center p-3 rounded-lg border cursor-pointer transition-colors ${
                    reason === option.value
                      ? "border-[var(--primary)] bg-[var(--primary)]/5"
                      : "border-[var(--border)] hover:border-[var(--border-hover)]"
                  }`}
                >
                  <input
                    type="radio"
                    name="report-reason"
                    value={option.value}
                    checked={reason === option.value}
                    onChange={(e) => setReason(e.target.value)}
                    className="sr-only"
                  />
                  <div
                    className={`w-4 h-4 rounded-full border-2 mr-3 flex items-center justify-center ${
                      reason === option.value ? "border-[var(--primary)]" : "border-[var(--border)]"
                    }`}
                  >
                    {reason === option.value && (
                      <div className="w-2 h-2 rounded-full bg-[var(--primary)]" />
                    )}
                  </div>
                  <Text size="sm">{option.label}</Text>
                </label>
              ))}
            </div>
          </div>

          {/* Additional Details */}
          <div className="space-y-2">
            <Label htmlFor="details" className="text-sm font-medium">
              Additional details (optional)
            </Label>
            <Textarea
              id="details"
              placeholder="Please provide any additional context that might help us investigate..."
              value={details}
              onChange={(e) => setDetails(e.target.value)}
              rows={3}
              className="resize-none"
            />
          </div>
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isPending}>
            Cancel
          </Button>
          <Button variant="danger" onClick={handleSubmit} disabled={isPending || !reason}>
            {isPending ? (
              <>
                <CircleNotch className="h-4 w-4 animate-spin mr-2" />
                Submitting...
              </>
            ) : (
              "Submit Report"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
