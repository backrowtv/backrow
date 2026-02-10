import { DateDisplay } from "@/components/ui/date-display";

interface ResultsSummaryProps {
  memberCount: number;
  calculatedAt: string;
}

export function ResultsSummary({ memberCount, calculatedAt }: ResultsSummaryProps) {
  return (
    <div className="rounded-lg bg-zinc-50 dark:bg-zinc-800 p-4 border border-zinc-200 dark:border-zinc-700">
      <div className="space-y-2 text-sm">
        <div>
          <span className="text-[var(--text-muted)]">Members at Creation:</span>{" "}
          <span className="font-medium text-zinc-950 dark:text-zinc-50">{memberCount}</span>
        </div>
        <div>
          <span className="text-[var(--text-muted)]">Calculated:</span>{" "}
          <span className="font-medium text-zinc-950 dark:text-zinc-50">
            <DateDisplay date={calculatedAt} format="datetime" />
          </span>
        </div>
      </div>
    </div>
  );
}
