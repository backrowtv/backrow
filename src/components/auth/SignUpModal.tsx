"use client";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { SignUpFormFields } from "@/components/auth/SignUpFormFields";

interface SignUpModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function SignUpModal({ open, onOpenChange }: SignUpModalProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="!max-w-sm !w-[calc(100%-2rem)] mx-auto max-h-[90dvh] overflow-y-auto overflow-x-hidden rounded-xl !p-0">
        <div className="p-4 sm:p-5 space-y-3">
          <DialogHeader className="text-center space-y-1">
            <DialogTitle className="text-lg font-bold">
              Join{" "}
              <span style={{ fontFamily: "var(--font-brand)" }} className="text-[var(--primary)]">
                BackRow
              </span>
            </DialogTitle>
            <DialogDescription className="text-xs">
              Create an account to start your movie journey
            </DialogDescription>
          </DialogHeader>
          <SignUpFormFields />
        </div>
      </DialogContent>
    </Dialog>
  );
}
