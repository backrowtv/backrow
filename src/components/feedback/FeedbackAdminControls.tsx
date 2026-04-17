"use client";

import { useState } from "react";
import { CaretDown, Check } from "@phosphor-icons/react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import type { FeedbackStatus } from "@/app/actions/feedback.types";

const STATUS_OPTIONS: { value: FeedbackStatus; label: string }[] = [
  { value: "open", label: "Open" },
  { value: "in_progress", label: "In Progress" },
  { value: "resolved", label: "Resolved" },
  { value: "closed", label: "Closed" },
  { value: "wont_fix", label: "Won't Fix" },
];

interface FeedbackAdminControlsProps {
  currentStatus: FeedbackStatus;
  currentResponse: string | null;
  onUpdate: (status: FeedbackStatus, adminResponse?: string) => void;
}

export function FeedbackAdminControls({
  currentStatus,
  currentResponse,
  onUpdate,
}: FeedbackAdminControlsProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [selectedStatus, setSelectedStatus] = useState<FeedbackStatus>(currentStatus);
  const [response, setResponse] = useState(currentResponse || "");
  const [isUpdating, setIsUpdating] = useState(false);

  const hasChanges = selectedStatus !== currentStatus || response !== (currentResponse || "");

  const handleSave = async () => {
    if (!hasChanges) return;

    setIsUpdating(true);
    try {
      await onUpdate(selectedStatus, response || undefined);
      setIsExpanded(false);
    } finally {
      setIsUpdating(false);
    }
  };

  return (
    <div className="mt-3 pt-3 border-t" style={{ borderColor: "var(--border)" }}>
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="flex items-center gap-1.5 text-xs font-medium text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors"
      >
        <CaretDown className={cn("w-3.5 h-3.5 transition-transform", isExpanded && "rotate-180")} />
        Admin Controls
      </button>

      {isExpanded && (
        <div className="mt-3 space-y-3">
          {/* Status dropdown */}
          <div>
            <span className="text-xs font-medium text-[var(--text-secondary)] block mb-1.5">
              Status
            </span>
            <div className="flex flex-wrap gap-1.5">
              {STATUS_OPTIONS.map((option) => (
                <button
                  key={option.value}
                  onClick={() => setSelectedStatus(option.value)}
                  className={cn(
                    "px-2.5 py-1 text-xs rounded-md transition-colors border",
                    selectedStatus === option.value
                      ? "border-[var(--primary)] bg-[var(--surface-3)] text-[var(--text-primary)] ring-1 ring-[var(--primary)] shadow-sm"
                      : "border-[var(--border)] text-[var(--text-secondary)] hover:border-[var(--text-muted)]"
                  )}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </div>

          {/* Admin response textarea */}
          <div>
            <label
              htmlFor="feedback-admin-response"
              className="text-xs font-medium text-[var(--text-secondary)] block mb-1.5"
            >
              Admin Response (optional)
            </label>
            <textarea
              id="feedback-admin-response"
              value={response}
              onChange={(e) => setResponse(e.target.value)}
              placeholder="Add a response to the user..."
              rows={2}
              className="w-full text-sm rounded-md px-3 py-2 border transition-colors resize-none focus:outline-none focus:border-[var(--primary)]"
              style={{
                borderColor: "var(--border)",
                backgroundColor: "var(--surface-0)",
                color: "var(--text-primary)",
              }}
            />
          </div>

          {/* Save button */}
          <div className="flex justify-end">
            <Button
              onClick={handleSave}
              disabled={!hasChanges || isUpdating}
              size="sm"
              className="gap-1.5"
            >
              <Check className="w-3.5 h-3.5" />
              {isUpdating ? "Saving..." : "Save Changes"}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
