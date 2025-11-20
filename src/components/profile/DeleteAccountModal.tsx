"use client";

import { useState, useTransition } from "react";
import { Modal } from "@/components/ui/modal";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { deleteAccount } from "@/app/actions/auth";
import toast from "react-hot-toast";

interface DeleteAccountModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  userEmail: string;
}

export function DeleteAccountModal({
  open,
  onOpenChange,
  userEmail: _userEmail,
}: DeleteAccountModalProps) {
  const [confirmationText, setConfirmationText] = useState("");
  const [isPending, startTransition] = useTransition();

  const requiredText = "DELETE";
  const isConfirmed = confirmationText === requiredText;

  const handleDelete = () => {
    if (!isConfirmed) {
      toast.error(`Please type "${requiredText}" to confirm`);
      return;
    }

    startTransition(async () => {
      const result = await deleteAccount();

      if (result && "error" in result && result.error) {
        toast.error(result.error);
      } else {
        // Account deletion will redirect, so we don't need to handle success here
        toast.success("Account deleted successfully");
      }
    });
  };

  const handleClose = () => {
    if (!isPending) {
      setConfirmationText("");
      onOpenChange(false);
    }
  };

  return (
    <Modal
      open={open}
      onOpenChange={handleClose}
      title="Delete Account"
      description="This action cannot be undone. This will permanently delete your account and remove all your data."
      size="md"
    >
      <div className="space-y-6">
        {/* Warning Message */}
        <div className="rounded-md border p-4 bg-[var(--error)]/10 border-[var(--error)]/30">
          <div className="flex items-start gap-3">
            <svg
              className="h-5 w-5 mt-0.5 flex-shrink-0 text-[var(--error)]"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
              />
            </svg>
            <div className="flex-1">
              <h3
                className="text-sm font-semibold mb-1"
                style={{ color: "var(--error)", opacity: 1 }}
              >
                Warning: This action is permanent
              </h3>
              <p className="text-sm" style={{ color: "var(--error)", opacity: 1 }}>
                Deleting your account will permanently remove:
              </p>
              <ul
                className="mt-2 text-sm list-disc list-inside space-y-1"
                style={{ color: "var(--error)", opacity: 1 }}
              >
                <li>All your profile information</li>
                <li>Your club memberships</li>
                <li>Your ratings and reviews</li>
                <li>Your nominations and guesses</li>
                <li>All other associated data</li>
              </ul>
            </div>
          </div>
        </div>

        {/* Restrictions */}
        <div className="rounded-md border p-4 bg-[var(--warning)]/10 border-[var(--warning)]/30">
          <p className="text-sm font-medium text-[var(--warning)]">
            <strong>Note:</strong> You cannot delete your account if you own any clubs. Please
            transfer ownership or archive your clubs first.
          </p>
        </div>

        {/* Confirmation Input */}
        <div>
          <label
            className="block text-sm font-medium mb-2"
            style={{ color: "var(--text-primary)" }}
          >
            To confirm, type{" "}
            <span className="font-mono font-bold" style={{ color: "var(--error)" }}>
              {requiredText}
            </span>{" "}
            below:
          </label>
          <Input
            type="text"
            value={confirmationText}
            onChange={(e) => setConfirmationText(e.target.value)}
            disabled={isPending}
            placeholder={requiredText}
            className="font-mono"
            autoComplete="off"
          />
        </div>

        {/* Actions */}
        <div
          className="flex items-center justify-end gap-3 pt-4 border-t"
          style={{ borderColor: "var(--border)" }}
        >
          <Button type="button" variant="secondary" onClick={handleClose} disabled={isPending}>
            Cancel
          </Button>
          <Button
            type="button"
            variant="danger"
            onClick={handleDelete}
            disabled={!isConfirmed || isPending}
            isLoading={isPending}
          >
            Delete Account
          </Button>
        </div>
      </div>
    </Modal>
  );
}
