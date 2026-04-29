"use client";

import * as React from "react";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import { X } from "@phosphor-icons/react";
import { cn } from "@/lib/utils";
import { useMediaQuery } from "@/lib/hooks/useMediaQuery";

// iOS-style bottom-sheet drag behavior: swipe down on the handle region
// to dismiss. Threshold calibrated so a deliberate swipe closes but a
// gentle scroll-bounce does not.
const DRAG_DISMISS_DISTANCE_PX = 110;
const DRAG_DISMISS_VELOCITY_PX_PER_MS = 0.5;

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
  /** Max height for mobile sheet — defaults to near-full-height (`100dvh` minus safe-area-inset-top minus 0.5rem) so sheets feel like iOS-native full-screen takeovers */
  sheetMaxHeight?: string;
  /** Min height for mobile sheet — defaults to the same value as sheetMaxHeight so sheets feel like full-screen takeovers (the iOS-native pattern) regardless of content size */
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
      sheetMaxHeight = "calc(100dvh - env(safe-area-inset-top, 0px) - 0.5rem)",
      sheetMinHeight,
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
        <SheetContent
          ref={ref}
          className={className}
          hideClose={hideClose}
          showHandle={showHandle}
          sheetMaxHeight={sheetMaxHeight}
          sheetMinHeight={sheetMinHeight ?? sheetMaxHeight}
          {...props}
        >
          {children}
        </SheetContent>
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

/**
 * Mobile sheet body with drag-to-dismiss support on the handle region.
 * Split out of ResponsiveDialogContent so hooks only run on the sheet
 * path — the dialog variant (desktop) stays hook-free.
 */
interface SheetContentProps extends React.ComponentPropsWithoutRef<typeof DialogPrimitive.Content> {
  hideClose?: boolean;
  showHandle?: boolean;
  sheetMaxHeight: string;
  sheetMinHeight: string;
}

const SheetContent = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Content>,
  SheetContentProps
>(
  (
    {
      className,
      children,
      hideClose,
      showHandle = true,
      sheetMaxHeight,
      sheetMinHeight,
      style: propStyle,
      ...props
    },
    ref
  ) => {
    const [dragY, setDragY] = React.useState(0);
    const [isDragging, setIsDragging] = React.useState(false);
    const dragStart = React.useRef<{ y: number; time: number } | null>(null);
    const closeRef = React.useRef<HTMLButtonElement>(null);

    const onHandlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
      dragStart.current = { y: e.clientY, time: performance.now() };
      setIsDragging(true);
      e.currentTarget.setPointerCapture(e.pointerId);
    };

    const onHandlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
      if (!dragStart.current) return;
      const delta = e.clientY - dragStart.current.y;
      setDragY(Math.max(0, delta));
    };

    const onHandlePointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
      if (!dragStart.current) {
        setIsDragging(false);
        return;
      }
      const delta = e.clientY - dragStart.current.y;
      const elapsed = performance.now() - dragStart.current.time;
      const velocity = delta / Math.max(elapsed, 1);
      const shouldDismiss =
        delta > DRAG_DISMISS_DISTANCE_PX ||
        (delta > 40 && velocity > DRAG_DISMISS_VELOCITY_PX_PER_MS);

      dragStart.current = null;
      setIsDragging(false);
      if (shouldDismiss) {
        closeRef.current?.click();
      }
      setDragY(0);
    };

    return (
      <ResponsiveDialogPortal>
        <ResponsiveDialogOverlay />
        <DialogPrimitive.Content
          ref={ref}
          className={cn(
            "fixed left-0 right-0 bottom-0 mx-auto z-[100]",
            "w-full sm:max-w-lg",
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
          style={{
            // Merge caller-provided style first so sheet-critical values
            // (maxHeight/minHeight/transform) always win — a caller's
            // plain style={} would otherwise clobber them and uncap the
            // sheet, letting tall content push the handle above the
            // viewport.
            ...propStyle,
            maxHeight: sheetMaxHeight,
            minHeight: sheetMinHeight,
            transform: dragY > 0 ? `translateY(${dragY}px)` : undefined,
            transition: isDragging ? "none" : "transform 220ms cubic-bezier(0.16, 1, 0.3, 1)",
          }}
          {...props}
        >
          {/* Hidden close button used to programmatically dismiss on drag */}
          <DialogPrimitive.Close
            ref={closeRef}
            className="sr-only"
            tabIndex={-1}
            aria-hidden="true"
          />
          {showHandle && (
            <div
              onPointerDown={onHandlePointerDown}
              onPointerMove={onHandlePointerMove}
              onPointerUp={onHandlePointerUp}
              onPointerCancel={onHandlePointerUp}
              className="flex justify-center pt-3 pb-2 flex-shrink-0 touch-none cursor-grab active:cursor-grabbing"
              role="presentation"
            >
              <div className="w-10 h-1 rounded-full bg-[var(--border)]" />
            </div>
          )}
          <div
            className="overflow-y-auto flex-1 px-4"
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
);
SheetContent.displayName = "SheetContent";

const ResponsiveDialogHeader = ({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
  <div
    className={cn("flex flex-col space-y-1.5 text-center sm:text-left pt-2 sm:pt-0", className)}
    {...props}
  />
);
ResponsiveDialogHeader.displayName = "ResponsiveDialogHeader";

const ResponsiveDialogFooter = ({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
  <div
    className={cn(
      "flex flex-col-reverse gap-2 sm:flex-row sm:justify-end pt-2 pb-4 sm:pb-0",
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
