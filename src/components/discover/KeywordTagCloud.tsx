"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useTransition, useCallback } from "react";
import { cn } from "@/lib/utils";

interface KeywordTagCloudProps {
  keywords: string[];
}

export function KeywordTagCloud({ keywords }: KeywordTagCloudProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [, startTransition] = useTransition();

  const activeKeyword = searchParams.get("keyword") || null;

  const handleToggle = useCallback(
    (keyword: string) => {
      startTransition(() => {
        const params = new URLSearchParams(searchParams.toString());
        if (activeKeyword === keyword) {
          params.delete("keyword");
        } else {
          params.set("keyword", keyword);
        }
        router.push(`/discover?${params.toString()}`);
      });
    },
    [router, searchParams, activeKeyword]
  );

  if (keywords.length === 0) return null;

  return (
    <div className="flex gap-1.5 overflow-x-auto pb-1 scrollbar-hide" data-swipe-ignore>
      {keywords.map((keyword) => {
        const isActive = activeKeyword === keyword;
        return (
          <button
            key={keyword}
            onClick={() => handleToggle(keyword)}
            className={cn(
              "flex-shrink-0 px-2.5 py-1 rounded-full text-xs font-medium transition-all duration-150",
              "border",
              isActive
                ? "bg-[var(--surface-3)] text-[var(--text-primary)] font-semibold border-[var(--active-border)]"
                : "bg-[var(--surface-1)] text-[var(--text-secondary)] border-transparent hover:bg-[var(--surface-2)] hover:text-[var(--text-primary)]"
            )}
          >
            {keyword}
          </button>
        );
      })}
    </div>
  );
}
