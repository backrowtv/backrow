"use client";

import * as React from "react";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import { X } from "@phosphor-icons/react";
import { cn } from "@/lib/utils";
import { useMediaQuery } from "@/lib/hooks/useMediaQuery";

const ResponsiveDialog = ({
  modal = false,
  ...props
}: React.ComponentPropsWithoutRef<typeof DialogPrimitive.Root>) => (
  <DialogPrimitive.Root modal={modal} {...props} />
);

const ResponsiveDialogTrigger = DialogPrimitive.Trigger;
const ResponsiveDialogClose = DialogPrimitive.Close;
const ResponsiveDialogPortal = DialogPrimitive.Portal;

const ResponsiveDialogOverlay = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Overlay>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Overlay>
>(({ className, ...props }, ref) => (
  <DialogPrimitive.Overlay
    ref={ref}
    className={cn(
      "fixed inset-0 z-[100] bg-black/50 backdrop-blur-sm",
      "data-[state=open]:animate-in data-[state=closed]:animate-out",
      "data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0",
      className
    )}
    {...props}
  />
));
ResponsiveDialogOverlay.displayName = "ResponsiveDialogOverlay";

interface ResponsiveDialogContentProps extends React.ComponentPropsWithoutRef<
  typeof DialogPrimitive.Content
> {
  hideClose?: boolean;
  /** Show drag handle on mobile sheet (default true) */
  showHandle?: boolean;
  /** Max height for mobile sheet (default 92dvh) */
  sheetMaxHeight?: string;
  /** Min height for mobile sheet (default 60dvh) — keeps short content from feeling like a half-open drawer */
  sheetMinHeight?: string;
  /** Force a specific variant regardless of viewport */
  variant?: "auto" | "dialog" | "sheet";
  /** Center relative to main content area (dialog variant only, accounts for sidebar offset) */
  contentAreaCentered?: boolean;
}

const ResponsiveDialogContent = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Content>,
  ResponsiveDialogContentProps
>(
  (
    {
      className,
      children,
      hideClose,
      showHandle = true,
      sheetMaxHeight = "92dvh",
      sheetMinHeight = "60dvh",
      variant = "auto",
      contentAreaCentered,
      ...props
    },
    ref
  ) => {
    const isDesktop = useMediaQuery("(min-width: 640px)");
    const resolvedVariant = variant === "auto" ? (isDesktop ? "dialog" : "sheet") : variant;

    if (resolvedVariant === "sheet") {
      return (
        <ResponsiveDialogPortal>
          <ResponsiveDialogOverlay />
          <DialogPrimitive.Content
            ref={ref}
            className={cn(
              "fixed inset-x-0 bottom-0 z-[100]",
              "bg-[var(--card)]",
              "rounded-t-3xl",
              "border-t border-[var(--border)]",
              "shadow-2xl",
              "flex flex-col",
              "data-[state=open]:animate-in data-[state=closed]:animate-out",
              "data-[state=closed]:slide-out-to-bottom data-[state=open]:slide-in-from-bottom",
              "data-[state=closed]:duration-200 data-[state=open]:duration-300",
              "motion-reduce:animate-none",
              className
            )}
            style={{ maxHeight: sheetMaxHeight, minHeight: sheetMinHeight }}
            {...props}
          >
            {showHandle && (
              <div className="flex justify-center pt-3 pb-1 flex-shrink-0">
                <div className="w-10 h-1 rounded-full bg-[var(--border)]" />
              </div>
            )}
            <div
              className="overflow-y-auto flex-1"
              style={{
                paddingBottom: "env(safe-area-inset-bottom, 0px)",
              }}
            >
              {children}
            </div>
            {!hideClose && (
              <DialogPrimitive.Close
                className="absolute right-3 top-3 rounded-full bg-black/40 backdrop-blur-sm p-1.5 text-white hover:bg-black/60 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)]"
                aria-label="Close"
              >
                <X className="h-4 w-4" weight="bold" />
                <span className="sr-only">Close</span>
              </DialogPrimitive.Close>
            )}
          </DialogPrimitive.Content>
        </ResponsiveDialogPortal>
      );
    }

    return (
      <ResponsiveDialogPortal>
        <ResponsiveDialogOverlay />
        <div
          className={cn(
            "fixed inset-0 z-[100] flex items-center justify-center overflow-y-auto overscroll-contain p-4",
            contentAreaCentered && "lg:pl-[var(--content-left-offset,0px)]"
          )}
          style={{ WebkitOverflowScrolling: "touch" }}
        >
          <DialogPrimitive.Content
            ref={ref}
            className={cn(
              "relative z-[100] grid w-full max-w-[calc(100vw-2rem)] sm:max-w-lg gap-4",
              "max-h-[calc(100svh-2rem)] overflow-y-auto",
              "border border-[var(--border)] bg-[var(--card)]",
              "p-4 sm:p-5 shadow-[var(--shadow-xl)]",
              "data-[state=open]:animate-in data-[state=closed]:animate-out",
              "data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0",
              "data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95",
              "motion-reduce:animate-none",
              "rounded-xl",
              className
            )}
            {...props}
          >
            {children}
            {!hideClose && (
              <DialogPrimitive.Close
                className="absolute right-2 top-2 rounded-md p-0.5 text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--surface-2)] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)]"
                aria-label="Close"
              >
                <X className="h-3.5 w-3.5" weight="bold" />
                <span className="sr-only">Close</span>
              </DialogPrimitive.Close>
            )}
          </DialogPrimitive.Content>
        </div>
      </ResponsiveDialogPortal>
    );
  }
);
ResponsiveDialogContent.displayName = "ResponsiveDialogContent";

const ResponsiveDialogHeader = ({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
  <div
    className={cn(
      "flex flex-col space-y-1.5 text-center sm:text-left px-4 sm:px-0 pt-2 sm:pt-0",
      className
    )}
    {...props}
  />
);
ResponsiveDialogHeader.displayName = "ResponsiveDialogHeader";

const ResponsiveDialogFooter = ({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
  <div
    className={cn(
      "flex flex-col-reverse gap-2 sm:flex-row sm:justify-end pt-2 px-4 sm:px-0 pb-4 sm:pb-0",
      className
    )}
    {...props}
  />
);
ResponsiveDialogFooter.displayName = "ResponsiveDialogFooter";

const ResponsiveDialogTitle = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Title>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Title>
>(({ className, ...props }, ref) => (
  <DialogPrimitive.Title
    ref={ref}
    className={cn(
      "text-lg font-semibold leading-none tracking-tight text-[var(--text-primary)]",
      className
    )}
    {...props}
  />
));
ResponsiveDialogTitle.displayName = DialogPrimitive.Title.displayName;

const ResponsiveDialogDescription = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Description>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Description>
>(({ className, ...props }, ref) => (
  <DialogPrimitive.Description
    ref={ref}
    className={cn("text-sm text-[var(--text-muted)]", className)}
    {...props}
  />
));
ResponsiveDialogDescription.displayName = DialogPrimitive.Description.displayName;

export {
  ResponsiveDialog,
  ResponsiveDialogTrigger,
  ResponsiveDialogClose,
  ResponsiveDialogPortal,
  ResponsiveDialogOverlay,
  ResponsiveDialogContent,
  ResponsiveDialogHeader,
  ResponsiveDialogFooter,
  ResponsiveDialogTitle,
  ResponsiveDialogDescription,
};
