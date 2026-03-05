import Link from "next/link";
import { CaretRight } from "@phosphor-icons/react/dist/ssr";

interface CollapsibleUpcomingDatesProps {
  children: React.ReactNode;
  hasContent?: boolean;
  clubSlug?: string;
}

export function CollapsibleUpcomingDates({
  children,
  hasContent = true,
  clubSlug,
}: CollapsibleUpcomingDatesProps) {
  return (
    <div>
      <div className="flex items-center justify-between py-2">
        <h3 className="text-sm font-semibold text-[var(--club-accent,var(--text-primary))] uppercase tracking-wide">
          Upcoming
        </h3>
        {clubSlug && (
          <Link
            href={`/club/${clubSlug}/events`}
            className="text-sm text-[var(--club-accent,var(--primary))] transition-colors hover:underline flex items-center gap-0.5"
          >
            All
            <CaretRight className="w-3 h-3" />
          </Link>
        )}
      </div>

      <div className="pt-1">
        {/* No upcoming deadlines or events message */}
        {!hasContent && (
          <p className="text-sm text-[var(--text-muted)] text-center py-4">
            No upcoming deadlines or events
          </p>
        )}

        {/* Calendar/other content */}
        {children}
      </div>
    </div>
  );
}
