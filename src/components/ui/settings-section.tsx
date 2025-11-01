"use client";

import * as React from "react";
import { CaretDown } from "@phosphor-icons/react";
import { cn } from "@/lib/utils";

interface SettingsSectionProps {
  title: string;
  description?: string;
  icon?: React.ReactNode; // ReactNode for Server Component compatibility (accepts Phosphor icons)
  children: React.ReactNode;
  defaultOpen?: boolean;
  className?: string;
  collapsible?: boolean;
  compact?: boolean; // Reduces spacing for condensed layouts
}

/**
 * SettingsSection - A clean, Letterboxd-inspired settings section
 *
 * Features:
 * - Clean header with optional icon
 * - Subtle divider styling
 * - Optional collapsible behavior
 * - Consistent spacing and typography
 */
export function SettingsSection({
  title,
  description,
  icon,
  children,
  defaultOpen = false,
  className,
  collapsible = true,
  compact = false,
}: SettingsSectionProps) {
  const [isOpen, setIsOpen] = React.useState(defaultOpen);

  return (
    <div className={cn("group", className)}>
      {/* Section Header */}
      {collapsible ? (
        <button
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          className={cn(
            "w-full flex items-center justify-between py-3",
            "text-left transition-colors",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--background)]"
          )}
        >
          <div className="flex items-center gap-2.5">
            {icon && (
              <div className="flex-shrink-0 [&>svg]:h-4.5 [&>svg]:w-4.5 [&>svg]:text-[var(--text-muted)]">
                {icon}
              </div>
            )}
            <div>
              <h3 className="text-sm font-medium text-[var(--text-primary)]">{title}</h3>
              {description && (
                <p className="text-xs text-[var(--text-muted)] mt-0.5">{description}</p>
              )}
            </div>
          </div>
          <CaretDown
            className={cn(
              "h-4 w-4 text-[var(--text-muted)] transition-transform duration-200",
              isOpen ? "rotate-0" : "-rotate-90"
            )}
            weight="bold"
          />
        </button>
      ) : (
        <div className="flex items-center gap-2.5 py-3">
          {icon && (
            <div className="flex-shrink-0 [&>svg]:h-4.5 [&>svg]:w-4.5 [&>svg]:text-[var(--text-muted)]">
              {icon}
            </div>
          )}
          <div>
            <h3 className="text-sm font-medium text-[var(--text-primary)]">{title}</h3>
            {description && (
              <p className="text-xs text-[var(--text-muted)] mt-0.5">{description}</p>
            )}
          </div>
        </div>
      )}

      {/* Section Content */}
      <div
        className={cn(
          "overflow-hidden transition-all duration-200",
          collapsible && !isOpen ? "h-0 opacity-0" : "opacity-100"
        )}
      >
        <div className={cn("mt-1 rounded-lg bg-[var(--surface-1)]/50", compact ? "p-3" : "p-4")}>
          {children}
        </div>
      </div>
    </div>
  );
}

/**
 * SettingsGroup - A group of related settings within a section
 */
interface SettingsGroupProps {
  title?: string;
  description?: string;
  children: React.ReactNode;
  className?: string;
  compact?: boolean;
}

export function SettingsGroup({
  title,
  description,
  children,
  className,
  compact = false,
}: SettingsGroupProps) {
  return (
    <div className={cn(compact ? "space-y-3" : "space-y-4", className)}>
      {(title || description) && (
        <div className={cn(compact ? "mb-2" : "mb-3")}>
          {title && <h4 className="text-sm font-medium text-[var(--text-primary)]">{title}</h4>}
          {description && <p className="text-xs text-[var(--text-muted)] mt-0.5">{description}</p>}
        </div>
      )}
      {children}
    </div>
  );
}

/**
 * SettingsRow - A single setting row with label and control
 */
interface SettingsRowProps {
  label: string;
  description?: string;
  children: React.ReactNode;
  className?: string;
  htmlFor?: string;
  compact?: boolean;
}

export function SettingsRow({
  label,
  description,
  children,
  className,
  htmlFor,
  compact = false,
}: SettingsRowProps) {
  return (
    <div
      className={cn(
        "flex justify-between gap-4",
        // Use items-center for single-line rows, items-start when there's a description
        description ? "items-start" : "items-center",
        compact ? "py-2" : "py-3",
        className
      )}
    >
      <div className="flex-1 min-w-0">
        <label
          htmlFor={htmlFor}
          className="text-sm font-medium text-[var(--text-primary)] cursor-pointer"
        >
          {label}
        </label>
        {description && <p className="text-xs text-[var(--text-muted)] mt-0.5">{description}</p>}
      </div>
      <div
        className={cn(
          "flex-shrink-0 flex items-center",
          // When there's a description, align control with the label (first line)
          description && "self-start pt-0.5"
        )}
      >
        {children}
      </div>
    </div>
  );
}

/**
 * SettingsCard - A subtle card for grouped settings (use sparingly)
 */
interface SettingsCardProps {
  children: React.ReactNode;
  className?: string;
  variant?: "default" | "info" | "warning";
  compact?: boolean;
}

export function SettingsCard({
  children,
  className,
  variant = "default",
  compact = false,
}: SettingsCardProps) {
  return (
    <div
      className={cn(
        "rounded-xl transition-colors",
        compact ? "p-3" : "p-4",
        variant === "default" && "bg-[var(--surface-1)] border border-[var(--border)]",
        variant === "info" && "bg-[var(--primary)]/5 border border-[var(--primary)]/20",
        variant === "warning" && "bg-amber-500/10 border border-amber-500/30",
        className
      )}
    >
      {children}
    </div>
  );
}
