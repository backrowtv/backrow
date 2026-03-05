"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useTransition, useCallback } from "react";
import { cn } from "@/lib/utils";
import { getGenreBySlug } from "@/lib/genres/constants";
import { GenreIcon } from "@/components/genres/GenreIcon";

interface GenreTagCloudProps {
  genres: string[];
}

export function GenreTagCloud({ genres }: GenreTagCloudProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [, startTransition] = useTransition();

  const activeGenre = searchParams.get("genre") || null;

  const handleToggle = useCallback(
    (slug: string) => {
      startTransition(() => {
        const params = new URLSearchParams(searchParams.toString());
        if (activeGenre === slug) {
          params.delete("genre");
        } else {
          params.set("genre", slug);
        }
        router.push(`/discover?${params.toString()}`);
      });
    },
    [router, searchParams, activeGenre]
  );

  if (genres.length === 0) return null;

  return (
    <div className="flex gap-1.5 overflow-x-auto pb-1 scrollbar-hide" data-swipe-ignore>
      {genres.map((slug) => {
        const genre = getGenreBySlug(slug);
        if (!genre) return null;
        const isActive = activeGenre === slug;
        return (
          <button
            key={slug}
            onClick={() => handleToggle(slug)}
            className={cn(
              "flex-shrink-0 inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium transition-all duration-150",
              "border",
              isActive
                ? "bg-[var(--surface-3)] text-[var(--text-primary)] font-semibold border-[var(--active-border)]"
                : "bg-[var(--surface-1)] text-[var(--text-secondary)] border-transparent hover:bg-[var(--surface-2)] hover:text-[var(--text-primary)]"
            )}
          >
            <GenreIcon slug={slug} size={12} weight={isActive ? "fill" : "bold"} />
            {genre.name}
          </button>
        );
      })}
    </div>
  );
}
