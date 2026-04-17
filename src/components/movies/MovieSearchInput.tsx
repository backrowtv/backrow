"use client";

import { forwardRef } from "react";
import { Input } from "@/components/ui/input";
import { MagnifyingGlass, CircleNotch } from "@phosphor-icons/react";

interface MovieSearchInputProps {
  value: string;
  onChange: (value: string) => void;
  isSearching: boolean;
  placeholder?: string;
  autoFocus?: boolean;
  id?: string;
}

export const MovieSearchInput = forwardRef<HTMLInputElement, MovieSearchInputProps>(
  function MovieSearchInput(
    { value, onChange, isSearching, placeholder = "Search for a movie...", autoFocus = false, id },
    ref
  ) {
    return (
      <div className="relative">
        <MagnifyingGlass className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[var(--text-muted)]" />
        <Input
          ref={ref}
          id={id}
          type="text"
          placeholder={placeholder}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="pl-10"
          /* focus-on-open dialog — expected UX */
          // eslint-disable-next-line jsx-a11y/no-autofocus
          autoFocus={autoFocus}
        />
        {isSearching && (
          <CircleNotch className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-[var(--text-muted)]" />
        )}
      </div>
    );
  }
);
