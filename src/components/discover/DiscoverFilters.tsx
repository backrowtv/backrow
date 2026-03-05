"use client";

import { useSearchParams, useRouter, usePathname } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuCheckboxItem,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
} from "@/components/ui/dropdown-menu";
import { X, Funnel, CaretDown, Users } from "@phosphor-icons/react/dist/ssr";
import { useState, useEffect, useCallback } from "react";
import {
  PRIVACY_OPTIONS,
  PRIVACY_LABELS,
  MEMBER_COUNT_OPTIONS,
  parseFiltersFromURL,
  serializeFiltersToURL,
  type DiscoverFiltersState,
} from "@/lib/discover/filters";

const STORAGE_KEY = "discoverFilters";

/**
 * Displays active filters as removable chips/badges
 */
interface ActiveFiltersDisplayProps {
  filters: DiscoverFiltersState;
  onRemovePrivacy: (value: string) => void;
  onRemoveMinMembers: () => void;
  onClearAll: () => void;
}

export function ActiveFiltersDisplay({
  filters,
  onRemovePrivacy,
  onRemoveMinMembers,
  onClearAll,
}: ActiveFiltersDisplayProps) {
  const hasFilters = filters.privacy.length > 0 || filters.minMembers > 0;

  if (!hasFilters) return null;

  return (
    <div className="flex flex-wrap items-center gap-2 py-2">
      <span className="text-xs text-[var(--text-muted)]">Filtering by:</span>

      {/* Privacy filter chips */}
      {filters.privacy.map((privacy) => (
        <button
          key={privacy}
          onClick={() => onRemovePrivacy(privacy)}
          className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium rounded-full bg-[var(--surface-3)] text-[var(--text-primary)] font-semibold hover:bg-[var(--surface-4)] transition-colors group"
        >
          {PRIVACY_LABELS[privacy] || privacy}
          <X className="w-3 h-3 opacity-60 group-hover:opacity-100" />
        </button>
      ))}

      {/* Min members chip */}
      {filters.minMembers > 0 && (
        <button
          onClick={onRemoveMinMembers}
          className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium rounded-full bg-[var(--accent)] text-white hover:bg-[var(--accent)]/80 transition-colors group"
        >
          <Users className="w-3 h-3" />
          {filters.minMembers}+ members
          <X className="w-3 h-3 opacity-60 group-hover:opacity-100" />
        </button>
      )}

      {/* Clear all button - only show if multiple filters */}
      {filters.privacy.length + (filters.minMembers > 0 ? 1 : 0) > 1 && (
        <button
          onClick={onClearAll}
          className="text-xs text-[var(--text-muted)] hover:text-[var(--text-primary)] underline underline-offset-2"
        >
          Clear all
        </button>
      )}
    </div>
  );
}

/**
 * Combined component that includes both the filter controls and the active filters display
 */
