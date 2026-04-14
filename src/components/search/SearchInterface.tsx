"use client";

import { useState, useEffect, useTransition, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Input } from "@/components/ui/input";
import { SearchResults } from "./SearchResults";
import { searchAll } from "@/app/actions/search";
import { MagnifyingGlass } from "@phosphor-icons/react";

export type SearchFilterType =
  | "all"
  | "movies"
  | "actors"
  | "directors"
  | "composers"
  | "notes"
  | "discussions";

interface SearchInterfaceProps {
  initialQuery?: string;
}

export function SearchInterface({ initialQuery = "" }: SearchInterfaceProps) {
  const router = useRouter();
  const [query, setQuery] = useState(initialQuery);
  const [results, setResults] = useState<Awaited<ReturnType<typeof searchAll>> | null>(null);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const debounceTimer = useRef<NodeJS.Timeout | null>(null);
  const lastUrlUpdate = useRef<string>("");
  const inputRef = useRef<HTMLInputElement>(null);

  // Update URL when query changes (debounced, without causing re-renders)
  const updateUrl = useCallback(
    (q: string) => {
      const params = new URLSearchParams();

      if (q.trim()) {
        params.set("q", q.trim());
      }

      const newUrl = `/search?${params.toString()}`;

      // Only update URL if it's different from the last update
      if (newUrl !== lastUrlUpdate.current) {
        lastUrlUpdate.current = newUrl;
        router.replace(newUrl, { scroll: false });
      }
    },
    [router]
  );

  // Debounce URL updates
  useEffect(() => {
    if (debounceTimer.current) {
      clearTimeout(debounceTimer.current);
    }

    debounceTimer.current = setTimeout(() => {
      updateUrl(query);
    }, 500);

    return () => {
      if (debounceTimer.current) {
        clearTimeout(debounceTimer.current);
      }
    };
  }, [query, updateUrl]);

  // Perform search when query changes - always fetch all categories
  useEffect(() => {
    if (!query.trim() || query.trim().length < 2) {
      setResults(null);
      setError(null);
      return;
    }

    startTransition(async () => {
      try {
        setError(null);
        // Always fetch all categories - filtering is done in SearchResults tabs
        const searchFilters: SearchFilterType[] = [
          "movies",
          "actors",
          "directors",
          "composers",
          "notes",
          "discussions",
        ];

        const searchResults = await searchAll(query.trim(), searchFilters);
        setResults(searchResults);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Search failed");
        setResults(null);
      }
    });
  }, [query]);

  return (
    <div className="space-y-6">
      {/* Search Input */}
      <div className="relative max-w-2xl">
        <MagnifyingGlass
          className="absolute left-3 top-3 h-4 w-4"
          style={{ color: "var(--text-muted)" }}
        />
        <Input
          ref={inputRef}
          placeholder="Search movies, people, notes..."
          className="pl-10 h-12 search-input-debossed"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              // Search is already triggered by useEffect
            }
          }}
        />
      </div>

      {/* Filters are now in the secondary sidebar */}

      {/* Error State */}
      {error && (
        <div
          className="p-4 rounded-lg border"
          style={{
            backgroundColor: "color-mix(in srgb, var(--error) 10%, transparent)",
            borderColor: "color-mix(in srgb, var(--error) 30%, transparent)",
          }}
        >
          <p className="text-sm" style={{ color: "var(--error)", fontWeight: 500 }}>
            {error}
          </p>
        </div>
      )}

      {/* Results */}
      {query.trim().length >= 2 && (
        <SearchResults results={results} isLoading={isPending} query={query} />
      )}
    </div>
  );
}
