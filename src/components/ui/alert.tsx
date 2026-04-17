import * as React from "react";
import { cn } from "@/lib/utils";

export interface AlertProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: "default" | "success" | "warning" | "danger";
}

const Alert = React.forwardRef<HTMLDivElement, AlertProps>(
  ({ className, variant = "default", ...props }, ref) => {
    const variants = {
      default: "bg-[var(--surface-1)] border-[var(--border)]",
      success: "bg-[var(--success)]/10 border-[var(--success)]/30",
      warning: "bg-[var(--warning)]/10 border-[var(--warning)]/30",
      danger: "bg-[var(--error)]/10 border-[var(--error)]/30",
    };

    return (
      <div
        ref={ref}
        className={cn(
          "relative w-full rounded-lg border p-4",
          "transition-all duration-200 ease-in-out",
          "animate-fade-in",
          variants[variant],
          className
        )}
        {...props}
      />
    );
  }
);
Alert.displayName = "Alert";

export type AlertTitleProps = React.HTMLAttributes<HTMLHeadingElement>;

const AlertTitle = React.forwardRef<HTMLHeadingElement, AlertTitleProps>(
  ({ className, ...props }, ref) => {
    return (
      /* composable slot — children passed by consumer */
      // eslint-disable-next-line jsx-a11y/heading-has-content
      <h5
        ref={ref}
        className={cn("mb-1 font-medium leading-none tracking-tight", className)}
        {...props}
      />
    );
  }
);
AlertTitle.displayName = "AlertTitle";

export type AlertDescriptionProps = React.HTMLAttributes<HTMLParagraphElement>;

const AlertDescription = React.forwardRef<HTMLParagraphElement, AlertDescriptionProps>(
  ({ className, ...props }, ref) => {
    return (
      <div ref={ref} className={cn("text-sm text-[var(--text-muted)]", className)} {...props} />
    );
  }
);
AlertDescription.displayName = "AlertDescription";

export { Alert, AlertTitle, AlertDescription };
