"use client";

import { CLUB_GENRES, MAX_CLUB_GENRES } from "@/lib/genres/constants";
import { getGenreIcon } from "@/components/genres/GenreIcon";
import { cn } from "@/lib/utils";

interface GenreSelectorProps {
  value: string[];
  onChange: (genres: string[]) => void;
  disabled?: boolean;
}

export function GenreSelector({ value, onChange, disabled }: GenreSelectorProps) {
  const toggle = (slug: string) => {
    if (disabled) return;
    if (value.includes(slug)) {
      onChange(value.filter((s) => s !== slug));
    } else if (value.length < MAX_CLUB_GENRES) {
      onChange([...value, slug]);
    }
  };

  const atMax = value.length >= MAX_CLUB_GENRES;

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium text-[var(--text-primary)]">Genres</span>
        <span className="text-xs text-[var(--text-muted)]">
          {value.length}/{MAX_CLUB_GENRES} selected
        </span>
      </div>
      <div className="flex flex-wrap gap-2">
        {CLUB_GENRES.map((genre) => {
          const selected = value.includes(genre.slug);
          const isDisabled = disabled || (!selected && atMax);
          const Icon = getGenreIcon(genre.slug);

          return (
            <button
              key={genre.slug}
              type="button"
              onClick={() => toggle(genre.slug)}
              disabled={isDisabled}
              className={cn(
                "inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-full text-xs font-medium transition-colors border",
                selected
                  ? "bg-[var(--primary)] text-[var(--primary-foreground)] border-[var(--primary)]"
                  : "bg-[var(--surface-1)] text-[var(--text-secondary)] border-[var(--border)] hover:bg-[var(--surface-2)] hover:text-[var(--text-primary)]",
                isDisabled && !selected && "opacity-40 cursor-not-allowed"
              )}
            >
              {Icon && <Icon size={14} weight={selected ? "fill" : "bold"} />}
              {genre.name}
            </button>
          );
        })}
      </div>
      <p className="text-[11px] text-[var(--text-muted)]">
        Choose up to {MAX_CLUB_GENRES} genres to help others discover your club
      </p>
    </div>
  );
}
