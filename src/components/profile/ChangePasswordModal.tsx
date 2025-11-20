"use client";

import { useState, useActionState, useEffect } from "react";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { sendPasswordResetEmail } from "@/app/actions/auth";
import { EnvelopeSimple, ShieldCheck } from "@phosphor-icons/react";
import toast from "react-hot-toast";

interface ChangePasswordModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  userEmail: string;
}

export function ChangePasswordModal({ open, onOpenChange, userEmail }: ChangePasswordModalProps) {
  const [state, formAction, isPending] = useActionState(sendPasswordResetEmail, null);
  const [emailSent, setEmailSent] = useState(false);

  // Reset state when modal opens
  useEffect(() => {
    if (open) {
      setEmailSent(false);
    }
  }, [open]);

  // Handle success
  useEffect(() => {
    if (state && "success" in state && state.success) {
      setEmailSent(true);
      toast.success("Reset link sent to your email");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- Depends on state?.success not the full state object to avoid re-running on unrelated state changes
  }, [state?.success]);

  // Handle errors
  useEffect(() => {
    if (state?.error && open) {
      toast.error(state.error);
    }
  }, [state?.error, open]);

  const handleClose = () => {
    if (!isPending) {
      onOpenChange(false);
    }
  };

  // Mask email for display (show first 2 chars and domain)
  const maskEmail = (email: string) => {
    const [local, domain] = email.split("@");
    if (!local || !domain) return email;
    const masked =
      local.length > 2 ? `${local.slice(0, 2)}${"*".repeat(Math.min(local.length - 2, 6))}` : local;
    return `${masked}@${domain}`;
  };

  return (
    <Modal
      open={open}
      onOpenChange={handleClose}
      title="Reset Your Password"
      description={emailSent ? undefined : "We'll send a secure link to your email"}
      size="md"
    >
      {emailSent ? (
        <div className="space-y-4">
          <div className="flex flex-col items-center text-center py-4">
            <div className="w-12 h-12 rounded-full bg-[var(--success)]/10 flex items-center justify-center mb-4">
              <EnvelopeSimple className="h-6 w-6 text-[var(--success)]" weight="duotone" />
            </div>
            <h3 className="text-lg font-medium text-[var(--text-primary)] mb-2">
              Check your inbox
            </h3>
            <p className="text-sm text-[var(--text-muted)] max-w-xs">
              We sent a password reset link to{" "}
              <span className="font-medium text-[var(--text-secondary)]">
                {maskEmail(userEmail)}
              </span>
            </p>
          </div>

          <div className="rounded-lg bg-[var(--surface-1)] border border-[var(--border)] p-3">
            <p className="text-xs text-[var(--text-muted)]">
              The link expires in 1 hour. If you don&apos;t see the email, check your spam folder.
            </p>
          </div>

          <div className="flex justify-end pt-2">
            <Button variant="secondary" onClick={handleClose}>
              Done
            </Button>
          </div>
        </div>
      ) : (
        <form action={formAction} className="space-y-4">
          <input type="hidden" name="email" value={userEmail} />

          <div className="flex flex-col items-center text-center py-2">
            <div className="w-12 h-12 rounded-full bg-[var(--accent)]/10 flex items-center justify-center mb-4">
              <ShieldCheck className="h-6 w-6 text-[var(--accent)]" weight="duotone" />
            </div>
            <p className="text-sm text-[var(--text-muted)] max-w-xs">
              For security, we&apos;ll send a password reset link to your registered email address.
            </p>
          </div>

          <div className="rounded-lg bg-[var(--surface-1)] border border-[var(--border)] p-3">
            <p className="text-xs text-[var(--text-muted)]">
              A link will be sent to{" "}
              <span className="font-medium text-[var(--text-secondary)]">
                {maskEmail(userEmail)}
              </span>
            </p>
          </div>

          {state && "error" in state && state.error && (
            <div
              className="rounded-md border p-3 text-sm bg-red-500/10 border-red-500/30 flex items-center gap-1.5"
              role="alert"
            >
              <span aria-hidden="true">⚠</span>
              <span className="text-red-500 font-medium">{state.error}</span>
            </div>
          )}

          <div className="flex items-center justify-end gap-3 pt-2">
            <Button type="button" variant="ghost" onClick={handleClose} disabled={isPending}>
              Cancel
            </Button>
            <Button type="submit" isLoading={isPending}>
              Send Reset Link
            </Button>
          </div>
        </form>
      )}
    </Modal>
  );
}
