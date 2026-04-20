"use client";

import { cn } from "@/lib/utils";
import { Notebook } from "@phosphor-icons/react";
import { Skeleton } from "@/components/ui/skeleton";

// Re-export for backwards compatibility
export { SAMPLE_BLOG_POSTS, type BlogPost } from "./sample-data";

interface BlogSectionProps {
  className?: string;
}

export function BlogSection({ className }: BlogSectionProps) {
  return (
    <div className={cn("rounded-lg overflow-hidden pt-4", className)}>
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-[var(--text-primary)]">
          From the Blog
        </h2>
      </div>

      {/* Coming Soon placeholder */}
      <div className="px-4 py-8 text-center">
        <Notebook className="h-10 w-10 mx-auto mb-3 text-[var(--text-muted)]" />
        <p className="text-sm font-medium text-[var(--text-primary)]">Blog Coming Soon</p>
        <p className="text-xs text-[var(--text-muted)] mt-1">
          Tips, guides, and stories from the world of film clubs.
        </p>
      </div>
    </div>
  );
}

// Loading skeleton
export function BlogSectionSkeleton() {
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
          <div key={i} className="flex items-center gap-2 px-2.5 py-2">
            <Skeleton className="w-10 h-10 rounded flex-shrink-0" />
            <div className="flex-1 space-y-1">
              <Skeleton className="h-2.5 w-full" />
              <Skeleton className="h-2 w-1/3" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
