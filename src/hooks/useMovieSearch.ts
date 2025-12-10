"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useDebounce } from "./useDebounce";
import type { TMDBMovieSearchResult } from "@/lib/tmdb/client";

interface UseMovieSearchOptions {
  /** Maximum number of results to return. Default: 10 */
  maxResults?: number;
  /** Debounce delay in ms. Default: 400 */
  debounceMs?: number;
  /** Enable/disable search (useful for multi-type toggles). Default: true */
  enabled?: boolean;
  /** Minimum query length before searching. Default: 2 */
  minQueryLength?: number;
}

interface UseMovieSearchReturn {
  query: string;
  setQuery: (q: string) => void;
  results: TMDBMovieSearchResult[];
  isSearching: boolean;
  error: string | null;
  clear: () => void;
}

export function useMovieSearch(options: UseMovieSearchOptions = {}): UseMovieSearchReturn {
  const { maxResults = 10, debounceMs = 400, enabled = true, minQueryLength = 2 } = options;

  const [query, setQuery] = useState("");
  const [results, setResults] = useState<TMDBMovieSearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  const debouncedQuery = useDebounce(query, debounceMs);

  useEffect(() => {
    // Cancel any in-flight request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }

    // Don't search if disabled or query too short
    if (!enabled || debouncedQuery.trim().length < minQueryLength) {
      setResults([]);
      setIsSearching(false);
      setError(null);
      return;
    }

    const controller = new AbortController();
    abortControllerRef.current = controller;

    async function fetchResults() {
      setIsSearching(true);
      setError(null);

      try {
        const response = await fetch(`/api/tmdb/search?q=${encodeURIComponent(debouncedQuery)}`, {
          signal: controller.signal,
        });
        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.error || "Search failed");
        }

        if (!controller.signal.aborted) {
          setResults((data.results || []).slice(0, maxResults));
        }
      } catch (err) {
        if (err instanceof DOMException && err.name === "AbortError") {
          return;
        }
        if (!controller.signal.aborted) {
          setError(err instanceof Error ? err.message : "Search failed");
          setResults([]);
        }
      } finally {
        if (!controller.signal.aborted) {
          setIsSearching(false);
        }
      }
    }

    fetchResults();

    return () => {
      controller.abort();
    };
  }, [debouncedQuery, enabled, maxResults, minQueryLength]);

  // Clear results when disabled
  useEffect(() => {
    if (!enabled) {
      setResults([]);
      setError(null);
      setIsSearching(false);
    }
  }, [enabled]);

  const clear = useCallback(() => {
    setQuery("");
    setResults([]);
    setError(null);
    setIsSearching(false);
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
  }, []);

  return { query, setQuery, results, isSearching, error, clear };
}
