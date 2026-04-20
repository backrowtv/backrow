import Link from "next/link";
import { CaretRight } from "@phosphor-icons/react/dist/ssr";
import { Skeleton } from "@/components/ui/skeleton";

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

export function UpcomingDatesSkeleton({
  count = 3,
  className,
}: {
  count?: number;
  className?: string;
}) {
  return (
    <div className={className} aria-hidden="true">
      <div className="flex items-center justify-between py-2">
        <Skeleton className="h-4 w-20" />
        <Skeleton className="h-4 w-8" />
      </div>
      <div className="pt-1 space-y-2">
        {Array.from({ length: count }).map((_, i) => (
          <div key={i} className="flex items-start gap-3 py-1">
            <Skeleton className="w-10 h-10 rounded-full flex-shrink-0" />
            <div className="flex-1 min-w-0 space-y-1 pt-0.5">
              <Skeleton className="h-3.5 w-3/4" />
              <Skeleton className="h-3 w-1/2" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
