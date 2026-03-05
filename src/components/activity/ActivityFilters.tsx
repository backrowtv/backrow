"use client";

import { useSearchParams, useRouter, usePathname } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuCheckboxItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
} from "@/components/ui/dropdown-menu";
import { X, Funnel, CaretDown, Buildings, Calendar, User } from "@phosphor-icons/react/dist/ssr";
import { useState, useEffect, useLayoutEffect, useCallback } from "react";
import { MemberFilterCombobox, type MemberOption } from "./MemberFilterCombobox";
import { cn } from "@/lib/utils";
import { BrandText } from "@/components/ui/brand-text";
import {
  parseActivityFiltersFromURL,
  serializeActivityFiltersToURL,
  type ActivityFiltersState,
  type ActivityFilterCategory,
  type ClubActivitySubFilter,
  type MemberActivitySubFilter,
  type DateRangePreset,
  CATEGORY_LABELS,
  CLUB_SUBFILTER_LABELS,
  MEMBER_SUBFILTER_LABELS,
  CLUB_SUB_FILTERS,
  MEMBER_SUB_FILTERS,
  DATE_RANGE_PRESETS,
  getSubFilterLabel,
  countActiveFilters,
} from "@/lib/activity/activity-filters";

const STORAGE_KEY = "activityFilters";

interface ActivityFiltersProps {
  clubs?: Array<{ id: string; name: string }>;
  /** Whether current user is admin of any currently selected club */
  isAdminOfSelectedClub?: boolean;
  /** All members of the selected clubs (for member activity filter) */
  clubMembers?: MemberOption[];
  /** Admin members only of the selected clubs (for club activity filter) */
  clubAdmins?: MemberOption[];
}

/**
 * Displays active filters as removable chips/badges
 */
interface ActiveFiltersDisplayProps {
  filters: ActivityFiltersState;
  clubs: Array<{ id: string; name: string }>;
  clubMembers: MemberOption[];
  onRemoveCategory: () => void;
  onRemoveSubFilter: (filter: string) => void;
  onRemoveClub: (clubId: string) => void;
  onRemoveUser: () => void;
  onRemoveDateRange: () => void;
  onClearAll: () => void;
}

