"use client";

import { cn } from "@/lib/utils";
import { type NewsItem } from "./sample-data";
import { Skeleton } from "@/components/ui/skeleton";

// Re-export for backwards compatibility
export { SAMPLE_FILM_NEWS, type NewsItem } from "./sample-data";

interface FilmNewsProps {
  news: NewsItem[];
  className?: string;
}

export function FilmNews({ news, className }: FilmNewsProps) {
  if (news.length === 0) {
    return null;
  }

  return (
    <div className={cn("rounded-lg overflow-hidden", className)}>
      {/* Header */}
      <div className="flex items-center px-2.5 py-2">
        <span className="text-sm font-semibold uppercase tracking-wide text-[var(--text-primary)]">
          Awards Season
        </span>
      </div>

      {/* News list */}
      <div className="divide-y" style={{ borderColor: "var(--border)" }}>
        {news.slice(0, 4).map((item) => (
          <a
            key={item.id}
            href={item.url}
            target="_blank"
            rel="noopener noreferrer"
            className="block px-2.5 py-2 hover:bg-[var(--surface-2)] transition-colors group"
          >
            <p
              className="text-sm leading-tight line-clamp-2 group-hover:text-[var(--primary)] transition-colors"
              style={{ color: "var(--text-primary)" }}
            >
              {item.title}
            </p>
            <div className="flex items-center gap-1 mt-0.5">
              <span className="text-[10px]" style={{ color: "var(--text-muted)" }}>
                {item.source}
              </span>
              <span className="text-[10px]" style={{ color: "var(--text-muted)" }}>
                ·
              </span>
              <span className="text-[10px]" style={{ color: "var(--text-muted)" }}>
                {item.date}
              </span>
            </div>
          </a>
        ))}
      </div>
    </div>
  );
}

// Loading skeleton
export function FilmNewsSkeleton() {
  return (
    <div
      className="rounded-lg border overflow-hidden"
      style={{
        background: "var(--surface-1)",
        borderColor: "var(--border)",
      }}
    >
      <div className="px-2.5 py-1.5 border-b" style={{ borderColor: "var(--border)" }}>
        <Skeleton className="h-2.5 w-20" />
      </div>
      <div className="divide-y" style={{ borderColor: "var(--border)" }}>
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="px-2.5 py-2 space-y-1">
            <Skeleton className="h-2.5 w-full" />
            <Skeleton className="h-2 w-2/3" />
            <Skeleton className="h-2 w-1/3" />
          </div>
        ))}
      </div>
    </div>
  );
}
