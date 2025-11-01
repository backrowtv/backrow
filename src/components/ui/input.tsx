"use client";

import * as React from "react";
import { useId } from "react";
import { cn } from "@/lib/utils";

export interface InputProps extends React.InputHTMLAttributes<
  HTMLInputElement | HTMLTextAreaElement
> {
  error?: string;
  label?: string;
  helperText?: string;
  showCharacterCount?: boolean;
  maxLength?: number;
  type?: "text" | "email" | "password" | "textarea" | "number" | "date" | "datetime-local" | "time";
  rows?: number;
}

const Input = React.forwardRef<HTMLInputElement | HTMLTextAreaElement, InputProps>(
  (
    {
      className,
      type = "text",
      error,
      label,
      helperText,
      showCharacterCount,
      maxLength,
      value,
      rows,
      id,
      autoComplete,
      ...props
    },
    ref
  ) => {
    const generatedId = useId();
    const characterCount = typeof value === "string" ? value.length : String(value || "").length;

    const isTextarea = type === "textarea";
    const inputId = id || `input-${generatedId}`;
    const errorId = error ? `${inputId}-error` : undefined;
    const helperTextId = helperText && !error ? `${inputId}-helper` : undefined;
    const characterCountId = showCharacterCount ? `${inputId}-count` : undefined;
    const describedBy =
      [errorId, helperTextId, characterCountId].filter(Boolean).join(" ") || undefined;

    const getAutocomplete = (): string | undefined => {
      if (autoComplete) return autoComplete;
      if (type === "email") return "email";
      if (type === "password") {
        const nameProp =
          (props as React.InputHTMLAttributes<HTMLInputElement>).name?.toLowerCase() || "";
        if (nameProp.includes("new") || nameProp.includes("confirm")) return "new-password";
        return "current-password";
      }
      return undefined;
    };
    const autocompleteValue = getAutocomplete();

    const isDate = type === "date" || type === "datetime-local";

    const inputClasses = cn(
      "w-full min-w-0 rounded-md border box-border",
      "bg-[var(--background)]",
      "border-[var(--border)]",
      "text-[var(--text-primary)]",
      "placeholder:text-[var(--text-muted)]",
      // Use 16px (text-base) on mobile to prevent iOS Safari zoom on focus
      // Desktop (md+) uses 14px (text-sm) to maintain design
      // Date inputs use smaller text/padding on mobile so they fit in grid layouts
      isDate ? "px-2 py-2 text-sm" : "px-3 py-2 text-base md:text-sm",
      !isTextarea && "h-9 md:h-9",
      "focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[var(--ring)] focus-visible:border-transparent",
      "hover:border-[var(--border-hover)]",
      "transition-colors duration-150",
      "disabled:cursor-not-allowed disabled:opacity-50 disabled:bg-[var(--surface-2)]",
      error && "border-[var(--error)] focus:ring-[var(--error)]/20",
      isTextarea && "min-h-[80px] resize-y",
      className
    );

    return (
      <div className="w-full min-w-0 overflow-hidden">
        {label && (
          <label
            htmlFor={inputId}
            className="block text-sm font-medium text-[var(--text-primary)] mb-1.5"
          >
            {label}
            {props.required && <span className="text-[var(--error)] ml-0.5">*</span>}
          </label>
        )}
        {isTextarea ? (
          <textarea
            id={inputId}
            className={inputClasses}
            ref={ref as React.Ref<HTMLTextAreaElement>}
            maxLength={maxLength}
            value={value}
            rows={rows || 4}
            aria-required={props.required}
            aria-invalid={error ? "true" : undefined}
            aria-describedby={describedBy}
            aria-disabled={props.disabled}
            {...(props as React.TextareaHTMLAttributes<HTMLTextAreaElement>)}
          />
        ) : (
          <input
            id={inputId}
            type={type}
            className={inputClasses}
            ref={ref as React.Ref<HTMLInputElement>}
            maxLength={maxLength}
            value={value}
            autoComplete={autocompleteValue}
            aria-required={props.required}
            aria-invalid={error ? "true" : undefined}
            aria-describedby={describedBy}
            aria-disabled={props.disabled}
            style={isDate ? { maxWidth: "100%", WebkitAppearance: "none" } : undefined}
            {...(props as React.InputHTMLAttributes<HTMLInputElement>)}
          />
        )}
        {(error || helperText || showCharacterCount) && (
          <div className="mt-1.5 flex items-center justify-between">
            <div className="flex-1">
              {error && (
                <p
                  id={errorId}
                  role="alert"
                  aria-live="polite"
                  className="text-xs text-[var(--error)] flex items-center gap-1"
                >
                  <svg
                    className="w-3.5 h-3.5 shrink-0"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                    aria-hidden="true"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                    />
                  </svg>
                  <span>{error}</span>
                </p>
              )}
              {!error && helperText && (
                <p id={helperTextId} className="text-xs text-[var(--text-muted)]">
                  {helperText}
                </p>
              )}
            </div>
            {showCharacterCount && maxLength && (
              <p
                id={characterCountId}
                className="text-xs text-[var(--text-muted)]"
                aria-live="polite"
                aria-atomic="true"
              >
                {characterCount}/{maxLength}
              </p>
            )}
          </div>
        )}
      </div>
    );
  }
);
Input.displayName = "Input";

export { Input };
