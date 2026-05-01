"use client";

import { ResponsiveDialog, ResponsiveDialogContent } from "@/components/ui/responsive-dialog";
import { UserPopupBody } from "./UserPopupBody";

interface UserPopupModalProps {
  userId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function UserPopupModal({ userId, open, onOpenChange }: UserPopupModalProps) {
  return (
    <ResponsiveDialog open={open} onOpenChange={onOpenChange}>
      <ResponsiveDialogContent
        variant="dialog"
        className="w-full sm:max-w-[340px] p-0 bg-transparent border-none shadow-none gap-0"
        hideClose
      >
        <UserPopupBody userId={userId} open={open} onClose={() => onOpenChange(false)} />
      </ResponsiveDialogContent>
    </ResponsiveDialog>
  );
}
