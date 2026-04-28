"use client";

import { ArrowSquareOut } from "@phosphor-icons/react";
import { Skeleton } from "@/components/ui/skeleton";

interface WatchProvidersProps {
  justWatchUrl: string | null;
  isVisible?: boolean;
}

export function WatchProviders({ justWatchUrl, isVisible = true }: WatchProvidersProps) {
  if (!isVisible || !justWatchUrl) {
    return null;
  }

  return (
    <a
      href={justWatchUrl}
      target="_blank"
      rel="noopener noreferrer"
      className="group inline-flex items-center gap-2"
    >
      <span className="font-semibold italic tracking-tight text-[#FFEC00]">JustWatch</span>
      <span className="text-sm text-[var(--text-muted)] transition-colors group-hover:text-[var(--text-primary)]">
        Find where to stream this movie
      </span>
      <ArrowSquareOut className="h-3.5 w-3.5 text-[var(--text-muted)] transition-colors group-hover:text-[var(--text-primary)]" />
    </a>
  );
}

/**
 * Default: renders nothing. Most movies have no streaming providers, so the
 * most-likely real state is an empty block.
 */
export function WatchProvidersSkeleton({
  count = 0,
  className,
}: {
  count?: number;
  className?: string;
}) {
  if (count === 0) return null;
  return (
    <div className={className} aria-hidden="true">
      <Skeleton className="h-4 w-64" />
    </div>
  );
}
