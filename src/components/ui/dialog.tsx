"use client";

/**
 * Dialog is a thin re-export of ResponsiveDialog:
 *   - Desktop (≥640px): behaves as the classic centered Radix Dialog.
 *   - Mobile (<640px): renders as a bottom sheet automatically.
 *
 * Consumers that must force a specific variant can import from
 * `@/components/ui/responsive-dialog` and pass `variant="dialog" | "sheet"`.
 * Simple confirms / small single-input prompts should prefer `alert-dialog.tsx`
 * (kept as centered alert) rather than Dialog to avoid the sheet treatment.
 */
export {
  ResponsiveDialog as Dialog,
  ResponsiveDialogTrigger as DialogTrigger,
  ResponsiveDialogPortal as DialogPortal,
  ResponsiveDialogClose as DialogClose,
  ResponsiveDialogOverlay as DialogOverlay,
  ResponsiveDialogContent as DialogContent,
  ResponsiveDialogHeader as DialogHeader,
  ResponsiveDialogFooter as DialogFooter,
  ResponsiveDialogTitle as DialogTitle,
  ResponsiveDialogDescription as DialogDescription,
} from "./responsive-dialog";