function ActiveFiltersDisplay({
  filters,
  clubs,
  clubMembers,
  onRemoveCategory,
  onRemoveSubFilter,
  onRemoveClub,
  onRemoveUser,
  onRemoveDateRange,
  onClearAll,
}: ActiveFiltersDisplayProps) {
  const totalFilters = countActiveFilters(filters);

  if (totalFilters === 0) return null;

  const selectedClubNames = filters.clubIds
    .map((id) => clubs.find((c) => c.id === id)?.name)
    .filter(Boolean);

  const selectedUserName = filters.userId
    ? clubMembers.find((m) => m.id === filters.userId)?.display_name || "Unknown"
    : null;

  return (
    <div className="flex flex-wrap items-center gap-2 py-2">
      <span className="text-xs text-[var(--text-muted)]">Filtering by:</span>

      {/* Category chip */}
      {filters.category && (
        <button
          onClick={onRemoveCategory}
          className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium rounded-full bg-[var(--surface-3)] text-[var(--text-primary)] font-semibold hover:bg-[var(--surface-4)] transition-colors group"
        >
          {filters.category === "club_activity" ? "🎭" : "👤"} {CATEGORY_LABELS[filters.category]}
          <X className="w-3 h-3 opacity-60 group-hover:opacity-100" />
        </button>
      )}

      {/* Sub-filter chips */}
      {filters.subFilters.map((filter) => (
        <button
          key={filter}
          onClick={() => onRemoveSubFilter(filter)}
          className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium rounded-full bg-[var(--surface-2)] text-[var(--text-secondary)] hover:bg-[var(--surface-3)] transition-colors group"
        >
          {getSubFilterLabel(filter)}
          <X className="w-3 h-3 opacity-60 group-hover:opacity-100" />
        </button>
      ))}

      {/* Club filter chips */}
      {selectedClubNames.map((name, idx) => (
        <button
          key={filters.clubIds[idx]}
          onClick={() => onRemoveClub(filters.clubIds[idx])}
          className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium rounded-full bg-[var(--accent)] text-white hover:bg-[var(--accent)]/80 transition-colors group"
        >
          <Buildings className="w-3 h-3" />
          <BrandText>{name}</BrandText>
          <X className="w-3 h-3 opacity-60 group-hover:opacity-100" />
        </button>
      ))}

      {/* Date range chip */}
      {filters.dateRange !== "all_time" && (
        <button
          onClick={onRemoveDateRange}
          className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium rounded-full bg-[var(--warning)] text-white hover:bg-[var(--warning)]/80 transition-colors group"
        >
          <Calendar className="w-3 h-3" />
          {DATE_RANGE_PRESETS[filters.dateRange].label}
          <X className="w-3 h-3 opacity-60 group-hover:opacity-100" />
        </button>
      )}

      {/* User chip */}
      {selectedUserName && (
        <button
          onClick={onRemoveUser}
          className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium rounded-full bg-[var(--info)] text-white hover:bg-[var(--info)]/80 transition-colors group"
        >
          <User className="w-3 h-3" />
          {selectedUserName}
          <X className="w-3 h-3 opacity-60 group-hover:opacity-100" />
        </button>
      )}

      {/* Clear all button - only show if multiple filters */}
      {totalFilters > 1 && (
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

export function ActivityFilters({
  clubs = [],
  isAdminOfSelectedClub = false,
  clubMembers = [],
  clubAdmins = [],
}: ActivityFiltersProps) {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();

  // Parse filters from URL using the helper
  const urlSearchParams = new URLSearchParams(searchParams.toString());
  const initialFilters = parseActivityFiltersFromURL(urlSearchParams);

  const [selectedCategory, setSelectedCategory] = useState<ActivityFilterCategory | null>(
    initialFilters.category
  );
  const [selectedSubFilters, setSelectedSubFilters] = useState<string[]>(initialFilters.subFilters);
  const [selectedClubIds, setSelectedClubIds] = useState<string[]>(initialFilters.clubIds);
  const [selectedUser, setSelectedUser] = useState<string | null>(initialFilters.userId);
  const [selectedDateRange, setSelectedDateRange] = useState<DateRangePreset>(
    initialFilters.dateRange
  );

  // Animation state for member filter
  const [showMemberFilter, setShowMemberFilter] = useState(false);
  const [memberFilterVisible, setMemberFilterVisible] = useState(false);

  // Determine if member filter should be shown
  const shouldShowMemberFilter = selectedClubIds.length > 0 && isAdminOfSelectedClub;

  // Handle member filter animation
  useLayoutEffect(() => {
    if (shouldShowMemberFilter) {
      setMemberFilterVisible(true);
      requestAnimationFrame(() => {
        setShowMemberFilter(true);
      });
    } else {
      setShowMemberFilter(false);
      const timer = setTimeout(() => setMemberFilterVisible(false), 350);
      return () => clearTimeout(timer);
    }
  }, [shouldShowMemberFilter]);

  // Track if filters have changed from initial URL values
  const [hasFilterChanged, setHasFilterChanged] = useState(false);
  const [initialUrlValues] = useState({
    ...initialFilters,
    page: searchParams.get("page"),
    size: searchParams.get("size"),
  });

  // Build current filter state
  const buildFilterState = useCallback(
    (): ActivityFiltersState => ({
      category: selectedCategory,
      subFilters: selectedSubFilters,
      clubIds: selectedClubIds,
      userId: selectedUser,
      dateRange: selectedDateRange,
    }),
    [selectedCategory, selectedSubFilters, selectedClubIds, selectedUser, selectedDateRange]
  );

  // Update URL when filters change
  const updateUrl = useCallback(
    (resetPagination: boolean = true) => {
      const filters = buildFilterState();
      const params = serializeActivityFiltersToURL(filters);

      // Preserve page/size only if not resetting pagination
      if (!resetPagination) {
        if (initialUrlValues.page) params.set("page", initialUrlValues.page);
        if (initialUrlValues.size) params.set("size", initialUrlValues.size);
      }

      const queryString = params.toString();
      const newUrl = queryString ? `${pathname}?${queryString}` : pathname;

      router.replace(newUrl, { scroll: false });

      // Save to localStorage (excluding user filter for privacy)
      const storageData = {
        category: selectedCategory,
        subFilters: selectedSubFilters,
        clubIds: selectedClubIds,
        dateRange: selectedDateRange,
      };
      if (countActiveFilters({ ...storageData, userId: null }) > 0) {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(storageData));
      } else {
        localStorage.removeItem(STORAGE_KEY);
      }
    },
    [
      buildFilterState,
      initialUrlValues,
      pathname,
      router,
      selectedCategory,
      selectedSubFilters,
      selectedClubIds,
      selectedDateRange,
    ]
  );

  // Update URL when any filter changes
  useEffect(() => {
    // Check if current values match initial state
    const currentState = buildFilterState();
    const matchesInitial =
      currentState.category === initialUrlValues.category &&
      currentState.subFilters.join(",") === initialUrlValues.subFilters.join(",") &&
      currentState.clubIds.join(",") === initialUrlValues.clubIds.join(",") &&
      currentState.userId === initialUrlValues.userId &&
      currentState.dateRange === initialUrlValues.dateRange;

    // Don't update URL if filters haven't changed from initial state
    if (matchesInitial && !hasFilterChanged) return;

    updateUrl(hasFilterChanged);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- Deps are the filter values that should trigger URL updates; memoized functions are stable
  }, [selectedCategory, selectedSubFilters, selectedClubIds, selectedUser, selectedDateRange]);

  // Load saved preferences on mount
  useEffect(() => {
    const hasURLFilters =
      searchParams.get("category") ||
      searchParams.get("sub") ||
      searchParams.get("clubs") ||
      searchParams.get("club") ||
      searchParams.get("date");

    if (!hasURLFilters) {
      try {
        const savedFilters = localStorage.getItem(STORAGE_KEY);
        if (savedFilters) {
          const parsed = JSON.parse(savedFilters);
          if (parsed.category) setSelectedCategory(parsed.category);
          if (parsed.subFilters?.length) setSelectedSubFilters(parsed.subFilters);
          if (parsed.clubIds?.length) setSelectedClubIds(parsed.clubIds);
          if (parsed.dateRange) setSelectedDateRange(parsed.dateRange);
        }
      } catch {
        // Ignore parse errors
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- Mount-only: restore saved filters from localStorage
  }, []);

  // ============================================
  // FILTER HANDLERS
  // ============================================

  const selectCategory = (category: ActivityFilterCategory | null) => {
    setHasFilterChanged(true);
    setSelectedCategory(category);
    // Clear sub-filters and user when changing category
    setSelectedSubFilters([]);
    setSelectedUser(null);
  };

  const toggleSubFilter = (filter: string) => {
    setHasFilterChanged(true);
    setSelectedSubFilters((prev) =>
      prev.includes(filter) ? prev.filter((f) => f !== filter) : [...prev, filter]
    );
  };

  const toggleClub = (clubId: string) => {
    setHasFilterChanged(true);
    setSelectedClubIds((prev) =>
      prev.includes(clubId) ? prev.filter((id) => id !== clubId) : [...prev, clubId]
    );
    // Clear user filter when clubs change
    setSelectedUser(null);
  };

  const handleDateRangeChange = (value: string) => {
    setHasFilterChanged(true);
    setSelectedDateRange(value as DateRangePreset);
  };

  const handleUserChange = (userId: string | null) => {
    setHasFilterChanged(true);
    setSelectedUser(userId);
  };

  const clearFilters = () => {
    setHasFilterChanged(true);
    setSelectedCategory(null);
    setSelectedSubFilters([]);
    setSelectedClubIds([]);
    setSelectedUser(null);
    setSelectedDateRange("all_time");
    localStorage.removeItem(STORAGE_KEY);
  };

  // Remove handlers for chips
  const removeCategory = () => {
    setHasFilterChanged(true);
    setSelectedCategory(null);
    setSelectedSubFilters([]);
    setSelectedUser(null);
  };

  const removeSubFilter = (filter: string) => {
    setHasFilterChanged(true);
    setSelectedSubFilters((prev) => prev.filter((f) => f !== filter));
  };

  const removeClub = (clubId: string) => {
    setHasFilterChanged(true);
    setSelectedClubIds((prev) => prev.filter((id) => id !== clubId));
    setSelectedUser(null);
  };

  const removeUser = () => {
    setHasFilterChanged(true);
    setSelectedUser(null);
  };

  const removeDateRange = () => {
    setHasFilterChanged(true);
    setSelectedDateRange("all_time");
  };

  // ============================================
  // UI STATE
  // ============================================

  const currentFilters = buildFilterState();
  const activeCount = countActiveFilters(currentFilters);
  const hasActiveFilters = activeCount > 0;

  // Get sub-filters based on category
  const currentSubFilters =
    selectedCategory === "club_activity"
      ? CLUB_SUB_FILTERS
      : selectedCategory === "member_activity"
        ? MEMBER_SUB_FILTERS
        : [];

  // Build summary text for main filter button
  const getSummaryText = () => {
    if (!selectedCategory && selectedClubIds.length === 0) return "All Activity";
    const parts: string[] = [];
    if (selectedCategory) {
      let label = CATEGORY_LABELS[selectedCategory];
      if (selectedSubFilters.length > 0) {
        label += ` (${selectedSubFilters.length})`;
      }
      parts.push(label);
    }
    if (selectedClubIds.length === 1) {
      const clubName = clubs.find((c) => c.id === selectedClubIds[0])?.name;
      if (clubName) parts.push(clubName);
    } else if (selectedClubIds.length > 1) {
      parts.push(`${selectedClubIds.length} clubs`);
    }
    return parts.join(" · ");
  };

  // Get club dropdown label
  const getClubDropdownLabel = () => {
    if (selectedClubIds.length === 0) return "All Clubs";
    if (selectedClubIds.length === 1) {
      return clubs.find((c) => c.id === selectedClubIds[0])?.name || "All Clubs";
    }
    return `${selectedClubIds.length} clubs`;
  };

  return (
    <div className="space-y-0">
      {/* Filter Controls Row */}
      <div className="flex items-center gap-2 flex-wrap">
        {/* Main Category Filter */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm" className="h-8 gap-1.5 text-xs">
              <Funnel className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">{getSummaryText()}</span>
              <span className="sm:hidden">{hasActiveFilters ? "Filtered" : "Filter"}</span>
              {activeCount > 0 && (
                <span className="ml-1 bg-[var(--primary)] text-[var(--primary-foreground)] text-[10px] font-medium rounded-full w-4 h-4 flex items-center justify-center">
                  {activeCount}
                </span>
              )}
              <CaretDown className="w-3 h-3 ml-0.5 opacity-50" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="w-56">
            <DropdownMenuLabel>Activity Category</DropdownMenuLabel>

            {/* All Activity option */}
            <DropdownMenuCheckboxItem
              checked={selectedCategory === null}
              onCheckedChange={() => selectCategory(null)}
            >
              All Activity
            </DropdownMenuCheckboxItem>

            <DropdownMenuSeparator />

            {/* Club Activity */}
            <DropdownMenuCheckboxItem
              checked={selectedCategory === "club_activity"}
              onCheckedChange={() =>
                selectCategory(selectedCategory === "club_activity" ? null : "club_activity")
              }
            >
              🎭 {CATEGORY_LABELS.club_activity}
            </DropdownMenuCheckboxItem>

            {/* Member Activity */}
            <DropdownMenuCheckboxItem
              checked={selectedCategory === "member_activity"}
              onCheckedChange={() =>
                selectCategory(selectedCategory === "member_activity" ? null : "member_activity")
              }
            >
              👤 {CATEGORY_LABELS.member_activity}
            </DropdownMenuCheckboxItem>

            {/* Sub-filters (only show when a category is selected) */}
            {selectedCategory && currentSubFilters.length > 0 && (
              <>
                <DropdownMenuSeparator />
                <DropdownMenuLabel>
                  {selectedCategory === "club_activity"
                    ? "Club Activity Types"
                    : "My Activity Types"}
                </DropdownMenuLabel>
                {currentSubFilters.map((filter) => (
                  <DropdownMenuCheckboxItem
                    key={filter}
                    checked={selectedSubFilters.includes(filter)}
                    onCheckedChange={() => toggleSubFilter(filter)}
                    className="pl-6"
                  >
                    {selectedCategory === "club_activity"
                      ? CLUB_SUBFILTER_LABELS[filter as ClubActivitySubFilter]
                      : MEMBER_SUBFILTER_LABELS[filter as MemberActivitySubFilter]}
                  </DropdownMenuCheckboxItem>
                ))}
              </>
            )}
          </DropdownMenuContent>
        </DropdownMenu>

        {/* Club Multi-Select Dropdown */}
        {clubs.length > 0 && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant={selectedClubIds.length > 0 ? "secondary" : "outline"}
                size="sm"
                className="h-8 gap-1.5 text-xs max-w-[160px]"
              >
                <Buildings className="w-3.5 h-3.5 shrink-0" />
                <span className="truncate">{getClubDropdownLabel()}</span>
                <CaretDown className="w-3 h-3 ml-0.5 opacity-50 shrink-0" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-48 max-h-64 overflow-y-auto">
              <DropdownMenuLabel>Filter by Club</DropdownMenuLabel>
              <DropdownMenuCheckboxItem
                checked={selectedClubIds.length === 0}
                onCheckedChange={() => {
                  setHasFilterChanged(true);
                  setSelectedClubIds([]);
                  setSelectedUser(null);
                }}
              >
                All Clubs
              </DropdownMenuCheckboxItem>
              <DropdownMenuSeparator />
              {clubs.map((club) => (
                <DropdownMenuCheckboxItem
                  key={club.id}
                  checked={selectedClubIds.includes(club.id)}
                  onCheckedChange={() => toggleClub(club.id)}
                >
                  <span className="truncate">
                    <BrandText>{club.name}</BrandText>
                  </span>
                </DropdownMenuCheckboxItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        )}

        {/* Date Range Dropdown */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant={selectedDateRange !== "all_time" ? "secondary" : "outline"}
              size="sm"
              className="h-8 gap-1.5 text-xs"
            >
              <Calendar className="w-3.5 h-3.5 shrink-0" />
              <span className="truncate">{DATE_RANGE_PRESETS[selectedDateRange].label}</span>
              <CaretDown className="w-3 h-3 ml-0.5 opacity-50 shrink-0" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="w-40">
            <DropdownMenuLabel>Date Range</DropdownMenuLabel>
            <DropdownMenuRadioGroup value={selectedDateRange} onValueChange={handleDateRangeChange}>
              {(Object.keys(DATE_RANGE_PRESETS) as DateRangePreset[]).map((key) => (
                <DropdownMenuRadioItem key={key} value={key}>
                  {DATE_RANGE_PRESETS[key].label}
                </DropdownMenuRadioItem>
              ))}
            </DropdownMenuRadioGroup>
          </DropdownMenuContent>
        </DropdownMenu>

        {/* Member Filter (only shows for admins with clubs selected) */}
        {memberFilterVisible && (
          <div
            className={cn(
              "transition-all duration-300 ease-[cubic-bezier(0.4,0,0.2,1)]",
              showMemberFilter
                ? "opacity-100 translate-x-0 scale-100"
                : "opacity-0 -translate-x-3 scale-90 pointer-events-none"
            )}
          >
            <MemberFilterCombobox
              members={
                // For club activity, show only admins; for member activity or all, show all members
                selectedCategory === "club_activity" ? clubAdmins : clubMembers
              }
              selectedUserId={selectedUser}
              onSelect={handleUserChange}
              placeholder={
                selectedCategory === "club_activity" ? "Filter by admin" : "Filter by member"
              }
              emptyMessage={
                selectedCategory === "club_activity" ? "No admins found" : "No members found"
              }
            />
          </div>
        )}

        {/* Clear Button */}
        {hasActiveFilters && (
          <Button
            variant="ghost"
            size="sm"
            onClick={clearFilters}
            className="h-8 px-2 text-xs text-[var(--text-muted)] hover:text-[var(--text-primary)]"
          >
            <X className="w-3.5 h-3.5" />
            <span className="sr-only sm:not-sr-only sm:ml-1">Clear</span>
          </Button>
        )}
      </div>

      {/* Active Filters Display (chips) */}
      <ActiveFiltersDisplay
        filters={currentFilters}
        clubs={clubs}
        clubMembers={clubMembers}
        onRemoveCategory={removeCategory}
        onRemoveSubFilter={removeSubFilter}
        onRemoveClub={removeClub}
        onRemoveUser={removeUser}
        onRemoveDateRange={removeDateRange}
        onClearAll={clearFilters}
      />
    </div>
  );
}

// Re-export types and constants from activity-filters for backward compatibility
export {
  type ActivityFilterCategory,
  type ClubActivitySubFilter,
  type MemberActivitySubFilter,
  type DateRangePreset,
  CATEGORY_LABELS,
  CLUB_SUBFILTER_LABELS,
  MEMBER_SUBFILTER_LABELS,
} from "@/lib/activity/activity-filters";
