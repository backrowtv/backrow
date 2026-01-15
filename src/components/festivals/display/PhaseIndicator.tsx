import { cn } from "@/lib/utils";
import { CheckCircle, Play, Clock } from "@phosphor-icons/react/dist/ssr";

type Phase = "theme_selection" | "nomination" | "watch_rate" | "results";

interface PhaseIndicatorProps {
  phase: Phase;
  ratingsEnabled?: boolean;
  className?: string;
}

export function PhaseIndicator({
  phase,
  ratingsEnabled = true,
  className = "",
}: PhaseIndicatorProps) {
  const phases: { key: Phase; label: string }[] = [
    {
      key: "theme_selection",
      label: "Theme Selection",
    },
    {
      key: "nomination",
      label: "Nomination",
    },
    {
      key: "watch_rate",
      label: ratingsEnabled ? "Watch & Rate" : "Watch",
    },
    {
      key: "results",
      label: "Results",
    },
  ];

  const currentIndex = phases.findIndex((p) => p.key === phase);

  return (
    <div className={cn("flex items-center gap-[var(--spacing-2)]", className)}>
      {phases.map((p, index) => {
        const isActive = index === currentIndex;
        const isCompleted = index < currentIndex;

        return (
          <div key={p.key} className="flex items-center">
            <div
              className={cn(
                "rounded-md",
                "px-[var(--spacing-3)]",
                "py-[var(--spacing-1)]",
                "text-[var(--font-caption-size)]",
                "font-semibold",
                "transition-all",
                "duration-[var(--duration-fast)]",
                "ease-[var(--easing-default)]",
                isActive
                  ? "bg-[var(--info)] text-white border border-[var(--info)]" // Active: blue
                  : isCompleted
                    ? "bg-[var(--success)] text-white border border-[var(--success)]" // Complete: green
                    : "bg-[var(--surface-1)] text-[var(--text-muted)] border border-[var(--border)]" // Upcoming: gray
              )}
            >
              <span className="inline-flex items-center gap-1">
                {isCompleted ? (
                  <CheckCircle className="h-3.5 w-3.5" weight="fill" aria-hidden="true" />
                ) : isActive ? (
                  <Play className="h-3 w-3" weight="fill" aria-hidden="true" />
                ) : (
                  <Clock className="h-3 w-3" aria-hidden="true" />
                )}
                {p.label}
              </span>
            </div>
            {index < phases.length - 1 && (
              <div className="mx-[var(--spacing-2)] text-[var(--text-muted)]">→</div>
            )}
          </div>
        );
      })}
    </div>
  );
}
