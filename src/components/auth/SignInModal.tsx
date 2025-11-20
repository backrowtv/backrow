"use client";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { SignInForm } from "@/app/(auth)/sign-in/SignInForm";

interface SignInModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function SignInModal({ open, onOpenChange }: SignInModalProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="!max-w-[340px] !w-[calc(100%-2rem)] mx-auto max-h-[90dvh] overflow-y-auto overflow-x-hidden rounded-xl !p-0 !gap-0">
        <div className="px-4 pt-8 pb-4 sm:px-5 sm:pb-5">
          <DialogHeader className="text-center space-y-1 mb-3">
            <DialogTitle className="text-base font-bold">
              Welcome back to{" "}
              <span style={{ fontFamily: "var(--font-brand)" }} className="text-[var(--primary)]">
                BackRow
              </span>
            </DialogTitle>
            <DialogDescription className="text-xs">
              Sign in to continue your movie journey
            </DialogDescription>
          </DialogHeader>
          <SignInForm hideSignUpLink noCard />
        </div>
      </DialogContent>
    </Dialog>
  );
}