export function DiscoverFiltersWithDisplay() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();

  // Parse filters from URL
  const urlFilters = parseFiltersFromURL(searchParams);

  const [selectedPrivacy, setSelectedPrivacy] = useState<string[]>(urlFilters.privacy);
  const [selectedMinMembers, setSelectedMinMembers] = useState<number>(urlFilters.minMembers);

  // Update URL when filters change
  const updateUrl = useCallback(
    (privacy: string[], minMembers: number) => {
      const params = serializeFiltersToURL({ privacy, minMembers });

      // Preserve search query if it exists
      const currentQuery = searchParams.get("q");
      if (currentQuery) {
        params.set("q", currentQuery);
      }

      // Preserve view mode if it exists
      const currentView = searchParams.get("view");
      if (currentView) {
        params.set("view", currentView);
      }

      const newUrl = params.toString() ? `${pathname}?${params.toString()}` : pathname;

      router.replace(newUrl, { scroll: false });

      // Save to localStorage for persistence
      const filters = { privacy, minMembers };
      if (privacy.length > 0 || minMembers > 0) {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(filters));
      } else {
        localStorage.removeItem(STORAGE_KEY);
      }
    },
    [pathname, router, searchParams]
  );

  // Load saved preferences on mount
  useEffect(() => {
    const hasURLFilters = searchParams.get("privacy") || searchParams.get("minMembers");

    if (!hasURLFilters) {
      try {
        const savedFilters = localStorage.getItem(STORAGE_KEY);
        if (savedFilters) {
          const parsed = JSON.parse(savedFilters) as DiscoverFiltersState;
          if (parsed.privacy.length > 0 || parsed.minMembers > 0) {
            setSelectedPrivacy(parsed.privacy);
            setSelectedMinMembers(parsed.minMembers);
            updateUrl(parsed.privacy, parsed.minMembers);
          }
        }
      } catch {
        // Ignore parse errors
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- Mount-only: restore saved filters from localStorage
  }, []);

  const togglePrivacy = (value: string) => {
    const newPrivacy = selectedPrivacy.includes(value)
      ? selectedPrivacy.filter((p) => p !== value)
      : [...selectedPrivacy, value];
    setSelectedPrivacy(newPrivacy);
    updateUrl(newPrivacy, selectedMinMembers);
  };

  const handleMinMembersChange = (value: string) => {
    const numValue = parseInt(value, 10);
    setSelectedMinMembers(numValue);
    updateUrl(selectedPrivacy, numValue);
  };

  const removePrivacy = (value: string) => {
    const newPrivacy = selectedPrivacy.filter((p) => p !== value);
    setSelectedPrivacy(newPrivacy);
    updateUrl(newPrivacy, selectedMinMembers);
  };

  const removeMinMembers = () => {
    setSelectedMinMembers(0);
    updateUrl(selectedPrivacy, 0);
  };

  const clearAll = () => {
    setSelectedPrivacy([]);
    setSelectedMinMembers(0);
    localStorage.removeItem(STORAGE_KEY);
    updateUrl([], 0);
  };

  const hasActiveFilters = selectedPrivacy.length > 0 || selectedMinMembers > 0;
  const activeCount = selectedPrivacy.length + (selectedMinMembers > 0 ? 1 : 0);

  // Build summary text
  const getSummaryText = () => {
    if (activeCount === 0) return "All Clubs";
    const parts: string[] = [];
    if (selectedPrivacy.length > 0) {
      if (selectedPrivacy.length <= 2) {
        parts.push(selectedPrivacy.map((p) => PRIVACY_LABELS[p]).join(", "));
      } else {
        parts.push(`${selectedPrivacy.length} privacy types`);
      }
    }
    if (selectedMinMembers > 0) {
      parts.push(`${selectedMinMembers}+ members`);
    }
    return parts.join(" · ");
  };

  const getMemberCountLabel = () => {
    const option = MEMBER_COUNT_OPTIONS.find((o) => o.value === selectedMinMembers);
    return option?.label || "Any";
  };

  return (
    <div className="space-y-0">
      {/* Filter Controls Row */}
      <div className="flex items-center gap-2 flex-wrap">
        {/* Privacy Filter Dropdown */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm" className="h-8 gap-1.5 text-xs">
              <Funnel className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">{getSummaryText()}</span>
              <span className="sm:hidden">{activeCount > 0 ? `${activeCount}` : "Filter"}</span>
              {activeCount > 0 && (
                <span className="ml-1 bg-[var(--primary)] text-[var(--primary-foreground)] text-[10px] font-medium rounded-full w-4 h-4 flex items-center justify-center">
                  {activeCount}
                </span>
              )}
              <CaretDown className="w-3 h-3 ml-0.5 opacity-50" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="w-48">
            <DropdownMenuLabel>Type</DropdownMenuLabel>
            {PRIVACY_OPTIONS.map((option) => (
              <DropdownMenuCheckboxItem
                key={option.value}
                checked={selectedPrivacy.includes(option.value)}
                onCheckedChange={() => togglePrivacy(option.value)}
              >
                {option.label}
              </DropdownMenuCheckboxItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>

        {/* Member Count Filter Dropdown */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant={selectedMinMembers > 0 ? "secondary" : "outline"}
              size="sm"
              className="h-8 gap-1.5 text-xs"
            >
              <Users className="w-3.5 h-3.5 shrink-0" />
              <span className="truncate">{getMemberCountLabel()}</span>
              <CaretDown className="w-3 h-3 ml-0.5 opacity-50 shrink-0" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="w-40">
            <DropdownMenuLabel>Min Members</DropdownMenuLabel>
            <DropdownMenuRadioGroup
              value={selectedMinMembers.toString()}
              onValueChange={handleMinMembersChange}
            >
              {MEMBER_COUNT_OPTIONS.map((option) => (
                <DropdownMenuRadioItem key={option.value} value={option.value.toString()}>
                  {option.label}
                </DropdownMenuRadioItem>
              ))}
            </DropdownMenuRadioGroup>
          </DropdownMenuContent>
        </DropdownMenu>

        {/* Clear Button */}
        {hasActiveFilters && (
          <Button
            variant="ghost"
            size="sm"
            onClick={clearAll}
            className="h-8 px-2 text-xs text-[var(--text-muted)] hover:text-[var(--text-primary)]"
          >
            <X className="w-3.5 h-3.5" />
            <span className="sr-only sm:not-sr-only sm:ml-1">Clear</span>
          </Button>
        )}
      </div>

      {/* Active Filters Display */}
      <ActiveFiltersDisplay
        filters={{ privacy: selectedPrivacy, minMembers: selectedMinMembers }}
        onRemovePrivacy={removePrivacy}
        onRemoveMinMembers={removeMinMembers}
        onClearAll={clearAll}
      />
    </div>
  );
}
