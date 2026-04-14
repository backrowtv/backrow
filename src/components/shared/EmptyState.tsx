import type { Icon } from "@phosphor-icons/react";
import { Text } from "@/components/ui/typography";
import { cn } from "@/lib/utils";

/**
 * Unified empty state component with three variants:
 *
 * - 'card': Standalone dashed-border card (watch history, badges, featured sections)
 * - 'inline': Inside existing containers, no border (threads, feeds, calendar, tabs)
 * - 'compact': Small/tight spaces, horizontal layout (widgets, notes, collapsed sections)
 */
type EmptyStateVariant = "card" | "inline" | "compact";

interface EmptyStateProps {
  /** Phosphor icon component */
  icon: Icon;
  /** Short title, e.g. "No movies watched yet" */
  title: string;
  /** Supporting description */
  message?: string;
  /** Optional action element (button, link) */
  action?: React.ReactNode;
  /** Display variant */
  variant?: EmptyStateVariant;
  /** Additional CSS classes */
  className?: string;
}

export function EmptyState({
  icon: IconComponent,
  title,
  message,
  action,
  variant = "card",
  className,
}: EmptyStateProps) {
  // Compact variant: horizontal layout, minimal padding
  if (variant === "compact") {
    return (
      <div className={cn("flex items-center gap-2 py-3 px-3", className)}>
        <IconComponent className="w-5 h-5 shrink-0 text-[var(--text-muted)]" />
        <Text size="tiny" muted>
          {title}
        </Text>
      </div>
    );
  }

  // Inline variant: centered inside existing containers
  if (variant === "inline") {
    return (
      <div className={cn("flex flex-col items-center justify-center py-6 text-center", className)}>
        <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-[var(--surface-2)] mb-3">
          <IconComponent className="w-6 h-6 text-[var(--text-muted)]" />
        </div>
        <Text size="small" muted>
          {title}
        </Text>
        {message && (
          <Text size="tiny" muted className="mt-1 max-w-xs mx-auto">
            {message}
          </Text>
        )}
        {action && <div className="mt-3">{action}</div>}
      </div>
    );
  }

  // Card variant (default): standalone dashed-border card
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center py-8 px-4 rounded-xl border border-dashed border-[var(--border)] bg-[var(--surface-1)] text-center",
        className
      )}
    >
      <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-[var(--surface-2)] mb-4">
        <IconComponent className="w-8 h-8 text-[var(--text-muted)]" />
      </div>
      <Text size="small" muted>
        {title}
      </Text>
      {message && (
        <Text size="tiny" muted className="mt-1 max-w-sm mx-auto">
          {message}
        </Text>
      )}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}
