"use client";

import { useState, useTransition, useRef, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { MagnifyingGlass, X } from "@phosphor-icons/react";

interface FilterBadge {
  label: string;
  value: string;
}

interface DiscoverSearchProps {
  initialQuery?: string;
  activeFilters?: FilterBadge[];
  onRemoveFilter?: (value: string) => void;
}

export function DiscoverSearch({
  initialQuery,
  activeFilters = [],
  onRemoveFilter,
}: DiscoverSearchProps) {
  const [query, setQuery] = useState(initialQuery || "");
  const [, startTransition] = useTransition();
  const router = useRouter();
  const searchParams = useSearchParams();
  const inputRef = useRef<HTMLInputElement>(null);

  function handleSearch() {
    startTransition(() => {
      const params = new URLSearchParams(searchParams.toString());
      if (query) {
        params.set("q", query);
      } else {
        params.delete("q");
      }
      router.push(`/discover?${params.toString()}`);
    });
  }

  function handleRemoveFilterClick(value: string) {
    if (onRemoveFilter) {
      onRemoveFilter(value);
    }
  }

  // Clear only the search query on unmount so navigating away and back
  // resets the search bar — but preserve filter params (genres, etc.).
  useEffect(() => {
    return () => {
      if (typeof window === "undefined") return;
      const url = new URL(window.location.href);
      if (url.pathname === "/discover" && url.searchParams.has("q")) {
        url.searchParams.delete("q");
        window.history.replaceState({}, "", url.pathname + (url.search ? url.search : ""));
      }
    };
  }, []);

  return (
    <div>
      {/* Search Input */}
      <div className="relative">
        <MagnifyingGlass className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[var(--text-muted)]" />
        <Input
          ref={inputRef}
          placeholder="Search for clubs..."
          className="pl-10 h-9 text-[13px] search-input-debossed"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              handleSearch();
            }
          }}
        />
      </div>

      {/* Filter Chips - Mobile */}
      {activeFilters.length > 0 && (
        <div className="flex gap-2 mt-4 lg:hidden overflow-x-auto" data-swipe-ignore>
          {activeFilters.map((filter) => (
            <Badge
              key={filter.value}
              variant="secondary"
              className="cursor-pointer flex items-center gap-1"
              onClick={() => handleRemoveFilterClick(filter.value)}
            >
              {filter.label}
              <X className="h-3 w-3" />
            </Badge>
          ))}
        </div>
      )}
    </div>
  );
}
